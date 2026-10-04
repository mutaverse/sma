import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FieldLabel } from '@/components/products/ProductChrome';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Input } from '@/components/ui/Input';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors } from '@/constants/colors';
import { minTouchSize, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { getDailySale, listDailySales, upsertDailySales } from '@/db/repositories/sales';
import {
  cedisStringFromPesewas,
  formatPesewas,
  pesewasFromCedisInput,
} from '@/lib/currency';
import {
  formatDayMonthYear,
  formatDisplayDate,
  formatLongDisplayDate,
  parseShopDate,
  todayAccra,
  yesterdayAccra,
} from '@/lib/dates';
import { userMessage } from '@/lib/errors';
import { useAppStore } from '@/store/app-store';
import type { DailySale } from '@/types/domain';

type DatePreset = 'today' | 'yesterday' | 'other';

export default function SalesScreen() {
  const db = useShopDatabase();
  const currencySymbol = useAppStore((state) => state.settings?.currencySymbol) ?? 'GH₵';
  const [selectedDate, setSelectedDate] = useState(() => todayAccra());
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [otherDate, setOtherDate] = useState('');
  const [amount, setAmount] = useState('');
  const [existing, setExisting] = useState<DailySale | null>(null);
  const [history, setHistory] = useState<DailySale[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const today = todayAccra();
  const parsedAmount = pesewasFromCedisInput(amount);
  const pastDays = history.filter((row) => row.saleDate !== selectedDate);

  const loadDate = useCallback(
    async (saleDate: string) => {
      const [sale, days] = await Promise.all([getDailySale(db, saleDate), listDailySales(db)]);
      setExisting(sale);
      setHistory(days);
      setAmount(sale ? cedisStringFromPesewas(sale.totalPesewas) : '');
    },
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void loadDate(selectedDate).then(() => {
        if (cancelled) {
          return;
        }
        setError(null);
      });

      return () => {
        cancelled = true;
      };
    }, [loadDate, selectedDate]),
  );

  function applyPreset(preset: DatePreset) {
    setDatePreset(preset);
    setError(null);
    setSaved(null);
    if (preset === 'today') {
      setSelectedDate(todayAccra());
      return;
    }
    if (preset === 'yesterday') {
      setSelectedDate(yesterdayAccra());
      return;
    }
    setOtherDate(formatDayMonthYear(selectedDate));
  }

  function applyOtherDate(value: string) {
    setOtherDate(value);
    setError(null);
    setSaved(null);
    try {
      setSelectedDate(parseShopDate(value));
    } catch {
      // Keep typing until the date is complete.
    }
  }

  function openDay(saleDate: string) {
    setError(null);
    setSaved(null);
    setSelectedDate(saleDate);
    if (saleDate === todayAccra()) {
      setDatePreset('today');
      return;
    }
    if (saleDate === yesterdayAccra()) {
      setDatePreset('yesterday');
      return;
    }
    setDatePreset('other');
    setOtherDate(formatDayMonthYear(saleDate));
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(null);

    try {
      if (!amount.trim()) {
        throw new Error("Enter the day's sales.");
      }
      if (parsedAmount === null) {
        throw new Error('Enter a valid amount in cedis, up to two decimal places.');
      }

      const saleDate =
        datePreset === 'other' && otherDate.trim() ? parseShopDate(otherDate) : selectedDate;

      await upsertDailySales(db, {
        saleDate,
        totalSalesPesewas: parsedAmount,
      });
      setSelectedDate(saleDate);
      await loadDate(saleDate);
      setSaved(
        saleDate === todayAccra()
          ? existing
            ? "Today's sales updated."
            : "Today's sales saved."
          : `Saved for ${formatDisplayDate(saleDate)}.`,
      );
    } catch (caught) {
      setError(userMessage(caught, "We could not save this day's sales. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const isToday = selectedDate === today;
  const buttonLabel = existing
    ? isToday
      ? "Update today's sales"
      : 'Update sales'
    : 'Save sales';
  const unchanged = existing !== null && parsedAmount === existing.totalPesewas;
  const canSave = parsedAmount !== null && !unchanged && !saving;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ChoiceChips
          options={[
            { value: 'today' as const, label: 'Today' },
            { value: 'yesterday' as const, label: 'Yesterday' },
            { value: 'other' as const, label: 'Other' },
          ]}
          value={datePreset}
          onChange={applyPreset}
        />

        <Text style={styles.date}>{formatLongDisplayDate(selectedDate)}</Text>
        {isToday ? null : <Text style={styles.notToday}>Closing a different day.</Text>}

        <Text style={styles.preview}>
          {parsedAmount === null ? `${currencySymbol} —` : formatPesewas(parsedAmount, currencySymbol)}
        </Text>

        <Input
          label="Total sales"
          value={amount}
          onChangeText={(value) => {
            setAmount(value);
            setError(null);
            setSaved(null);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          style={styles.amount}
        />

        {datePreset === 'other' ? (
          <FieldLabel label="Date">
            <Input
              value={otherDate}
              onChangeText={applyOtherDate}
              placeholder="16/09/2026"
              keyboardType="numbers-and-punctuation"
            />
          </FieldLabel>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.saved}>{saved}</Text> : null}

        <Button
          label={saving ? 'Saving…' : buttonLabel}
          onPress={() => {
            void handleSave();
          }}
          disabled={!canSave}
        />

        <View style={styles.history}>
          <SectionHeader title="Past days" />
          {pastDays.length === 0 ? (
            <Text style={styles.empty}>
              Past evenings will show here. Tap one to change that day's total.
            </Text>
          ) : (
            pastDays.map((row) => (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={`${formatDisplayDate(row.saleDate)}, ${formatPesewas(row.totalPesewas, currencySymbol)}`}
                onPress={() => openDay(row.saleDate)}
                style={({ pressed }) => [styles.dayRow, pressed ? styles.pressed : null]}
              >
                <Text style={styles.dayDate}>{formatDisplayDate(row.saleDate)}</Text>
                <Text style={styles.dayAmount}>
                  {formatPesewas(row.totalPesewas, currencySymbol)}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  date: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.text,
  },
  notToday: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  preview: {
    fontFamily: fonts.bold,
    fontSize: 40,
    lineHeight: 48,
    color: colors.primary,
  },
  amount: {
    minHeight: 64,
    fontFamily: fonts.semibold,
    fontSize: 28,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  saved: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  history: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  dayRow: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dayDate: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  dayAmount: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
});
