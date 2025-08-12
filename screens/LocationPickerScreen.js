import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, UIManager } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

const HAS_MAP = !!UIManager.getViewManagerConfig?.('AIRMap');

export default function LocationPickerScreen({ route, navigation }) {
  const { initial } = route.params || {};
  const [region, setRegion] = useState(
    initial?.latitude && initial?.longitude
      ? { latitude: initial.latitude, longitude: initial.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : null
  );
  const [marker, setMarker] = useState(initial || null);
  const [loading, setLoading] = useState(!region);

  useEffect(() => {
    (async () => {
      if (region) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setRegion({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.05, longitudeDelta: 0.05 });
          setLoading(false);
          return;
        }
        // Wrap getCurrentPosition in a timeout fallback to avoid hanging/crash on some devices
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({}),
          new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        if (loc && loc.coords) {
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        } else {
          setRegion({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        }
      } catch {
        setRegion({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      } finally {
        setLoading(false);
      }
    })();
  }, [region]);

  const onConfirm = async () => {
    if (!marker) return navigation.goBack();
    let address = null;
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: marker.latitude, longitude: marker.longitude });
      if (res?.length) {
        const a = res[0];
        address = [a.name, a.street, a.city, a.region, a.country].filter(Boolean).join(', ');
      }
    } catch {}
    const params = { pickedLocation: { ...marker, address } };
    const returnTo = route.params?.returnTo || 'AddEvent';
    // If we have a returnKey (specific screen instance), navigate back to it explicitly
    if (route.params?.returnKey) {
      navigation.navigate({ key: route.params.returnKey, params, merge: true });
    } else {
      navigation.navigate({ name: returnTo, params, merge: true });
    }
  };

  return (
    <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1 }}>
      {!region ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#00ADB5" />
        </View>
      ) : HAS_MAP ? (
        <MapView
          style={{ flex: 1 }}
          initialRegion={region}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setMarker({ latitude, longitude });
          }}
        >
          {marker ? <Marker coordinate={marker} /> : null}
        </MapView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#EEEEEE', textAlign: 'center' }}>
            Map module is not available in this build. Please rebuild with react-native-maps or open in Expo Go.
          </Text>
        </View>
      )}
      <View style={{ padding: 16 }}>
        <TouchableOpacity onPress={onConfirm} style={{ backgroundColor: '#00ADB5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ color: '#EEEEEE', fontFamily: 'Inter_600SemiBold' }}>Use this location</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}


