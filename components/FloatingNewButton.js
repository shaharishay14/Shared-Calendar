import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function FloatingNewButton({ onPress, bottom = 32, size = 64 }) {
  const translateX = -(size / 2);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityLabel="New"
      style={{
        position: 'absolute',
        bottom,
        left: '50%',
        transform: [{ translateX }],
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={["#00ADB5", "#00ADB5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#EEEEEE', fontSize: size * 0.45, lineHeight: size * 0.45 }}>+</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}


