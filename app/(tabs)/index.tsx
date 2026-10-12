import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { MomoHistoryTable } from '@/components/momo/MomoHistoryTable';
import { ConfirmRow } from '@/components/products/ProductChrome';
import { Button } from '@/components/ui/Button';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-inset';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import {
  MOMO_PROVIDERS,
  type MomoProvider,
  type MomoTransactionType,
} from '@/constants/catalog';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import {
  deleteMomoTransaction,
  getMomoDayTotals,
  listMomoTransactions,
  recordMomoTransaction,
  updateMomoTransaction,
  type MomoDayTotals,
} from '@/db/repositories/momo';
import { cedisStringFromPesewas, formatPesewas, pesewasFromCedisInput } from '@/lib/currency';
import { todayAccra } from '@/lib/dates';
import { calculateMomoCommission } from '@/lib/momo';
import { userMessage } from '@/lib/errors';
import { useAppStore } from '@/store/app-store';
import type { MomoTransaction } from '@/types/domain';

const TRANSACTION_TYPES = [
  { value: 'cash_in', label: 'Cash in' },
  { value: 'cash_out', label: 'Cash out' },
  { value: 'airtime', label: 'Airtime' },
] as const;

const EMPTY_TOTALS: MomoDayTotals = {
  cashInPesewas: 0,
  cashOutPesewas: 0,
  airtimePesewas: 0,
  feePesewas: 0,
  count: 0,
};

export default function MomoScreen() {
  const db = useShopDatabase();
  const currencySymbol = useAppStore((state) => state.settings?.currencySymbol) ?? 'GH₵';
  const [transactions, setTransactions] = useState<MomoTransaction[]>([]);
  const [totals, setTotals] = useState<MomoDayTotals>(EMPTY_TOTALS);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<MomoTransaction | null>(null);
  const [transactionType, setTransactionType] = useState<MomoTransactionType>('cash_in');
  const [provider, setProvider] = useState<MomoProvider>('MTN');
  const [amount, setAmount] = useState('');
  const [customCommission, setCustomCommission] = useState(false);
  const [manualCommission, setManualCommission] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const amountPesewas = pesewasFromCedisInput(amount);
  const calculatedCommission =
    amountPesewas && amountPesewas > 0
      ? calculateMomoCommission(transactionType, amountPesewas)
      : null;

  const load = useCallback(async () => {
    const today = todayAccra();
    const [rows, dayTotals] = await Promise.all([
      listMomoTransactions(db, 300),
      getMomoDayTotals(db, today),
    ]);
    setTransactions(rows);
    setTotals(dayTotals);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function resetForm() {
    setEditing(null);
    setTransactionType('cash_in');
    setProvider('MTN');
    setAmount('');
    setCustomCommission(false);
    setManualCommission('');
    setError(null);
    setDeleteOpen(false);
  }

  function openNew() {
    resetForm();
    setSaved(false);
    setFormOpen(true);
  }

  function openTransaction(transaction: MomoTransaction) {
    const calculated = calculateMomoCommission(transaction.transactionType, transaction.amountPesewas);
    const custom = transaction.feePesewas !== calculated;
    setEditing(transaction);
    setTransactionType(transaction.transactionType);
    setProvider(transaction.provider);
    setAmount(cedisStringFromPesewas(transaction.amountPesewas));
    setCustomCommission(custom);
    setManualCommission(custom ? cedisStringFromPesewas(transaction.feePesewas) : '');
    setError(null);
    setSaved(false);
    setFormOpen(true);
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (amountPesewas === null || amountPesewas <= 0) {
        throw new Error('Enter an amount greater than zero.');
      }

      const manualPesewas = customCommission ? pesewasFromCedisInput(manualCommission) : null;
      if (customCommission && manualPesewas === null) {
        throw new Error('Enter the commission.');
      }

      const payload = {
        transactionType,
        provider,
        amountPesewas,
        feePesewas: manualPesewas ?? calculateMomoCommission(transactionType, amountPesewas),
        transactionDate: editing?.transactionDate ?? todayAccra(),
      };
      if (editing) {
        await updateMomoTransaction(db, editing.id, payload);
      } else {
        await recordMomoTransaction(db, payload);
      }

      resetForm();
      setFormOpen(false);
      setSaved(true);
      await load();
    } catch (caught) {
      setError(userMessage(caught, 'We could not save this transaction. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await deleteMomoTransaction(db, editing.id);
      resetForm();
      setFormOpen(false);
      setSaved(true);
      await load();
    } catch (caught) {
      setError(userMessage(caught, 'We could not delete this transaction. Please try again.'));
      setDeleteOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardDismissMode="on-drag"
    >
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>MOMO</Text>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.subtitle}>
          {totals.count} {totals.count === 1 ? 'transaction' : 'transactions'}
        </Text>
      </View>

      <View style={styles.group}>
        <SummaryRow label="Cash in" value={formatPesewas(totals.cashInPesewas, currencySymbol)} first />
        <SummaryRow label="Cash out" value={formatPesewas(totals.cashOutPesewas, currencySymbol)} />
        <SummaryRow label="Airtime" value={formatPesewas(totals.airtimePesewas, currencySymbol)} />
        <SummaryRow label="Commission" value={formatPesewas(totals.feePesewas, currencySymbol)} />
      </View>

      {saved ? (
        <View style={styles.savedRow}>
          <Check size={18} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.saved}>Saved</Text>
        </View>
      ) : null}
      <Button label="New transaction" icon={Plus} onPress={openNew} />

      <Modal
        visible={formOpen && !deleteOpen}
        title={editing ? 'Edit transaction' : 'New transaction'}
        onClose={() => {
          if (!saving) {
            resetForm();
            setFormOpen(false);
          }
        }}
      >
        <Tabs
          value={transactionType}
          options={TRANSACTION_TYPES}
          onValueChange={setTransactionType}
        />
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Provider</Text>
          <ChoiceChips
            options={MOMO_PROVIDERS.map((item) => ({ value: item, label: item }))}
            value={provider}
            onChange={setProvider}
          />
        </View>
        <Input
          label={`Amount (${currencySymbol})`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <View style={styles.commissionRow}>
          <Text style={styles.fieldLabel}>Commission</Text>
          <Text style={styles.commissionValue}>
            {customCommission
              ? 'Custom'
              : calculatedCommission === null
                ? `${currencySymbol} —`
                : formatPesewas(calculatedCommission, currencySymbol)}
          </Text>
        </View>
        <Button
          label={customCommission ? 'Use calculated' : 'Custom commission'}
          variant="secondary"
          onPress={() => setCustomCommission((current) => !current)}
        />
        {customCommission ? (
          <Input
            label={`Commission (${currencySymbol})`}
            value={manualCommission}
            onChangeText={setManualCommission}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={saving ? 'Saving…' : 'Save transaction'}
          onPress={() => {
            void handleSave();
          }}
          disabled={saving || !amount.trim()}
        />
        {editing ? (
          <Button
            label="Delete"
            variant="destructive"
            disabled={saving}
            onPress={() => setDeleteOpen(true)}
          />
        ) : null}
      </Modal>

      <Modal
        visible={deleteOpen}
        title="Delete this transaction?"
        onClose={() => {
          if (!saving) {
            setDeleteOpen(false);
          }
        }}
      >
        <Text style={styles.replaceCopy}>
          {editing
            ? `${formatPesewas(editing.amountPesewas, currencySymbol)} ${editing.provider} will be removed.`
            : 'This transaction will be removed.'}
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

      <View style={styles.history}>
        <MomoHistoryTable rows={transactions} currencySymbol={currencySymbol} onOpen={openTransaction} />
      </View>
    </KeyboardAwareScrollView>
  );
}

function SummaryRow({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.summaryRow, first ? styles.summaryFirst : null]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  heading: {
    gap: spacing.xs,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  summaryFirst: {
    borderTopWidth: 0,
  },
  summaryRow: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summaryLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  summaryValue: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  commissionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  commissionValue: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.primary,
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
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
  },
  replaceCopy: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
});
