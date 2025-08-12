import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, SUPABASE_ENABLED } from '../database/db';

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'signUp') {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      }
      // After auth, let the gate decide whether device is already registered
      navigation.replace('AppGate');
    } catch (e) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <Text style={{ color: '#EEEEEE', fontSize: 22, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginBottom: 24 }}>
        {mode === 'signIn' ? 'Sign In' : 'Create Account'}
      </Text>

      <Text style={{ color: '#EEEEEE', marginBottom: 6 }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ backgroundColor: '#3A4750', color: '#EEEEEE', borderColor: '#00ADB5', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
      />

      <Text style={{ color: '#EEEEEE', marginBottom: 6, marginTop: 12 }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ backgroundColor: '#3A4750', color: '#EEEEEE', borderColor: '#00ADB5', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
      />

      {error ? (
        <Text style={{ color: '#FF6B6B', marginTop: 8, textAlign: 'center' }}>{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={onSubmit}
        disabled={loading}
        style={{ marginTop: 16, backgroundColor: '#00ADB5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
      >
        <Text style={{ color: '#EEEEEE', fontFamily: 'Inter_600SemiBold' }}>{loading ? 'Please wait…' : mode === 'signIn' ? 'Sign In' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={{ marginTop: 12 }}>
        <Text style={{ color: '#EEEEEE', textAlign: 'center' }}>
          {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}


