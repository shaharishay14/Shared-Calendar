import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'user_profile';

const ProfileContext = createContext();

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: null,
    preferences: {
      defaultLocation: '',
      workLocation: '',
      notifications: true,
      language: 'en'
    }
  });

  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('ProfileContext - Loaded profile:', { name: parsed.name, hasAvatar: !!parsed.avatar });
        setProfile(parsed);
      }
    } catch (error) {
      console.error('ProfileContext - Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (newProfile) => {
    try {
      const profileToSave = { ...profile, ...newProfile };
      console.log('ProfileContext - Saving profile:', { name: profileToSave.name, hasAvatar: !!profileToSave.avatar });
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profileToSave));
      setProfile(profileToSave);
      return true;
    } catch (error) {
      console.error('ProfileContext - Error saving profile:', error);
      return false;
    }
  };

  const updateProfile = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePreference = (field, value) => {
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value
      }
    }));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const value = {
    profile,
    loading,
    loadProfile,
    saveProfile,
    updateProfile,
    updatePreference
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
