import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DeleteIconButton({ onPress, size = 32, color = '#B91C1C', borderColor = '#B91C1C', confirm = true }) {
  const handlePress = () => {
    if (!confirm) return onPress?.();
    Alert.alert('Delete event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityLabel="Delete Event"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
      }}
    >
      <MaterialCommunityIcons name="trash-can-outline" size={Math.round(size * 0.56)} color={color} />
    </TouchableOpacity>
  );
}


