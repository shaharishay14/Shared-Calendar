import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import AddEventScreen from '../screens/AddEventScreen';
import EditEventScreen from '../screens/EditEventScreen';
import SignInScreen from '../screens/SignInScreen';
import DeviceRegisterScreen from '../screens/DeviceRegisterScreen';
import AppGateScreen from '../screens/AppGateScreen';
import LocationPickerScreen from '../screens/LocationPickerScreen';
import EventInfoScreen from '../screens/EventInfoScreen';
import WeekPlannerScreen from '../screens/WeekPlannerScreen';
import PlannerPreferencesScreen from '../screens/PlannerPreferencesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CustomDrawer from '../components/CustomDrawer';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer Navigator for main app screens
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerStyle: { 
          backgroundColor: '#212121',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#2a2a2a',
        },
        headerTitleStyle: { 
          color: '#EEEEEE', 
          fontFamily: 'Inter_600SemiBold', 
          fontSize: 18 
        },
        headerTintColor: '#EEEEEE',
        headerTitleAlign: 'center',
        drawerStyle: {
          backgroundColor: '#212121',
          width: 280,
        },
        drawerActiveTintColor: '#00ADB5',
        drawerInactiveTintColor: '#EEEEEE',
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: 'Shared Calendar',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" size={size} color={color} />
          )
        }} 
      />
      <Drawer.Screen 
        name="WeekPlanner" 
        component={WeekPlannerScreen} 
        options={{ 
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-week" size={size} color={color} />
          )
        }} 
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          headerShown: false,
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          )
        }} 
      />
      <Drawer.Screen 
        name="PlannerPreferences" 
        component={PlannerPreferencesScreen} 
        options={{ 
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          )
        }} 
      />
    </Drawer.Navigator>
  );
}

export default function MainNavigator() {
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#00ADB5',
      background: '#212121',
      card: '#212121',
      text: '#EEEEEE',
      border: '#2a2a2a',
      notification: '#00ADB5',
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName="AppGate"
          screenOptions={{
            headerStyle: { 
              backgroundColor: '#212121',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#2a2a2a',
            },
            headerTitleStyle: { 
              color: '#EEEEEE', 
              fontFamily: 'Inter_600SemiBold', 
              fontSize: 18 
            },
            headerTintColor: '#EEEEEE',
            headerShadowVisible: false,
            headerTitleAlign: 'center',
            headerBackTitleVisible: false,
            contentStyle: { backgroundColor: '#212121' },
          }}
        >
        <Stack.Screen name="AppGate" component={AppGateScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign In' }} />
        <Stack.Screen name="DeviceRegister" component={DeviceRegisterScreen} options={{ title: 'Register Device' }} />
        
        {/* Main App with Drawer */}
        <Stack.Screen name="MainApp" component={DrawerNavigator} options={{ headerShown: false }} />
        
        {/* Modal Screens */}
        <Stack.Screen
          name="AddEvent"
          component={AddEventScreen}
          options={{ title: 'Add Event', presentation: 'modal' }}
        />
        <Stack.Screen
          name="EditEvent"
          component={EditEventScreen}
          options={{ title: 'Edit Event', presentation: 'modal' }}
        />
        <Stack.Screen name="LocationPicker" component={LocationPickerScreen} options={{ title: 'Pick Location' }} />
        <Stack.Screen name="EventInfo" component={EventInfoScreen} options={{ title: 'Event Details' }} />
        </Stack.Navigator>
      </NavigationContainer>
  );
}


