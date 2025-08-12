import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SaveButton({ onPress, label = 'Save', disabled = false, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disabled ? 'rgba(0,173,181,0.4)' : '#00ADB5',
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
        },
        style,
      ]}
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons name="content-save" size={20} color="#EEEEEE" />
      <Text style={{ color: '#EEEEEE', fontFamily: 'Inter_600SemiBold', marginLeft: 8 }}>{label}</Text>
    </TouchableOpacity>
  );
}


