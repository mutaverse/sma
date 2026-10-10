import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmRow } from '@/components/products/ProductChrome';
import { SalesHistoryTable } from '@/components/sales/SalesHistoryTable';
import { Button } from '@/components/ui/Button';
import { CalendarPicker } from '@/components/ui/CalendarPicker';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { deleteDailySale, getDailySale, listDailySales, upsertDailySales } from '@/db/repositories/sales';
import {
  cedisStringFromPesewas,
  formatPesewas,
  pesewasFromCedisInput,
} from '@/lib/currency';
import {
  formatDisplayDate,
  formatLongDisplayDate,
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [existing, setExisting] = useState<DailySale | null>(null);
  const [history, setHistory] = useState<DailySale[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const savingRef = useRef(false);
  const loadRequest = useRef(0);

  const today = todayAccra();
  const parsedAmount = pesewasFromCedisInput(amount);

  const loadDate = useCallback(
    async (saleDate: string) => {
      const request = ++loadRequest.current;
      const [sale, days] = await Promise.all([getDailySale(db, saleDate), listDailySales(db)]);
      if (request !== loadRequest.current) {
        return;
      }
      setExisting(sale);
      setHistory(days);
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
    setSaved(false);
    setCalendarOpen(preset === 'other');
    if (preset === 'today') {
      setSelectedDate(todayAccra());
      return;
    }
    if (preset === 'yesterday') {
      setSelectedDate(yesterdayAccra());
    }
  }

  function openEntry() {
    setError(null);
    setSaved(false);
    setDatePreset('today');
    setSelectedDate(todayAccra());
    setCalendarOpen(false);
    setAmount('');
    setEntryOpen(true);
  }

  function closeEntry() {
    if (savingRef.current) {
      return;
    }
    setEntryOpen(false);
    setDeleteOpen(false);
    setCalendarOpen(false);
    setError(null);
    setAmount('');
  }

  async function handleDelete() {
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await deleteDailySale(db, selectedDate);
      setDeleteOpen(false);
      setEntryOpen(false);
      setAmount('');
      setSaved(true);
      await loadDate(selectedDate);
    } catch (caught) {
      setError(userMessage(caught, "We could not delete this day's sales. Please try again."));
      setDeleteOpen(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function openDay(saleDate: string) {
    const row = history.find((item) => item.saleDate === saleDate);
    setError(null);
    setSaved(false);
    setSelectedDate(saleDate);
    setAmount(row ? cedisStringFromPesewas(row.totalPesewas) : '');
    setEntryOpen(true);
    if (saleDate === todayAccra()) {
      setDatePreset('today');
      return;
    }
    if (saleDate === yesterdayAccra()) {
      setDatePreset('yesterday');
      return;
    }
    setDatePreset('other');
    setCalendarOpen(false);
  }

  async function persistSale(saleDate: string, totalSalesPesewas: number) {
    await upsertDailySales(db, { saleDate, totalSalesPesewas });
    setSelectedDate(saleDate);
    setAmount('');
    setSaved(true);
    setEntryOpen(false);
    setReplaceOpen(false);
    setPendingAmount(null);
    await loadDate(saleDate);
  }

  async function handleSave() {
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      if (!amount.trim()) {
        throw new Error("Enter the day's sales.");
      }
      if (parsedAmount === null) {
        throw new Error('Enter amount with up to 2 decimals.');
      }

      const saleDate = selectedDate;
      const current = await getDailySale(db, saleDate);
      if (current) {
        if (current.totalPesewas === parsedAmount) {
          setSaved(true);
          setAmount('');
          setEntryOpen(false);
          return;
        }
        setExisting(current);
        setPendingAmount(parsedAmount);
        setSelectedDate(saleDate);
        setReplaceOpen(true);
        return;
      }

      await persistSale(saleDate, parsedAmount);
    } catch (caught) {
      setError(userMessage(caught, "We could not save this day's sales. Please try again."));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function confirmReplace() {
    if (pendingAmount === null || savingRef.current) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await persistSale(selectedDate, pendingAmount);
    } catch (caught) {
      setError(userMessage(caught, "We could not save this day's sales. Please try again."));
      setReplaceOpen(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const editingSale = history.find((row) => row.saleDate === selectedDate) ?? null;

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <View>
            <Text style={styles.eyebrow}>SALES</Text>
            <Text style={styles.date}>{formatLongDisplayDate(today)}</Text>
          </View>
          {saved ? (
            <View style={styles.savedRow}>
              <Check size={18} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.saved}>Saved</Text>
            </View>
          ) : null}
        </View>

        <Button label="Record sales" icon={Plus} onPress={openEntry} />

        <View style={styles.history}>
          <SalesHistoryTable
            rows={history}
            currencySymbol={currencySymbol}
            onOpenDay={openDay}
          />
        </View>
      </ScrollView>

      <Modal
        visible={entryOpen && !replaceOpen && !deleteOpen}
        title={editingSale ? 'Edit sales' : 'Record sales'}
        onClose={closeEntry}
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
        <Text style={styles.sheetDate}>{formatLongDisplayDate(selectedDate)}</Text>
        <Input
          label={`Total sales (${currencySymbol})`}
          value={amount}
          onChangeText={(value) => {
            setAmount(value);
            setError(null);
            setSaved(false);
          }}
          keyboardType="decimal-pad"
          placeholder="0.00"
          style={styles.amount}
        />
        {datePreset === 'other' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose date"
            onPress={() => setCalendarOpen((open) => !open)}
            style={styles.dateField}
          >
            <Text style={styles.dateFieldLabel}>Date</Text>
            <Text style={styles.dateFieldValue}>{formatDisplayDate(selectedDate)}</Text>
          </Pressable>
        ) : null}
        {calendarOpen && datePreset === 'other' ? (
          <CalendarPicker
            value={selectedDate}
            maxDate={today}
            onChange={(date) => {
              setSelectedDate(date);
              setCalendarOpen(false);
              setError(null);
              setSaved(false);
            }}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={saving ? 'Saving…' : 'Save sales'}
          immediate
          onPress={() => {
            void handleSave();
          }}
          disabled={saving}
        />
        {editingSale ? (
          <Button
            label="Delete"
            variant="destructive"
            disabled={saving}
            onPress={() => setDeleteOpen(true)}
          />
        ) : null}
      </Modal>

      <Modal
        visible={replaceOpen}
        title="Replace this day?"
        onClose={() => {
          if (!saving) {
            setReplaceOpen(false);
          }
        }}
      >
        <Text style={styles.replaceCopy}>
          {formatDisplayDate(selectedDate)} already has{' '}
          {formatPesewas(existing?.totalPesewas ?? 0, currencySymbol)}. Replace it with{' '}
          {formatPesewas(pendingAmount ?? 0, currencySymbol)}?
        </Text>
        <ConfirmRow
          confirmLabel={saving ? 'Saving…' : 'Replace'}
          disabled={saving}
          onCancel={() => setReplaceOpen(false)}
          onConfirm={() => {
            void confirmReplace();
          }}
        />
      </Modal>

      <Modal
        visible={deleteOpen}
        title="Delete this day?"
        onClose={() => {
          if (!saving) {
            setDeleteOpen(false);
          }
        }}
      >
        <Text style={styles.replaceCopy}>
          {formatDisplayDate(selectedDate)} of{' '}
          {formatPesewas(editingSale?.totalPesewas ?? existing?.totalPesewas ?? 0, currencySymbol)} will
          be removed.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <ConfirmRow
          confirmLabel={saving ? 'Deleting…' : 'Delete'}
          destructive
          disabled={saving}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => {
            void handleDelete();
          }}
        />
      </Modal>
    </View>
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
  heading: {
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  date: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
  },
  sheetDate: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
  },
  dateField: {
    minHeight: minTouchSize,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    gap: 2,
  },
  dateFieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  dateFieldValue: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  amount: {
    minHeight: 64,
    fontFamily: fonts.bold,
    fontSize: 30,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  savedRow: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saved: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.primary,
  },
  history: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  replaceCopy: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
});
