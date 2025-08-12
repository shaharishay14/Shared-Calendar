import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatDateYMD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CustomCalendar({
  selectedDate,
  onSelectDate,
  eventsByDate = {},
  backgroundColor = '#212121',
  textColor = '#EEEEEE',
  accentColor = '#00ADB5',
}) {
  const initial = selectedDate ? new Date(selectedDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const monthMatrix = useMemo(() => {
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7; // make Monday=0 if needed; keeping Sunday=0? We'll use Sunday=0
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay()); // start from Sunday

    const weeks = [];
    for (let w = 0; w < 6; w += 1) {
      const week = [];
      for (let d = 0; d < 7; d += 1) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + w * 7 + d);
        week.push(day);
      }
      weeks.push(week);
    }
    return weeks;
  }, [currentMonth]);

  const dayCellSize = Math.floor((SCREEN_WIDTH - 32 - 12) / 7); // padding 16 each side and gaps
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isSameMonth = (date) => date.getMonth() === currentMonth.getMonth();

  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
  const isSelectedDate = (date) => selectedDateObj && formatDateYMD(date) === formatDateYMD(selectedDateObj);

  return (
    <View
      style={{
        backgroundColor,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 12,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 6 }}
        >
          <MaterialIcons name="chevron-left" size={22} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
            {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 6 }}
        >
          <MaterialIcons name="chevron-right" size={22} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Weekday headings */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 4 }}>
        {weekdays.map((wd) => (
          <Text key={wd} style={{ width: dayCellSize, textAlign: 'center', color: textColor, opacity: 0.8, fontSize: 12 }}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Grid */}
      <View>
        {monthMatrix.map((week, wi) => (
          <View key={wi} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 4 }}>
            {week.map((date) => {
              const inMonth = isSameMonth(date);
              const isSelected = isSelectedDate(date);
              const dateKey = formatDateYMD(date);
              const hasEvent = !!eventsByDate[dateKey];

              return (
                <TouchableOpacity
                  key={dateKey}
                  onPress={() => onSelectDate?.(dateKey)}
                  style={{
                    width: dayCellSize,
                    height: dayCellSize,
                    borderRadius: dayCellSize / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? accentColor : 'transparent',
                  }}
                >
                  <Text style={{ color: isSelected ? '#212121' : textColor, opacity: inMonth ? 1 : 0.4 }}>
                    {date.getDate()}
                  </Text>
                  {hasEvent && !isSelected ? (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accentColor, marginTop: 3 }} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}


