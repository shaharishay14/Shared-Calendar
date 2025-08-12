import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';

export default function EventInfoScreen({ route }) {
  const { event } = route.params || {};
  const start = new Date(event.date);
  const end = event.endDate ? new Date(event.endDate) : null;
  const timeText = end
    ? `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}`
    : start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        {/* Title + chips */}
        <Text style={{ color: '#EEEEEE', fontSize: 22, fontFamily: 'Inter_600SemiBold' }} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
          <Text style={{ color: '#EEEEEE', opacity: 0.85 }}>
            {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <View style={{ height: 4, width: 4, borderRadius: 2, backgroundColor: '#EEEEEE', opacity: 0.6 }} />
          <Text style={{ color: '#EEEEEE', opacity: 0.85 }}>{timeText}</Text>
        </View>

        {/* Meta card */}
        <View
          style={{
            backgroundColor: '#E9E3DF',
            borderColor: '#00ADB5',
            borderWidth: 2,
            borderRadius: 16,
            padding: 14,
            marginTop: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#212121', fontFamily: 'Inter_600SemiBold', marginRight: 8 }}>Category</Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, borderWidth: 1, borderColor: '#00ADB5' }}>
              <Text style={{ color: '#212121', fontFamily: 'Inter_500Medium', fontSize: 12 }}>{event.category}</Text>
            </View>
          </View>
          {event.location ? (
            <View style={{ marginTop: 6 }}>
              <Text style={{ color: '#212121', fontFamily: 'Inter_600SemiBold' }}>Location</Text>
              <Text style={{ color: '#212121', marginTop: 4 }} numberOfLines={3}>
                {event.location}
              </Text>
            </View>
          ) : null}

          {typeof event.lat === 'number' && typeof event.lng === 'number' ? (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: '#212121', fontFamily: 'Inter_600SemiBold', marginBottom: 6 }}>Map</Text>
              <MapView
                style={{ height: 180, borderRadius: 12 }}
                initialRegion={{
                  latitude: event.lat,
                  longitude: event.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={{ latitude: event.lat, longitude: event.lng }} />
              </MapView>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
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
                  style={{ backgroundColor: '#00ADB5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }}
                >
                  <Text style={{ color: '#EEEEEE', fontFamily: 'Inter_600SemiBold' }}>Open in Waze</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}


