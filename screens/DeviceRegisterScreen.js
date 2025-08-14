import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, SUPABASE_ENABLED } from '../database/db';

const DEVICE_KEY = 'sc_device_id_v1';

async function getOrCreateDeviceId() {
  let id = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    await SecureStore.setItemAsync(DEVICE_KEY, id);
  }
  return id;
}

export default function DeviceRegisterScreen({ route, navigation }) {
  const { householdId } = route.params || {};
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await getOrCreateDeviceId();
      setDeviceId(id);
    })();
  }, []);

  const onRegister = async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    setError('');
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Not authenticated');
      // household_devices: household_id (text/uuid), user_id uuid, device_id text
      const { error: err } = await supabase.from('household_devices').insert({
        household_id: householdId,
        user_id: user.user.id,
        device_id: deviceId,
      });
      if (err) throw err;
      setRegistered(true);
      navigation.replace('MainApp');
    } catch (e) {
      setError(e.message || 'Registration failed');
    }
  };

  return (
    <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <Text style={{ color: '#EEEEEE', fontSize: 20, textAlign: 'center', marginBottom: 12 }}>Register this device</Text>
      <Text style={{ color: '#EEEEEE', opacity: 0.8, textAlign: 'center' }}>Device ID:</Text>
      <Text style={{ color: '#EEEEEE', textAlign: 'center', marginBottom: 16 }}>{deviceId}</Text>
      {error ? <Text style={{ color: '#FF6B6B', textAlign: 'center', marginBottom: 8 }}>{error}</Text> : null}
      <TouchableOpacity onPress={onRegister} style={{ backgroundColor: '#00ADB5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ color: '#EEEEEE', fontFamily: 'Inter_600SemiBold' }}>Register</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}


