import React from 'react';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function InfoIconButton({ onPress, size = 32, color = '#0ea5e9', borderColor = '#0ea5e9' }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="Event Info"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
      }}
    >
      <MaterialCommunityIcons name="information-outline" size={Math.round(size * 0.56)} color={color} />
    </TouchableOpacity>
  );
}


