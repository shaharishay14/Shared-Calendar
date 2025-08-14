import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useProfile } from '../contexts/ProfileContext';
import { getHouseholdMembers } from '../database/db';

export default function CustomDrawer(props) {
  const { profile } = useProfile();
  const [householdCount, setHouseholdCount] = useState(0);
  const insets = useSafeAreaInsets();

  console.log('CustomDrawer - Using profile from context:', { name: profile.name, hasAvatar: !!profile.avatar });

  useEffect(() => {
    loadHouseholdCount();
    
    // Listen for navigation focus to refresh household count
    const unsubscribe = props.navigation.addListener('focus', () => {
      loadHouseholdCount();
    });

    return unsubscribe;
  }, [props.navigation]);

  const loadHouseholdCount = async () => {
    try {
      const result = await getHouseholdMembers();
      if (result.success) {
        setHouseholdCount(result.data.length);
      }
    } catch (error) {
      console.error('Error loading household count:', error);
    }
  };

  const menuItems = [
    {
      name: 'Home',
      screen: 'Home',
      icon: 'calendar',
      description: 'View your calendar'
    },
    {
      name: 'Week Planner',
      screen: 'WeekPlanner',
      icon: 'calendar-week',
      description: 'AI-powered week planning'
    },
    {
      name: 'Profile',
      screen: 'Profile',
      icon: 'account',
      description: `Manage your profile & household (${householdCount} member${householdCount !== 1 ? 's' : ''})`
    },
    {
      name: 'Settings',
      screen: 'PlannerPreferences',
      icon: 'cog',
      description: 'App preferences & AI settings'
    }
  ];

  const additionalItems = [
    {
      name: 'About',
      icon: 'information',
      onPress: () => {
        Alert.alert(
          'Shared Calendar',
          'AI-powered calendar sharing app for couples.\n\nVersion 1.0.0\nBuilt with React Native & OpenAI',
          [{ text: 'OK' }]
        );
      }
    },
    {
      name: 'Help',
      icon: 'help-circle',
      onPress: () => {
        Alert.alert(
          'Help & Support',
          'Need help?\n\n• Check the Settings for AI configuration\n• Use the Week Planner for intelligent scheduling\n• Visit the Profile to manage household members',
          [{ text: 'OK' }]
        );
      }
    }
  ];

  const renderMenuItem = (item, index) => {
    const isActive = props.state.routeNames[props.state.index] === item.screen;
    
    return (
      <TouchableOpacity
        key={index}
        onPress={() => {
          if (item.onPress) {
            item.onPress();
          } else {
            props.navigation.navigate(item.screen);
          }
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: 20,
          marginHorizontal: 10,
          borderRadius: 12,
          backgroundColor: isActive ? '#00ADB520' : 'transparent',
          borderWidth: isActive ? 1 : 0,
          borderColor: '#00ADB5'
        }}
      >
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isActive ? '#00ADB5' : '#3A4750',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 16
        }}>
          <MaterialCommunityIcons 
            name={item.icon} 
            size={20} 
            color={isActive ? '#EEEEEE' : '#00ADB5'} 
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            color: '#EEEEEE',
            fontSize: 16,
            fontWeight: isActive ? '600' : '400'
          }}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={{
              color: '#EEEEEE',
              opacity: 0.6,
              fontSize: 12,
              marginTop: 2
            }}>
              {item.description}
            </Text>
          )}
        </View>
        
        {isActive && (
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={20} 
            color="#00ADB5" 
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={["#212121", "#2a2a2a"]} style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Header */}
        <View style={{
          paddingTop: Math.max(insets.top + 20, 60),
          paddingBottom: 20,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#3A4750'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => props.navigation.navigate('Profile')}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: profile.avatar ? 'transparent' : '#00ADB5',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
                borderWidth: 2,
                borderColor: '#00ADB5',
                overflow: 'hidden'
              }}
            >
              {profile.avatar ? (
                <Image
                  source={{ uri: profile.avatar }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 28
                  }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: '#EEEEEE', fontSize: 24, fontWeight: '600' }}>
                  {(profile.name || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#EEEEEE', fontSize: 18, fontWeight: '600' }}>
                {profile.name || 'Welcome!'}
              </Text>
              {profile.email && (
                <Text style={{ color: '#EEEEEE', opacity: 0.7, fontSize: 14 }}>
                  {profile.email}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#4CAF50',
                  marginRight: 6
                }} />
                <Text style={{ color: '#4CAF50', fontSize: 12 }}>
                  Online
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Navigation Menu */}
        <View style={{ paddingVertical: 20 }}>
          <Text style={{
            color: '#00ADB5',
            fontSize: 14,
            fontWeight: '600',
            paddingHorizontal: 20,
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: 1
          }}>
            Navigation
          </Text>
          
          {menuItems.map(renderMenuItem)}
        </View>

        {/* Additional Items */}
        <View style={{ 
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: '#3A4750',
          marginTop: 20
        }}>
          <Text style={{
            color: '#00ADB5',
            fontSize: 14,
            fontWeight: '600',
            paddingHorizontal: 20,
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: 1
          }}>
            Support
          </Text>
          
          {additionalItems.map((item, index) => renderMenuItem(item, index + menuItems.length))}
        </View>

        {/* App Info */}
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 20,
          borderTopWidth: 1,
          borderTopColor: '#3A4750',
          marginTop: 20
        }}>
          <View style={{
            backgroundColor: '#00ADB520',
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#00ADB5'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons name="robot" size={20} color="#00ADB5" />
              <Text style={{ color: '#00ADB5', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>
                AI-Powered Planning
              </Text>
            </View>
            <Text style={{ color: '#EEEEEE', fontSize: 12, opacity: 0.8 }}>
              Get intelligent week planning, travel optimization, and smart recommendations powered by OpenAI.
            </Text>
          </View>
        </View>
      </DrawerContentScrollView>
    </LinearGradient>
  );
}
