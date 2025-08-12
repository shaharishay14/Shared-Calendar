import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERENCES_KEY = 'planner_preferences';

const defaultPreferences = {
  // Locations
  homeLocation: { address: '', lat: null, lng: null },
  workLocation: { address: '', lat: null, lng: null },
  partnerLocation: { address: '', lat: null, lng: null },
  
  // Traffic Guidelines
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
  
  // Travel Preferences
  maxDailyDriving: 180, // minutes
  maxWeeklyDriving: 900, // minutes
  bufferTime: 15, // minutes before each event
  longDriveThreshold: 90, // minutes - consider overnight stay
  
  // Sleep Preferences
  preferredBedtime: '23:00',
  preferredWakeTime: '07:00',
  minimumSleep: 7, // hours
  preferredSleepLocation: 'home', // home, partner, optimal
  
  // Planning Rules
  avoidRushHour: true,
  prioritizeRestDays: true,
  groupNearbyEvents: true,
  considerWeather: false,
  
  // Notifications
  planningReminders: true,
  trafficAlerts: true,
  sleepLocationReminders: true
};

export default function PlannerPreferencesScreen({ navigation }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({ ...defaultPreferences, ...parsed });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences
  const savePreferences = async () => {
    try {
      setSaving(true);
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      Alert.alert('Success', 'Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Update nested preference
  const updatePreference = (path, value) => {
    const keys = path.split('.');
    const newPreferences = { ...preferences };
    let current = newPreferences;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setPreferences(newPreferences);
  };

  const renderSection = (title, children) => (
    <View style={{
      backgroundColor: '#3A4750',
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#00ADB5'
    }}>
      <Text style={{
        color: '#00ADB5',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16
      }}>
        {title}
      </Text>
      {children}
    </View>
  );

  const renderTextInput = (label, value, onChangeText, placeholder = '') => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: '#EEEEEE', fontSize: 14, marginBottom: 8 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#888"
        style={{
          backgroundColor: '#212121',
          color: '#EEEEEE',
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#555'
        }}
      />
    </View>
  );

  const renderTimeInput = (label, value, onChangeText) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: '#EEEEEE', fontSize: 14, marginBottom: 8 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="HH:MM"
        placeholderTextColor="#888"
        style={{
          backgroundColor: '#212121',
          color: '#EEEEEE',
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#555',
          width: 100
        }}
      />
    </View>
  );

  const renderNumberInput = (label, value, onChangeText, suffix = '') => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: '#EEEEEE', fontSize: 14, marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          value={String(value)}
          onChangeText={(text) => onChangeText(parseInt(text) || 0)}
          placeholder="0"
          placeholderTextColor="#888"
          keyboardType="numeric"
          style={{
            backgroundColor: '#212121',
            color: '#EEEEEE',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#555',
            width: 100
          }}
        />
        {suffix && (
          <Text style={{ color: '#EEEEEE', marginLeft: 8 }}>
            {suffix}
          </Text>
        )}
      </View>
    </View>
  );

  const renderSwitch = (label, value, onValueChange, description = '') => (
    <View style={{ 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: 16
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#EEEEEE', fontSize: 14 }}>
          {label}
        </Text>
        {description && (
          <Text style={{ color: '#EEEEEE', opacity: 0.7, fontSize: 12, marginTop: 2 }}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#555', true: '#00ADB5' }}
        thumbColor={value ? '#EEEEEE' : '#888'}
      />
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#EEEEEE', fontSize: 16 }}>Loading preferences...</Text>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Locations */}
          {renderSection('📍 Locations', (
            <>
              {renderTextInput(
                'Home Address',
                preferences.homeLocation.address,
                (text) => updatePreference('homeLocation.address', text),
                'Enter your home address'
              )}
              {renderTextInput(
                'Work Address',
                preferences.workLocation.address,
                (text) => updatePreference('workLocation.address', text),
                'Enter your work address'
              )}
              {renderTextInput(
                'Partner\'s Address',
                preferences.partnerLocation.address,
                (text) => updatePreference('partnerLocation.address', text),
                'Enter partner\'s address'
              )}
            </>
          ))}

          {/* Traffic Guidelines */}
          {renderSection('🚗 Traffic Guidelines', (
            <>
              <Text style={{ color: '#EEEEEE', fontSize: 16, marginBottom: 12 }}>
                Rush Hours
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {renderTimeInput(
                  'Morning Start',
                  preferences.rushHours.morning.start,
                  (text) => updatePreference('rushHours.morning.start', text)
                )}
                {renderTimeInput(
                  'Morning End',
                  preferences.rushHours.morning.end,
                  (text) => updatePreference('rushHours.morning.end', text)
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {renderTimeInput(
                  'Evening Start',
                  preferences.rushHours.evening.start,
                  (text) => updatePreference('rushHours.evening.start', text)
                )}
                {renderTimeInput(
                  'Evening End',
                  preferences.rushHours.evening.end,
                  (text) => updatePreference('rushHours.evening.end', text)
                )}
              </View>
              
              <Text style={{ color: '#EEEEEE', fontSize: 16, marginTop: 16, marginBottom: 12 }}>
                Traffic Multipliers
              </Text>
              <Text style={{ color: '#EEEEEE', opacity: 0.7, fontSize: 12, marginBottom: 12 }}>
                How much longer trips take during different traffic conditions
              </Text>
              {renderNumberInput(
                'Rush Hour Multiplier',
                preferences.trafficMultipliers.rush,
                (value) => updatePreference('trafficMultipliers.rush', value),
                'x normal time'
              )}
              {renderNumberInput(
                'Heavy Traffic Multiplier',
                preferences.trafficMultipliers.heavy,
                (value) => updatePreference('trafficMultipliers.heavy', value),
                'x normal time'
              )}
            </>
          ))}

          {/* Travel Preferences */}
          {renderSection('🛣️ Travel Preferences', (
            <>
              {renderNumberInput(
                'Max Daily Driving',
                preferences.maxDailyDriving,
                (value) => updatePreference('maxDailyDriving', value),
                'minutes'
              )}
              {renderNumberInput(
                'Max Weekly Driving',
                preferences.maxWeeklyDriving,
                (value) => updatePreference('maxWeeklyDriving', value),
                'minutes'
              )}
              {renderNumberInput(
                'Buffer Time Before Events',
                preferences.bufferTime,
                (value) => updatePreference('bufferTime', value),
                'minutes'
              )}
              {renderNumberInput(
                'Long Drive Threshold',
                preferences.longDriveThreshold,
                (value) => updatePreference('longDriveThreshold', value),
                'minutes (suggest overnight)'
              )}
            </>
          ))}

          {/* Sleep Preferences */}
          {renderSection('😴 Sleep Preferences', (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {renderTimeInput(
                  'Preferred Bedtime',
                  preferences.preferredBedtime,
                  (text) => updatePreference('preferredBedtime', text)
                )}
                {renderTimeInput(
                  'Preferred Wake Time',
                  preferences.preferredWakeTime,
                  (text) => updatePreference('preferredWakeTime', text)
                )}
              </View>
              {renderNumberInput(
                'Minimum Sleep',
                preferences.minimumSleep,
                (value) => updatePreference('minimumSleep', value),
                'hours'
              )}
              
              <Text style={{ color: '#EEEEEE', fontSize: 14, marginBottom: 8 }}>
                Preferred Sleep Location
              </Text>
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                {['home', 'partner', 'optimal'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => updatePreference('preferredSleepLocation', option)}
                    style={{
                      backgroundColor: preferences.preferredSleepLocation === option ? '#00ADB5' : '#555',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      marginRight: 8
                    }}
                  >
                    <Text style={{ color: '#EEEEEE', textTransform: 'capitalize' }}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ))}

          {/* Planning Rules */}
          {renderSection('⚙️ Planning Rules', (
            <>
              {renderSwitch(
                'Avoid Rush Hour',
                preferences.avoidRushHour,
                (value) => updatePreference('avoidRushHour', value),
                'Suggest departure times that avoid rush hour traffic'
              )}
              {renderSwitch(
                'Prioritize Rest Days',
                preferences.prioritizeRestDays,
                (value) => updatePreference('prioritizeRestDays', value),
                'Keep some days light on travel when possible'
              )}
              {renderSwitch(
                'Group Nearby Events',
                preferences.groupNearbyEvents,
                (value) => updatePreference('groupNearbyEvents', value),
                'Suggest moving events to minimize total driving'
              )}
              {renderSwitch(
                'Consider Weather',
                preferences.considerWeather,
                (value) => updatePreference('considerWeather', value),
                'Factor in weather conditions for travel time'
              )}
            </>
          ))}

          {/* Notifications */}
          {renderSection('🔔 Notifications', (
            <>
              {renderSwitch(
                'Planning Reminders',
                preferences.planningReminders,
                (value) => updatePreference('planningReminders', value),
                'Weekly reminders to review and optimize your schedule'
              )}
              {renderSwitch(
                'Traffic Alerts',
                preferences.trafficAlerts,
                (value) => updatePreference('trafficAlerts', value),
                'Notifications about traffic conditions before departure'
              )}
              {renderSwitch(
                'Sleep Location Reminders',
                preferences.sleepLocationReminders,
                (value) => updatePreference('sleepLocationReminders', value),
                'Reminders about where to sleep for optimal next-day travel'
              )}
            </>
          ))}

          {/* Save Button */}
          <TouchableOpacity
            onPress={savePreferences}
            disabled={saving}
            style={{
              backgroundColor: '#00ADB5',
              marginHorizontal: 16,
              marginTop: 20,
              paddingVertical: 16,
              borderRadius: 12,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <MaterialCommunityIcons 
              name={saving ? "loading" : "content-save"} 
              size={20} 
              color="#EEEEEE" 
            />
            <Text style={{
              color: '#EEEEEE',
              fontSize: 16,
              fontWeight: '600',
              marginLeft: 8
            }}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
