import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllEventsSorted } from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AIChatInterface from '../components/AIChatInterface';
import aiPlannerService from '../services/aiPlannerService';
import publicTransportService from '../services/publicTransportService';

// Helper function to get week dates
function getWeekDates(startDate = new Date()) {
  const start = new Date(startDate);
  const day = start.getDay();
  const diff = start.getDate() - day; // First day is Sunday
  const sunday = new Date(start.setDate(diff));
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    week.push(date);
  }
  return week;
}

// Helper function to format date
function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Helper function to get local date key
function getLocalDateKey(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Real-world planning parameters based on your situation
const planningConfig = {
  // Partner's fixed schedule
  partner: {
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workHours: { start: '07:30', end: '15:30' },
    location: 'Kfar Saba'
  },
  
  // Travel times (minutes)
  travelTimes: {
    normal: {
      'Kfar Saba': { 'Beit Dagan': 30, 'Rishon Lezion': 35, 'Nir Tzvi': 35 },
      'Beit Dagan': { 'Kfar Saba': 30, 'Rishon Lezion': 5, 'Nir Tzvi': 15 },
      'Rishon Lezion': { 'Kfar Saba': 35, 'Beit Dagan': 5, 'Nir Tzvi': 15 },
      'Nir Tzvi': { 'Kfar Saba': 35, 'Beit Dagan': 15, 'Rishon Lezion': 15 }
    },
    rush: {
      'Kfar Saba': { 'Beit Dagan': 45, 'Rishon Lezion': 50, 'Nir Tzvi': 45 },
      'Beit Dagan': { 'Kfar Saba': 45, 'Rishon Lezion': 5, 'Nir Tzvi': 15 },
      'Rishon Lezion': { 'Kfar Saba': 50, 'Beit Dagan': 5, 'Nir Tzvi': 15 },
      'Nir Tzvi': { 'Kfar Saba': 45, 'Beit Dagan': 15, 'Rishon Lezion': 15 }
    }
  },
  
  // Rush hour periods
  rushHours: {
    morning: { start: '07:30', end: '10:00' },
    evening: { start: '15:00', end: '19:00' }
  },
  
  // Public transport options
  publicTransport: {
    trainStations: {
      'Kfar Saba': ['Kfar Saba', 'Hod Hasharon'],
      'Beit Dagan': ['Kfar Chabad'], // 15 min drive
      'Rishon Lezion': ['Kfar Chabad'] // 15 min drive
    },
    trainTravelTime: 45, // Kfar Saba <-> Kfar Chabad
    stationDriveTime: 15 // Drive to/from Kfar Chabad
  },
  
  // Home locations
  locations: {
    yourHome: 'Beit Dagan',
    partnerHome: 'Kfar Saba',
    yourWork: 'Rishon Lezion',
    partnerWork: 'Kfar Saba',
    tennis: 'Nir Tzvi'
  }
};

// Helper function to get real travel time between locations
function getTravelTime(from, to, departureTime) {
  if (!from || !to || from === to) return 0;
  
  // Normalize location names to match our config
  const normalizeLocation = (loc) => {
    if (loc.toLowerCase().includes('kfar saba')) return 'Kfar Saba';
    if (loc.toLowerCase().includes('beit dagan')) return 'Beit Dagan';
    if (loc.toLowerCase().includes('rishon')) return 'Rishon Lezion';
    if (loc.toLowerCase().includes('nir tzvi') || loc.toLowerCase().includes('tennis')) return 'Nir Tzvi';
    return loc;
  };
  
  const fromNorm = normalizeLocation(from);
  const toNorm = normalizeLocation(to);
  
  // Check if departure is during rush hour
  const hour = new Date(departureTime).getHours();
  const minute = new Date(departureTime).getMinutes();
  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  const isRushHour = (timeString >= planningConfig.rushHours.morning.start && timeString <= planningConfig.rushHours.morning.end) ||
                    (timeString >= planningConfig.rushHours.evening.start && timeString <= planningConfig.rushHours.evening.end);
  
  // Get travel time from our real data
  const travelMatrix = isRushHour ? planningConfig.travelTimes.rush : planningConfig.travelTimes.normal;
  
  if (travelMatrix[fromNorm] && travelMatrix[fromNorm][toNorm] !== undefined) {
    return travelMatrix[fromNorm][toNorm];
  }
  
  return 30; // Default fallback
}

// Helper function to determine if public transport is better
function shouldUsePublicTransport(from, to, departureTime) {
  const fromNorm = from.toLowerCase().includes('kfar saba') ? 'Kfar Saba' : 
                   (from.toLowerCase().includes('beit dagan') ? 'Beit Dagan' : 'Rishon Lezion');
  const toNorm = to.toLowerCase().includes('kfar saba') ? 'Kfar Saba' : 
                 (to.toLowerCase().includes('beit dagan') ? 'Beit Dagan' : 'Rishon Lezion');
  
  // Only suggest train for Kfar Saba <-> Beit Dagan/Rishon routes
  if (!((fromNorm === 'Kfar Saba' && (toNorm === 'Beit Dagan' || toNorm === 'Rishon Lezion')) ||
        (toNorm === 'Kfar Saba' && (fromNorm === 'Beit Dagan' || fromNorm === 'Rishon Lezion')))) {
    return { recommended: false, reason: 'No convenient train route' };
  }
  
  // Check if it's rush hour
  const hour = new Date(departureTime).getHours();
  const minute = new Date(departureTime).getMinutes();
  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  const isRushHour = (timeString >= planningConfig.rushHours.morning.start && timeString <= planningConfig.rushHours.morning.end) ||
                    (timeString >= planningConfig.rushHours.evening.start && timeString <= planningConfig.rushHours.evening.end);
  
  if (isRushHour) {
    const carTime = getTravelTime(from, to, departureTime);
    const trainTime = planningConfig.publicTransport.trainTravelTime + (2 * planningConfig.publicTransport.stationDriveTime);
    
    if (trainTime < carTime) {
      return { 
        recommended: true, 
        reason: `Train faster during rush hour (${trainTime}min vs ${carTime}min by car)`,
        trainTime,
        carTime
      };
    }
  }
  
  return { recommended: false, reason: 'Car is faster/more convenient' };
}

// Helper function to find optimal sleep location based on real logic
function findOptimalSleepLocation(todayEvents, tomorrowEvents, dayOfWeek) {
  const { yourHome, partnerHome } = planningConfig.locations;
  
  // If no events tomorrow, default to your home
  if (!tomorrowEvents || tomorrowEvents.length === 0) {
    return { location: yourHome, reason: 'No events tomorrow, stay home' };
  }
  
  const firstEventTomorrow = tomorrowEvents[0];
  const lastEventToday = todayEvents.length > 0 ? todayEvents[todayEvents.length - 1] : null;
  
  // Calculate morning travel times from both locations
  const travelFromYourHome = getTravelTime(yourHome, firstEventTomorrow.location, new Date(firstEventTomorrow.date));
  const travelFromPartnerHome = getTravelTime(partnerHome, firstEventTomorrow.location, new Date(firstEventTomorrow.date));
  
  // Decision logic based on your real behavior:
  
  // 1. If first event is near your home (Beit Dagan/Rishon/Tennis), sleep at home
  const eventLocation = firstEventTomorrow.location?.toLowerCase() || '';
  if (eventLocation.includes('beit dagan') || eventLocation.includes('rishon') || 
      eventLocation.includes('tennis') || eventLocation.includes('nir tzvi')) {
    return { 
      location: yourHome, 
      reason: `First event tomorrow is near your home (${Math.round(travelFromYourHome)}min drive)` 
    };
  }
  
  // 2. If you have early work (8 AM shift) and it's significantly closer from partner's
  const firstEventTime = new Date(firstEventTomorrow.date).getHours();
  if (firstEventTime <= 8 && travelFromPartnerHome < travelFromYourHome - 10) {
    return { 
      location: partnerHome, 
      reason: `Early morning shift - saves ${travelFromYourHome - travelFromPartnerHome}min from partner's place` 
    };
  }
  
  // 3. If last event today was near Kfar Saba and you have early events tomorrow
  if (lastEventToday) {
    const lastEventLocation = lastEventToday.location?.toLowerCase() || '';
    const lastEventEndTime = new Date(lastEventToday.endDate || lastEventToday.date).getHours();
    
    if (lastEventLocation.includes('kfar saba') && lastEventEndTime >= 18) {
      return { 
        location: partnerHome, 
        reason: 'Last event was in Kfar Saba area, convenient to stay' 
      };
    }
  }
  
  // 4. If tomorrow is a rest day or light schedule, prefer being together
  if (tomorrowEvents.length <= 1 && firstEventTime >= 10) {
    return { 
      location: partnerHome, 
      reason: 'Light schedule tomorrow, good time to be together' 
    };
  }
  
  // 5. Default: minimize total driving (today's end + tomorrow's start)
  let totalDrivingFromHome = travelFromYourHome;
  let totalDrivingFromPartner = travelFromPartnerHome;
  
  // Add driving to get to sleep location from today's last event
  if (lastEventToday) {
    totalDrivingFromHome += getTravelTime(lastEventToday.location, yourHome, new Date(lastEventToday.endDate || lastEventToday.date));
    totalDrivingFromPartner += getTravelTime(lastEventToday.location, partnerHome, new Date(lastEventToday.endDate || lastEventToday.date));
  }
  
  if (totalDrivingFromPartner < totalDrivingFromHome - 15) {
    return { 
      location: partnerHome, 
      reason: `Minimizes total driving (${Math.round(totalDrivingFromPartner)}min vs ${Math.round(totalDrivingFromHome)}min)` 
    };
  }
  
  return { 
    location: yourHome, 
    reason: `Most convenient overall (${Math.round(totalDrivingFromHome)}min total travel)` 
  };
}

const PREFERENCES_KEY = 'planner_preferences';

export default function WeekPlannerScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weekPlan, setWeekPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({});
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const insets = useSafeAreaInsets();

  const weekDates = useMemo(() => getWeekDates(currentWeek), [currentWeek]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped = {};
    weekDates.forEach(date => {
      const dateKey = getLocalDateKey(date);
      grouped[dateKey] = (events || []).filter(event => {
        const eventDate = getLocalDateKey(event.date);
        return eventDate === dateKey;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
    });
    return grouped;
  }, [events, weekDates]);

  // Load preferences and initialize AI
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences(parsed);
          setAiEnabled(parsed.aiEnabled || false);
          
          // Initialize AI service if enabled
          if (parsed.aiEnabled) {
            await aiPlannerService.initialize();
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Load events
  useEffect(() => {
    const loadEvents = () => {
      setLoading(true);
      
      getAllEventsSorted(
        (allEvents) => {
          console.log('All events loaded:', allEvents?.length || 0);
          console.log('Sample event:', allEvents?.[0]);
          
          // Filter events for current week
          const weekStart = new Date(weekDates[0]);
          const weekEnd = new Date(weekDates[6]);
          weekEnd.setHours(23, 59, 59, 999);
          
          console.log('Week range:', weekStart.toISOString(), 'to', weekEnd.toISOString());
          
          const weekEvents = (allEvents || []).filter(event => {
            const eventDate = new Date(event.date);
            const isInWeek = eventDate >= weekStart && eventDate <= weekEnd;
            console.log(`Event "${event.title}" on ${event.date} -> ${eventDate.toISOString()} -> ${isInWeek ? 'IN' : 'OUT'}`);
            return isInWeek;
          });
          
          console.log('Filtered week events:', weekEvents.length);
          setEvents(weekEvents);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading events:', error);
          setEvents([]); // Set empty array on error
          Alert.alert('Error', 'Failed to load events');
          setLoading(false);
        }
      );
    };

    loadEvents();
  }, [weekDates]);

  // Enhanced intelligent planning algorithm with AI and public transport
  const generateWeekPlan = async () => {
    console.log('Generating intelligent week plan...');
    
    const plan = {
      weekOf: getLocalDateKey(weekDates[0]),
      dailyPlans: [],
      totalDriving: 0,
      suggestions: [],
      optimizations: [],
      publicTransportOptions: [],
      aiGenerated: false
    };

    // Process each day
    weekDates.forEach((date, dayIndex) => {
      const dateKey = getLocalDateKey(date);
      const dayEvents = eventsByDay[dateKey] || [];
      
      console.log(`Planning ${formatDate(date)}: ${dayEvents.length} events`);
      
      // Calculate travel times between consecutive events
      let dailyDriving = 0;
      const travelTimes = [];
      const rushHourConflicts = [];
      
      for (let i = 0; i < dayEvents.length - 1; i++) {
        const currentEvent = dayEvents[i];
        const nextEvent = dayEvents[i + 1];
        
        if (currentEvent.location && nextEvent.location) {
          // Calculate departure time (end of current event + buffer)
          const currentEndTime = new Date(currentEvent.endDate || currentEvent.date);
          const departureTime = new Date(currentEndTime.getTime() + (15 * 60000)); // 15 min buffer
          
          // Get real travel time based on your locations
          const estimatedTime = getTravelTime(
            currentEvent.location,
            nextEvent.location,
            departureTime
          );
          
          dailyDriving += estimatedTime;
          
          // Check for rush hour conflicts
          const isRushHour = estimatedTime > 30; // If rush multiplier applied
          if (isRushHour) {
            rushHourConflicts.push({
              from: currentEvent.title,
              to: nextEvent.title,
              departure: departureTime
            });
          }

          // Get public transport options
          const transportOptions = publicTransportService.getTransportRecommendation(
            currentEvent.location,
            nextEvent.location,
            departureTime,
            preferences
          );

          travelTimes.push({
            from: currentEvent.title,
            to: nextEvent.title,
            fromLocation: currentEvent.location,
            toLocation: nextEvent.location,
            duration: estimatedTime,
            departure: departureTime,
            isRushHour,
            suggestion: isRushHour ? 'Consider leaving earlier to avoid rush hour' : null,
            publicTransport: transportOptions
          });

          // Add to plan's public transport options if available
          if (transportOptions.primary && transportOptions.primary[1]?.available) {
            plan.publicTransportOptions.push({
              from: currentEvent.title,
              to: nextEvent.title,
              recommendation: transportOptions
            });
          }
        }
      }

      // Find optimal sleep location for tonight
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = getLocalDateKey(tomorrow);
      const tomorrowEvents = eventsByDay[tomorrowKey] || [];
      
      const sleepOptimization = findOptimalSleepLocation(dayEvents, tomorrowEvents, formatDate(date).toLowerCase());
      
      // Analyze day's schedule
      const dayAnalysis = {
        isBusy: dayEvents.length > 3,
        isLongDrivingDay: dailyDriving > 180, // More than 3 hours of driving
        hasRushHourTravel: rushHourConflicts.length > 0,
        hasLongDrives: travelTimes.some(t => t.duration > 60), // Drives longer than 1 hour
        totalEventTime: dayEvents.reduce((total, event) => {
          const start = new Date(event.date);
          const end = new Date(event.endDate || event.date);
          return total + (end - start) / (1000 * 60); // minutes
        }, 0)
      };

      plan.dailyPlans.push({
        date: dateKey,
        dayName: formatDate(date),
        events: dayEvents,
        travelTimes,
        dailyDriving,
        sleepLocation: sleepOptimization.location,
        sleepReason: sleepOptimization.reason,
        rushHourImpact: rushHourConflicts.length > 0 ? 'high' : 'low',
        rushHourConflicts,
        analysis: dayAnalysis,
        recommendations: generateDayRecommendations(dayEvents, travelTimes, dayAnalysis, sleepOptimization)
      });

      plan.totalDriving += dailyDriving;
    });

    // Generate week-level suggestions
    plan.suggestions = generateWeekSuggestions(plan);
    
    // If AI is enabled, enhance the plan with AI recommendations
    if (aiEnabled && aiPlannerService.isInitialized()) {
      try {
        console.log('Enhancing plan with AI...');
        const aiResponse = await aiPlannerService.generateWeekPlan(plan, preferences);
        
        if (aiResponse.success) {
          plan.aiGenerated = true;
          plan.aiRecommendations = aiResponse.message;
          plan.aiUsage = aiResponse.usage;
          
          // Show AI chat interface with the generated plan
          setWeekPlan(plan);
          setShowAIChat(true);
          return;
        } else {
          console.warn('AI generation failed:', aiResponse.error);
          // Fall back to standard plan
        }
      } catch (error) {
        console.error('AI enhancement failed:', error);
        // Fall back to standard plan
      }
    }
    
    console.log('Week plan generated:', plan);
    setWeekPlan(plan);
  };

  // Generate recommendations for a specific day
  const generateDayRecommendations = (dayEvents, travelTimes, analysis, sleepOptimization) => {
    const recommendations = [];
    
    // Sleep location recommendation
    const sleepLocation = sleepOptimization.location === planningConfig.locations.yourHome ? 'your place' : "partner's place";
    recommendations.push({
      type: 'suggestion',
      icon: '🛏️',
      title: `Sleep at ${sleepLocation}`,
      message: sleepOptimization.reason
    });
    
    // Public transport recommendations
    travelTimes.forEach(travel => {
      const publicTransportCheck = shouldUsePublicTransport(travel.fromLocation, travel.toLocation, travel.departure);
      if (publicTransportCheck.recommended) {
        recommendations.push({
          type: 'suggestion',
          icon: '🚂',
          title: 'Take the Train',
          message: `${travel.from} → ${travel.to}: ${publicTransportCheck.reason}`
        });
      }
    });
    
    // Rush hour warnings with specific advice
    if (analysis.hasRushHourTravel) {
      recommendations.push({
        type: 'warning',
        icon: '🚦',
        title: 'Rush Hour Travel',
        message: 'Consider leaving 15 minutes earlier or using train during peak hours'
      });
    }
    
    // Heavy driving day
    if (analysis.isLongDrivingDay) {
      recommendations.push({
        type: 'warning',
        icon: '🚗',
        title: 'Heavy Driving Day',
        message: `${Math.round(analysis.totalEventTime / 60)}h+ of driving. Consider staying overnight or grouping trips.`
      });
    }
    
    // Partner coordination opportunities
    const partnerWorkEnd = new Date();
    partnerWorkEnd.setHours(15, 30, 0); // Partner ends at 15:30
    
    const yourEventsAfter3pm = dayEvents.filter(event => {
      const eventTime = new Date(event.date);
      return eventTime.getHours() >= 15;
    });
    
    if (yourEventsAfter3pm.length > 0) {
      const firstAfternoonEvent = yourEventsAfter3pm[0];
      const eventLocation = firstAfternoonEvent.location?.toLowerCase() || '';
      
      if (eventLocation.includes('beit dagan') || eventLocation.includes('rishon') || eventLocation.includes('nir tzvi')) {
        recommendations.push({
          type: 'info',
          icon: '🚗',
          title: 'Partner Pickup Opportunity',
          message: `Partner finishes work at 15:30. Could pick her up for ${firstAfternoonEvent.title}?`
        });
      }
    }
    
    // Long day warning
    if (dayEvents.length > 0) {
      const firstEvent = dayEvents[0];
      const lastEvent = dayEvents[dayEvents.length - 1];
      const firstTime = new Date(firstEvent.date).getHours();
      const lastTime = new Date(lastEvent.endDate || lastEvent.date).getHours();
      
      if (lastTime - firstTime > 10) {
        recommendations.push({
          type: 'info',
          icon: '⏰',
          title: 'Long Day Ahead',
          message: 'Consider scheduling meal breaks and rest time between events'
        });
      }
    }
    
    return recommendations;
  };

  // Generate week-level suggestions
  const generateWeekSuggestions = (plan) => {
    const suggestions = [];
    const totalHours = Math.round(plan.totalDriving / 60 * 10) / 10;
    
    if (plan.totalDriving > 180 * 5) { // More than 15 hours of driving per week
      suggestions.push({
        type: 'warning',
        message: `High weekly driving time (${totalHours}h). Consider consolidating trips or working remotely some days.`
      });
    }
    
    // Check for clustering opportunities
    const locationFrequency = {};
    plan.dailyPlans.forEach(day => {
      day.events.forEach(event => {
        if (event.location) {
          locationFrequency[event.location] = (locationFrequency[event.location] || 0) + 1;
        }
      });
    });
    
    Object.entries(locationFrequency).forEach(([location, count]) => {
      if (count > 2) {
        suggestions.push({
          type: 'suggestion',
          message: `You have ${count} events at ${location} this week. Consider grouping them on fewer days.`
        });
      }
    });
    
    // Check for rest days
    const busyDays = plan.dailyPlans.filter(day => day.events.length > 2).length;
    if (busyDays > 5) {
      suggestions.push({
        type: 'info',
        message: 'Consider keeping at least one day lighter for rest and unexpected tasks.'
      });
    }
    
    return suggestions;
  };

  // Navigate to previous/next week
  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  const renderDayPlan = ({ item: dayPlan }) => (
    <View style={{
      backgroundColor: '#3A4750',
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#00ADB5'
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: '#EEEEEE', fontSize: 18, fontWeight: '600' }}>
          {dayPlan.dayName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons 
            name="bed" 
            size={16} 
            color="#00ADB5" 
            style={{ marginRight: 4 }}
          />
          <Text style={{ color: '#00ADB5', fontSize: 12 }}>
            Sleep: {dayPlan.sleepLocation || dayPlan.suggestedSleepLocation || 'home'}
          </Text>
        </View>
      </View>

      {/* Events */}
      {dayPlan.events.map((event, index) => (
        <View key={event.id} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#EEEEEE', fontSize: 14, fontWeight: '500' }}>
              {event.title}
            </Text>
            <Text style={{ color: '#EEEEEE', opacity: 0.7, fontSize: 12 }}>
              {new Date(event.date).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </Text>
          </View>
          {event.location && (
            <Text style={{ color: '#EEEEEE', opacity: 0.6, fontSize: 12, marginTop: 2 }}>
              📍 {event.location}
            </Text>
          )}
          
          {/* Travel time to next event */}
          {index < dayPlan.travelTimes.length && (
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginTop: 4,
              paddingLeft: 12,
              borderLeftWidth: 2,
              borderLeftColor: '#00ADB5'
            }}>
              <MaterialCommunityIcons name="car" size={14} color="#00ADB5" />
              <Text style={{ color: '#00ADB5', fontSize: 12, marginLeft: 4 }}>
                {dayPlan.travelTimes[index].duration} min drive
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* Daily summary */}
      {dayPlan.dailyDriving > 0 && (
        <View style={{ 
          marginTop: 8, 
          paddingTop: 8, 
          borderTopWidth: 1, 
          borderTopColor: '#EEEEEE',
          opacity: 0.3,
          flexDirection: 'row',
          justifyContent: 'space-between'
        }}>
          <Text style={{ color: '#EEEEEE', fontSize: 12 }}>
            Total driving: {dayPlan.dailyDriving} min
          </Text>
          {dayPlan.rushHourImpact === 'high' && (
            <Text style={{ color: '#FF6B6B', fontSize: 12 }}>
              ⚠️ Rush hour impact
            </Text>
          )}
        </View>
      )}

      {dayPlan.events.length === 0 && (
        <Text style={{ color: '#EEEEEE', opacity: 0.5, fontStyle: 'italic', textAlign: 'center' }}>
          No events scheduled
        </Text>
      )}

      {/* Day Recommendations */}
      {dayPlan.recommendations && dayPlan.recommendations.length > 0 && (
        <View style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#555' }}>
          {dayPlan.recommendations.map((rec, index) => (
            <View key={index} style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: 6,
              backgroundColor: rec.type === 'warning' ? '#FF6B6B20' : rec.type === 'suggestion' ? '#00ADB520' : '#EEEEEE20',
              padding: 8,
              borderRadius: 6
            }}>
              <Text style={{ fontSize: 14, marginRight: 8 }}>{rec.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#EEEEEE', fontSize: 12, fontWeight: '500' }}>
                  {rec.title}
                </Text>
                <Text style={{ color: '#EEEEEE', opacity: 0.8, fontSize: 11 }}>
                  {rec.message}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#EEEEEE', fontSize: 16 }}>Loading week plan...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 16,
        paddingTop: Math.max(insets.top + 16, 60),
        backgroundColor: '#212121'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginRight: 12 }}>
            <MaterialCommunityIcons name="menu" size={24} color="#EEEEEE" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateWeek(-1)}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#00ADB5" />
          </TouchableOpacity>
        </View>
        
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#EEEEEE', fontSize: 18, fontWeight: '600' }}>
            Week Planner
          </Text>
          <Text style={{ color: '#EEEEEE', opacity: 0.7, fontSize: 14 }}>
            {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => navigateWeek(1)}>
          <MaterialCommunityIcons name="chevron-right" size={28} color="#00ADB5" />
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        paddingHorizontal: 16,
        paddingBottom: 16
      }}>
        <TouchableOpacity 
          onPress={generateWeekPlan}
          style={{
            backgroundColor: '#00ADB5',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          <MaterialCommunityIcons 
            name={aiEnabled ? "robot" : "auto-fix"} 
            size={18} 
            color="#EEEEEE" 
          />
          <Text style={{ color: '#EEEEEE', marginLeft: 6, fontWeight: '500' }}>
            {aiEnabled ? 'AI Plan' : 'Generate Plan'}
          </Text>
        </TouchableOpacity>

        {aiEnabled && (
          <TouchableOpacity 
            onPress={() => setShowAIChat(true)}
            style={{
              backgroundColor: '#4CAF50',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <MaterialCommunityIcons name="chat" size={18} color="#EEEEEE" />
            <Text style={{ color: '#EEEEEE', marginLeft: 6, fontWeight: '500' }}>
              AI Chat
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          onPress={() => navigation.navigate('PlannerPreferences')}
          style={{
            backgroundColor: '#3A4750',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          <MaterialCommunityIcons name="cog" size={18} color="#EEEEEE" />
          <Text style={{ color: '#EEEEEE', marginLeft: 6, fontWeight: '500' }}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Week suggestions */}
      {weekPlan && weekPlan.suggestions.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          {weekPlan.suggestions.map((suggestion, index) => (
            <View key={index} style={{
              backgroundColor: suggestion.type === 'warning' ? '#FF6B6B' : '#00ADB5',
              padding: 12,
              borderRadius: 8,
              marginBottom: 8
            }}>
              <Text style={{ color: '#EEEEEE', fontSize: 14 }}>
                {suggestion.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Daily plans */}
      <FlatList
        data={weekPlan ? weekPlan.dailyPlans : weekDates.map(date => ({
          date: getLocalDateKey(date),
          dayName: formatDate(date),
          events: eventsByDay[getLocalDateKey(date)] || [],
          travelTimes: [],
          dailyDriving: 0,
          suggestedSleepLocation: 'home',
          rushHourImpact: 'low'
        }))}
        keyExtractor={(item) => item.date}
        renderItem={renderDayPlan}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* AI Chat Modal */}
      <Modal
        visible={showAIChat}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={false}
      >
        <AIChatInterface
          weekPlan={weekPlan}
          preferences={preferences}
          onClose={() => setShowAIChat(false)}
        />
      </Modal>
    </LinearGradient>
  );
}
