import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EditIconButton from './EditIconButton';
import DeleteIconButton from './DeleteIconButton';
import InfoIconButton from './InfoIconButton';

const CATEGORY_COLORS = {
  Work: '#3b82f6',
  Personal: '#10b981',
  Study: '#f59e0b',
  Other: '#6b7280',
};

export default function EventCard({ event, onEdit, onDelete }) {
  const eventDateObj = new Date(event.date);
  const timeString = eventDateObj.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endTimeString = event.endDate
    ? new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;
  return (
    <View
      className="my-2 rounded-2xl"
      style={{
        backgroundColor: '#E9E3DF',
        borderColor: '#00ADB5',
        borderWidth: 2,
        paddingVertical: 18,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
        alignSelf: 'center',
        width: '95%',
        borderRadius: 16,
      }}
    >
      <View style={{ position: 'relative', paddingRight: 88 }}>
        {/* Left side: Text and category */}
        <View style={{ minWidth: 0 }}>
          <Text
            style={{
              color: '#212121',
              fontFamily: 'Inter_600SemiBold',
              fontSize: 18
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {event.title}
          </Text>

          <View style={{ marginTop: 6 }}>
            <Text
              style={{
                color: '#212121',
                opacity: 0.8,
                fontFamily: 'Inter_500Medium',
              }}
              numberOfLines={1}
            >
              {endTimeString ? `${timeString} - ${endTimeString}` : timeString}
            </Text>

            <View
              style={{
                marginTop: 6,
                paddingHorizontal: 6,
                paddingVertical: 0,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#00ADB5',
                alignSelf: 'flex-start'
              }}
            >
              <Text style={{ color: '#212121', fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 12 }}>
                {event.category}
              </Text>
            </View>
          </View>
        </View>

        {/* Right side: Buttons */}
        <View style={{ position: 'absolute', right: 8, top: 6, flexDirection: 'row', alignItems: 'center' }}>
          <InfoIconButton onPress={() => onEdit?.({ ...event, mode: 'info' }) || null} />
          <EditIconButton onPress={() => onEdit?.(event)} />
          <DeleteIconButton onPress={() => onDelete?.(event)} />
        </View>
      </View>
      {typeof event.lat === 'number' && typeof event.lng === 'number' ? (
        <View style={{ marginTop: 10 }}>
          <MapView
            style={{ height: 120, borderRadius: 12 }}
            pointerEvents="none"
            initialRegion={{
              latitude: event.lat,
              longitude: event.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker coordinate={{ latitude: event.lat, longitude: event.lng }} />
          </MapView>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <TouchableOpacity
              onPress={async () => {
                const url = `waze://?ll=${event.lat},${event.lng}&navigate=yes`;
                const fallback = `https://waze.com/ul?ll=${event.lat},${event.lng}&navigate=yes`;
                try {
                  const can = await Linking.canOpenURL('waze://');
                  if (can) await Linking.openURL(url);
                  else await Linking.openURL(fallback);
                } catch {
                  Linking.openURL(fallback);
                }
              }}
              style={{ backgroundColor: '#00ADB5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
            >
              <Text style={{ color: '#EEEEEE', fontFamily: 'Inter_600SemiBold' }}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}


