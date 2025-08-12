import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Platform, ScrollView, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import SaveButton from '../components/SaveButton';
import * as Location from 'expo-location';

// For now, reuse insert API shape; in real app you'd have getById/update
import { insertEvent, updateEvent } from '../database/db';

const CATEGORIES = ['Work', 'Personal', 'Study', 'Other'];

export default function EditEventScreen({ route, navigation }) {
  const { event } = route.params || {};
  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate] = useState(event?.date ? new Date(event.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [endDate, setEndDate] = useState(event?.endDate ? new Date(event.endDate) : new Date());
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [category, setCategory] = useState(event?.category || 'Work');
  const [location, setLocation] = useState(event?.location || '');
  const [pickedLocation, setPickedLocation] = useState(null);

  useEffect(() => {
    if (route?.params?.pickedLocation) {
      setPickedLocation(route.params.pickedLocation);
    }
  }, [route?.params?.pickedLocation]);

  const onChangeDate = (_, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const onChangeTime = (_, selectedTime) => {
    const picked = selectedTime || date;
    setShowTimePicker(Platform.OS === 'ios');
    // merge picked time into date
    const updated = new Date(date);
    updated.setHours(picked.getHours());
    updated.setMinutes(picked.getMinutes());
    updated.setSeconds(0);
    updated.setMilliseconds(0);
    setDate(updated);
  };

  const onChangeEndTime = (_, selectedTime) => {
    const picked = selectedTime || endDate;
    setShowEndTimePicker(Platform.OS === 'ios');
    const updated = new Date(endDate);
    updated.setHours(picked.getHours());
    updated.setMinutes(picked.getMinutes());
    updated.setSeconds(0);
    updated.setMilliseconds(0);
    setEndDate(updated);
  };

  const onSave = () => {
    if (!title.trim()) return;
    const dateIsoString = date.toISOString();
    const endDateIsoString = endDate.toISOString();
    if (event?.id) {
      updateEvent(
        {
          id: event.id,
          title: title.trim(),
          dateIsoString,
          endDateIsoString,
          category,
          location: (location || pickedLocation?.address || '').trim() || null,
          lat: pickedLocation?.latitude ?? event?.lat ?? null,
          lng: pickedLocation?.longitude ?? event?.lng ?? null,
          createdBy: event?.createdBy || 'Me',
        },
        () => navigation.goBack()
      );
    } else {
      insertEvent(
        {
          title: title.trim(),
          dateIsoString,
          endDateIsoString,
          category,
          location: (location || pickedLocation?.address || '').trim() || null,
          lat: pickedLocation?.latitude ?? null,
          lng: pickedLocation?.longitude ?? null,
          createdBy: 'Me',
        },
        () => navigation.goBack()
      );
    }
  };

  const geocodeAddress = async () => {
    const query = (location || '').trim();
    if (!query) return;
    try {
      const results = await Location.geocodeAsync(query);
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        setPickedLocation({ latitude, longitude, address: location });
      }
    } catch {}
  };

  return (
    <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: '#EEEEEE', opacity: 0.9 }}>Event title</Text>
        <TextInput
          style={{
            backgroundColor: '#3A4750',
            color: '#EEEEEE',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#00ADB5',
          }}
          placeholder="Enter title"
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={{ color: '#EEEEEE', opacity: 0.9, marginTop: 8 }}>Date</Text>
        <View style={{
          backgroundColor: '#3A4750',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#00ADB5',
          overflow: 'hidden',
        }}>
          <Button color="#00ADB5" title={date.toDateString()} onPress={() => setShowDatePicker(true)} />
        </View>
        {showDatePicker && (
          <DateTimePicker value={date} mode="date" display="default" onChange={onChangeDate} />
        )}

        <Text style={{ color: '#EEEEEE', opacity: 0.9, marginTop: 8 }}>Start Time</Text>
        <View style={{
          backgroundColor: '#3A4750',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#00ADB5',
          overflow: 'hidden',
        }}>
          <Button
            color="#00ADB5"
            title={date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            onPress={() => setShowTimePicker(true)}
          />
        </View>
        {showTimePicker && (
          <DateTimePicker value={date} mode="time" display="default" onChange={onChangeTime} />
        )}

        <Text style={{ color: '#EEEEEE', opacity: 0.9, marginTop: 8 }}>End Time</Text>
        <View style={{
          backgroundColor: '#3A4750',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#00ADB5',
          overflow: 'hidden',
        }}>
          <Button
            color="#00ADB5"
            title={endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            onPress={() => setShowEndTimePicker(true)}
          />
        </View>
        {showEndTimePicker && (
          <DateTimePicker value={endDate} mode="time" display="default" onChange={onChangeEndTime} />
        )}

        <Text style={{ color: '#EEEEEE', opacity: 0.9, marginTop: 8 }}>Category</Text>
        <View style={{ backgroundColor: '#3A4750', borderRadius: 10, borderWidth: 1, borderColor: '#00ADB5' }}>
          <Picker
            selectedValue={category}
            onValueChange={(val) => setCategory(val)}
            dropdownIconColor="#EEEEEE"
            style={{ color: '#EEEEEE' }}
          >
            {CATEGORIES.map((c) => (
              <Picker.Item key={c} label={c} value={c} color="#EEEEEE" />
            ))}
          </Picker>
        </View>

        <Text style={{ color: '#EEEEEE', opacity: 0.9, marginTop: 8 }}>Location</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={location}
            onChangeText={setLocation}
            style={{ flex: 1, backgroundColor: '#3A4750', color: '#EEEEEE', borderColor: '#00ADB5', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
            placeholder="Enter location"
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            onPress={geocodeAddress}
            style={{ backgroundColor: '#0ea5e9', paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' }}
          >
            <Text style={{ color: '#EEEEEE' }}>Locate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled
            onPress={() => {}}
            style={{ backgroundColor: '#00ADB5', opacity: 0.4, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' }}
          >
            <Text style={{ color: '#EEEEEE' }}>Map</Text>
          </TouchableOpacity>
        </View>
        {pickedLocation?.latitude && pickedLocation?.longitude ? (
          <Text style={{ color: '#EEEEEE', opacity: 0.7 }}>
            Coords: {pickedLocation.latitude.toFixed(5)}, {pickedLocation.longitude.toFixed(5)}
          </Text>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <SaveButton onPress={onSave} label="Save" />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}


