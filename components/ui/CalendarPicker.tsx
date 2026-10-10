import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { addCalendarDays, formatDisplayDate } from '@/lib/dates';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type CalendarPickerProps = {
  value: string;
  maxDate?: string;
  onChange: (date: string) => void;
};

export function CalendarPicker({ value, maxDate, onChange }: CalendarPickerProps) {
  const [visibleMonth, setVisibleMonth] = useState(value.slice(0, 7));
  const [yearText, monthText] = visibleMonth.split('-');
  const year = Number.parseInt(yearText ?? '', 10);
  const month = Number.parseInt(monthText ?? '', 10);
  const days = monthDays(year, month);
  const maxMonth = maxDate?.slice(0, 7);

  function shiftMonth(amount: number) {
    const next = addCalendarMonths(visibleMonth, amount);
    if (maxMonth && next > maxMonth) {
      return;
    }
    setVisibleMonth(next);
  }

  return (
    <View style={styles.calendar}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => shiftMonth(-1)}
          style={styles.monthButton}
        >
          <ChevronLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTHS[month - 1]} {year}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          disabled={maxMonth !== undefined && visibleMonth >= maxMonth}
          onPress={() => shiftMonth(1)}
          style={[
            styles.monthButton,
            maxMonth !== undefined && visibleMonth >= maxMonth ? styles.monthDisabled : null,
          ]}
        >
          <ChevronRight size={18} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.weekdays}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.day} />;
          }
          const disabled = maxDate !== undefined && day > maxDate;
          const selected = day === value;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={formatDisplayDate(day)}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(day)}
              style={[styles.day, selected ? styles.daySelected : null]}
            >
              <Text
                style={[
                  styles.dayText,
                  selected ? styles.dayTextSelected : null,
                  disabled ? styles.dayTextDisabled : null,
                ]}
              >
                {Number.parseInt(day.slice(8, 10), 10)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function monthDays(year: number, month: number): (string | null)[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const [firstYear, firstMonth, firstDay] = first.split('-').map((part) => Number.parseInt(part, 10));
  const weekday = new Date(Date.UTC(firstYear, firstMonth - 1, firstDay)).getUTCDay();
  const leading = weekday === 0 ? 6 : weekday - 1;
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  let cursor = first;
  while (cursor.slice(0, 7) === first.slice(0, 7)) {
    cells.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return cells;
}

function addCalendarMonths(yearMonth: string, amount: number): string {
  const [year, month] = yearMonth.split('-').map((part) => Number.parseInt(part, 10));
  const next = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  calendar: {
    gap: spacing.sm,
  },
  monthRow: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: minTouchSize,
    height: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDisabled: {
    opacity: 0.35,
  },
  monthLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  daySelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  dayTextSelected: {
    color: colors.primaryForeground,
    fontFamily: fonts.semibold,
  },
  dayTextDisabled: {
    color: colors.textSecondary,
  },
});
