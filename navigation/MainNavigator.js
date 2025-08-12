import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import AddEventScreen from '../screens/AddEventScreen';
import EditEventScreen from '../screens/EditEventScreen';
import SignInScreen from '../screens/SignInScreen';
import DeviceRegisterScreen from '../screens/DeviceRegisterScreen';
import AppGateScreen from '../screens/AppGateScreen';
import LocationPickerScreen from '../screens/LocationPickerScreen';
import EventInfoScreen from '../screens/EventInfoScreen';

const Stack = createStackNavigator();

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
          headerStyle: { backgroundColor: '#212121' },
          headerTitleStyle: { color: '#EEEEEE', fontFamily: 'Inter_600SemiBold', fontSize: 18 },
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
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Shared Calendar' }} />
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


