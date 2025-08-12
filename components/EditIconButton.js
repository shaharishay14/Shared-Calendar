import React from 'react';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function EditIconButton({ onPress, size = 32, color = '#212121', borderColor = '#212121' }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="Edit Event"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name="pencil" size={Math.round(size * 0.56)} color={color} />
    </TouchableOpacity>
  );
}


