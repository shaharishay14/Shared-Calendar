import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllEventsSorted } from '../database/db';

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

// Sample traffic guidelines (would come from preferences)
const defaultTrafficGuidelines = {
  rushHours: {
    morning: { start: '07:00', end: '09:30' },
    evening: { start: '16:30', end: '19:00' }
  },
  trafficMultipliers: {
    normal: 1.0,
    light: 0.8,
    heavy: 1.5,
    rush: 2.0
  },
  maxDailyDriving: 180, // minutes
  bufferTime: 15, // minutes before each event
  preferredSleepLocation: 'home', // home, partner, optimal
  longDriveThreshold: 90, // minutes - suggest overnight stay
  locations: {
    home: { address: 'Home', lat: null, lng: null },
    work: { address: 'Work', lat: null, lng: null },
    partner: { address: "Partner's Place", lat: null, lng: null }
  }
};

// Helper function to estimate travel time between two locations
function estimateTravelTime(fromLocation, toLocation, departureTime, guidelines = defaultTrafficGuidelines) {
  if (!fromLocation || !toLocation) return 30; // Default 30 minutes
  
  // Simple distance estimation (in real app, would use Google Maps API)
  const baseTime = 30; // Base travel time in minutes
  
  // Check if departure is during rush hour
  const hour = new Date(departureTime).getHours();
  const minute = new Date(departureTime).getMinutes();
  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  let multiplier = guidelines.trafficMultipliers.normal;
  
  if ((timeString >= guidelines.rushHours.morning.start && timeString <= guidelines.rushHours.morning.end) ||
      (timeString >= guidelines.rushHours.evening.start && timeString <= guidelines.rushHours.evening.end)) {
    multiplier = guidelines.trafficMultipliers.rush;
  }
  
  return Math.round(baseTime * multiplier);
}

// Helper function to find optimal sleep location
function findOptimalSleepLocation(currentDayEvents, nextDayEvents, guidelines = defaultTrafficGuidelines) {
  const locations = guidelines.locations;
  
  // If no events tomorrow, prefer home
  if (!nextDayEvents || nextDayEvents.length === 0) {
    return { location: 'home', reason: 'No events tomorrow' };
  }
  
  const firstEventTomorrow = nextDayEvents[0];
  const lastEventToday = currentDayEvents[currentDayEvents.length - 1];
  
  // Calculate travel times from each potential sleep location to first event tomorrow
  const travelTimes = {};
  Object.keys(locations).forEach(locationKey => {
    const location = locations[locationKey];
    if (firstEventTomorrow.location) {
      travelTimes[locationKey] = estimateTravelTime(
        location.address,
        firstEventTomorrow.location,
        new Date(firstEventTomorrow.date)
      );
    } else {
      travelTimes[locationKey] = 30; // Default
    }
  });
  
  // Find location with shortest travel time
  const optimalLocation = Object.keys(travelTimes).reduce((best, current) => 
    travelTimes[current] < travelTimes[best] ? current : best
  );
  
  // Only suggest non-home if it saves significant time
  if (optimalLocation !== 'home' && travelTimes['home'] - travelTimes[optimalLocation] > 20) {
    return {
      location: optimalLocation,
      reason: `Saves ${travelTimes['home'] - travelTimes[optimalLocation]} minutes tomorrow morning`
    };
  }
  
  return { location: 'home', reason: 'Most convenient overall' };
}

export default function WeekPlannerScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weekPlan, setWeekPlan] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Intelligent planning algorithm
  const generateWeekPlan = () => {
    console.log('Generating intelligent week plan...');
    
    const plan = {
      weekOf: getLocalDateKey(weekDates[0]),
      dailyPlans: [],
      totalDriving: 0,
      suggestions: [],
      optimizations: []
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
          const departureTime = new Date(currentEndTime.getTime() + (defaultTrafficGuidelines.bufferTime * 60000));
          
          // Estimate travel time considering traffic
          const estimatedTime = estimateTravelTime(
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
          
          travelTimes.push({
            from: currentEvent.title,
            to: nextEvent.title,
            fromLocation: currentEvent.location,
            toLocation: nextEvent.location,
            duration: estimatedTime,
            departure: departureTime,
            isRushHour,
            suggestion: isRushHour ? 'Consider leaving earlier to avoid rush hour' : null
          });
        }
      }

      // Find optimal sleep location for tonight
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = getLocalDateKey(tomorrow);
      const tomorrowEvents = eventsByDay[tomorrowKey] || [];
      
      const sleepOptimization = findOptimalSleepLocation(dayEvents, tomorrowEvents);
      
      // Analyze day's schedule
      const dayAnalysis = {
        isBusy: dayEvents.length > 3,
        isLongDrivingDay: dailyDriving > defaultTrafficGuidelines.maxDailyDriving,
        hasRushHourTravel: rushHourConflicts.length > 0,
        hasLongDrives: travelTimes.some(t => t.duration > defaultTrafficGuidelines.longDriveThreshold),
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
    
    console.log('Week plan generated:', plan);
    setWeekPlan(plan);
  };

  // Generate recommendations for a specific day
  const generateDayRecommendations = (dayEvents, travelTimes, analysis, sleepOptimization) => {
    const recommendations = [];
    
    if (analysis.hasRushHourTravel) {
      recommendations.push({
        type: 'warning',
        icon: '🚦',
        title: 'Rush Hour Alert',
        message: 'Consider adjusting departure times to avoid heavy traffic'
      });
    }
    
    if (analysis.isLongDrivingDay) {
      recommendations.push({
        type: 'warning',
        icon: '🚗',
        title: 'Heavy Driving Day',
        message: `${Math.round(analysis.totalEventTime / 60)}h of driving planned. Consider grouping events or staying overnight.`
      });
    }
    
    if (sleepOptimization.location !== 'home') {
      recommendations.push({
        type: 'suggestion',
        icon: '🛏️',
        title: 'Sleep Location',
        message: `Stay at ${sleepOptimization.location} tonight. ${sleepOptimization.reason}.`
      });
    }
    
    if (analysis.isBusy && dayEvents.length > 0) {
      const firstEvent = dayEvents[0];
      const lastEvent = dayEvents[dayEvents.length - 1];
      const daySpan = (new Date(lastEvent.date) - new Date(firstEvent.date)) / (1000 * 60 * 60);
      
      if (daySpan > 10) {
        recommendations.push({
          type: 'info',
          icon: '⏰',
          title: 'Long Day',
          message: 'Schedule breaks between events to avoid fatigue'
        });
      }
    }
    
    return recommendations;
  };

  // Generate week-level suggestions
  const generateWeekSuggestions = (plan) => {
    const suggestions = [];
    const totalHours = Math.round(plan.totalDriving / 60 * 10) / 10;
    
    if (plan.totalDriving > defaultTrafficGuidelines.maxDailyDriving * 5) {
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
        paddingTop: 20
      }}>
        <TouchableOpacity onPress={() => navigateWeek(-1)}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#00ADB5" />
        </TouchableOpacity>
        
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
          <MaterialCommunityIcons name="auto-fix" size={18} color="#EEEEEE" />
          <Text style={{ color: '#EEEEEE', marginLeft: 6, fontWeight: '500' }}>
            Generate Plan
          </Text>
        </TouchableOpacity>

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
    </LinearGradient>
  );
}
