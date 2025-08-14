import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase, SUPABASE_ENABLED, HOUSEHOLD_ID } from '../database/db';

const DEVICE_KEY = 'sc_device_id_v1';

async function getOrCreateDeviceId() {
  let id = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    await SecureStore.setItemAsync(DEVICE_KEY, id);
  }
  return id;
}

export default function AppGateScreen({ navigation }) {
  useEffect(() => {
    (async () => {
      // If Supabase is not configured, skip gating
      if (!SUPABASE_ENABLED || !supabase) {
        navigation.replace('MainApp');
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user) {
        navigation.replace('SignIn');
        return;
      }

      const deviceId = await getOrCreateDeviceId();
      const { data: existing, error } = await supabase
        .from('household_devices')
        .select('device_id')
        .eq('household_id', HOUSEHOLD_ID)
        .eq('user_id', session.user.id)
        .eq('device_id', deviceId)
        .limit(1)
        .maybeSingle();

      if (error) {
        // If we cannot check, send to register to try; it will show an error if blocked
        navigation.replace('DeviceRegister', { householdId: HOUSEHOLD_ID });
        return;
      }

      if (existing) {
        navigation.replace('MainApp');
      } else {
        navigation.replace('DeviceRegister', { householdId: HOUSEHOLD_ID });
      }
    })();
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#212121', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#00ADB5" />
    </View>
  );
}


