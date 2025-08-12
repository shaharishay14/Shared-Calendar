import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// import { Calendar } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllEventsSorted, deleteEvent, supabase, HOUSEHOLD_ID, SUPABASE_ENABLED } from '../database/db';
import FloatingNewButton from '../components/FloatingNewButton';
import EventCard from '../components/EventCard';
import CustomCalendar from '../components/CustomCalendar';

const CATEGORY_COLORS = {
  Work: '#3b82f6',
  Personal: '#10b981',
  Study: '#f59e0b',
  Other: '#6b7280',
};

function getLocalDateKey(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildMarkedDates(events) {
  const byDate = events.reduce((acc, evt) => {
    const dateKey = getLocalDateKey(evt.date); // YYYY-MM-DD in local time
    const color = CATEGORY_COLORS[evt.category] || CATEGORY_COLORS.Other;
    if (!acc[dateKey]) acc[dateKey] = { dots: [] };
    const alreadyHasColor = acc[dateKey].dots.some((d) => d.color === color);
    if (!alreadyHasColor) acc[dateKey].dots.push({ color });
    return acc;
  }, {});
  return byDate;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD format
  const listRef = useRef(null);
  const lastOffsetRef = useRef(0);
  const prevSelectedDateRef = useRef(selectedDate);
const isUserScrollingRef = useRef(false);
const pendingRowsRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [calHeight, setCalHeight] = useState(320);

  // Filter events based on selected date
  const filteredEvents = useMemo(() =>
    events
      .filter((event) => getLocalDateKey(event.date) === selectedDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  , [events, selectedDate]);

  const scrollOffsetRef = useRef(0);

  const safeSetEvents = useCallback((rows) => {
    const newStr = JSON.stringify(rows);
    const oldStr = JSON.stringify(events);
    if (newStr !== oldStr) {
      setEvents(rows);
      setMarkedDates(buildMarkedDates(rows));
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset?.({ offset: scrollOffsetRef.current, animated: false });
      });
    }
  }, [events]);

  const loadEvents = useCallback(() => {
    getAllEventsSorted(
      (rows) => {
        if (isUserScrollingRef.current) {
          pendingRowsRef.current = rows;
        } else {
          safeSetEvents(rows);
        }
      },
      () => {}
    );
  }, [safeSetEvents]);

  useEffect(() => {
    loadEvents();
    if (SUPABASE_ENABLED && supabase) {
      // Realtime updates from Supabase
      const channel = supabase
        .channel('events-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `householdId=eq.${HOUSEHOLD_ID}` }, () => {
          loadEvents();
        })
        .subscribe();
      return () => {
        try { supabase.removeChannel(channel); } catch {}
      };
    }
  }, [loadEvents]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  // Preserve scroll offset across harmless re-renders (e.g., realtime refresh) when date didn't change
  useEffect(() => {
    if (prevSelectedDateRef.current === selectedDate) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset?.({ offset: lastOffsetRef.current, animated: false });
      });
    } else {
      prevSelectedDateRef.current = selectedDate;
      lastOffsetRef.current = 0;
      requestAnimationFrame(() => listRef.current?.scrollToOffset?.({ offset: 0, animated: false }));
    }
  }, [filteredEvents, selectedDate]);

  const renderEvent = ({ item }) => (
    <EventCard
      event={item}
      onEdit={(evt) => {
        if (evt?.mode === 'info') {
          navigation.navigate('EventInfo', { event: item });
        } else {
          navigation.navigate('EditEvent', { event: evt });
        }
      }}
      onDelete={async (evt) => {
        await deleteEvent(evt.id, () => loadEvents());
      }}
    />
  );

  return (
    <LinearGradient
      colors={["#212121", "#212121"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Overlay calendar at the top; list scrolls under it */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <View
          className="mx-4 mt-3 rounded-2xl"
          onLayout={(e) => setCalHeight(e.nativeEvent.layout.height || 320)}
          style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
        >
          <CustomCalendar
            selectedDate={selectedDate}
            onSelectDate={(dateKey) => {
              if (dateKey !== selectedDate) setSelectedDate(dateKey);
            }}
            eventsByDate={markedDates}
            backgroundColor="#212121"
            textColor="#EEEEEE"
            accentColor="#00ADB5"
          />
        </View>
      </View>

      <View className="flex-1">
        <FlatList
          ref={listRef}
          data={filteredEvents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEvent}
          ListHeaderComponent={() => (
            <>
              {/* Spacer equal to calendar height so list starts below it */}
              <View style={{ height: calHeight }} />
              <View className="px-4 py-3" style={{ backgroundColor: '#212121', alignItems: 'center' }}>
                <Text className="text-lg font-semibold" style={{ color: '#EEEEEE', textAlign: 'center' }}>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text className="text-sm mt-1" style={{ color: '#EEEEEE', opacity: 0.85, textAlign: 'center' }}>
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
                </Text>
              </View>
            </>
          )}
          ListEmptyComponent={() => (
            <View className="flex-1 justify-center items-center p-8">
              <Text className="text-center text-lg" style={{ color: 'rgba(255,255,255,0.85)', width: '100%', textAlign: 'center' }}>
                No events scheduled for this date
              </Text>
              <Text className="text-center mt-3" style={{ color: 'rgba(255,255,255,0.6)', width: '100%', textAlign: 'center' }}>
                Tap the New button to add an event
              </Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 160, paddingTop: 12, gap: 12 }}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScroll={(e) => { const y = e.nativeEvent.contentOffset.y; scrollOffsetRef.current = y; setShowScrollTop(y > 300); }}
          onScrollBeginDrag={() => { isUserScrollingRef.current = true; }}
          onMomentumScrollEnd={() => {
            isUserScrollingRef.current = false;
            if (pendingRowsRef.current) {
              safeSetEvents(pendingRowsRef.current);
              pendingRowsRef.current = null;
            }
          }}
          onScrollEndDrag={() => {
            isUserScrollingRef.current = false;
            if (pendingRowsRef.current) {
              safeSetEvents(pendingRowsRef.current);
              pendingRowsRef.current = null;
            }
          }}
          scrollEventThrottle={16}
        />
      </View>

      <FloatingNewButton onPress={() => navigation.navigate('AddEvent')} />
      {showScrollTop && (
        <TouchableOpacity
          onPress={() => listRef.current?.scrollToOffset?.({ offset: 0, animated: true })}
          style={{ position: 'absolute', right: 16, bottom: 96, width: 44, height: 44, borderRadius: 22, backgroundColor: '#00ADB5', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
          accessibilityLabel="Scroll to top"
        >
          <Text style={{ color: '#EEEEEE', fontSize: 20 }}>↑</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}


