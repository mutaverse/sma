import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, ChevronsUpDown, Smartphone } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FilterChips } from '@/components/ui/FilterChips';
import { SearchInput } from '@/components/ui/SearchInput';
import type { MomoTransactionType } from '@/constants/catalog';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { formatPesewas } from '@/lib/currency';
import { ACCRA_TIMEZONE } from '@/lib/dates';
import type { MomoTransaction } from '@/types/domain';

type TypeFilter = 'all' | MomoTransactionType;
type SortKey = 'time' | 'amount';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 8;

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cash_in', label: 'Cash in' },
  { value: 'cash_out', label: 'Cash out' },
  { value: 'airtime', label: 'Airtime' },
];

type MomoHistoryTableProps = {
  rows: MomoTransaction[];
  currencySymbol: string;
  onOpen: (transaction: MomoTransaction) => void;
};

export function MomoHistoryTable({ rows, currencySymbol, onOpen }: MomoHistoryTableProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = rows.filter((row) => {
      if (typeFilter !== 'all' && row.transactionType !== typeFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }

      const amount = formatPesewas(row.amountPesewas, currencySymbol).toLowerCase();
      const cedis = (row.amountPesewas / 100).toString();
      return (
        typeLabel(row.transactionType).toLowerCase().includes(needle) ||
        row.provider.toLowerCase().includes(needle) ||
        amount.includes(needle) ||
        cedis.includes(needle)
      );
    });

    return [...matched].sort((left, right) => {
      const result =
        sortKey === 'amount'
          ? left.amountPesewas - right.amountPesewas
          : `${left.transactionDate}T${left.createdAt}`.localeCompare(
              `${right.transactionDate}T${right.createdAt}`,
            );
      return sortDirection === 'asc' ? result : -result;
    });
  }, [currencySymbol, query, rows, sortDirection, sortKey, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setPage(0);
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'time' ? 'desc' : 'asc');
  }

  return (
    <View style={styles.table}>
      <SearchInput
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setPage(0);
        }}
        placeholder="Search type or amount"
      />
      <FilterChips
        options={TYPE_FILTERS}
        value={typeFilter}
        onChange={(value) => {
          setTypeFilter(value as TypeFilter);
          setPage(0);
        }}
      />
      <View style={styles.header}>
        <SortHeader label="Time" active={sortKey === 'time'} onPress={() => toggleSort('time')} />
        <SortHeader
          label="Amount"
          active={sortKey === 'amount'}
          align="right"
          onPress={() => toggleSort('amount')}
        />
      </View>

      {visible.length === 0 ? (
        <Text style={styles.empty}>
          {rows.length === 0 ? 'No transactions' : 'No matching transactions'}
        </Text>
      ) : (
        visible.map((transaction, index) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            currencySymbol={currencySymbol}
            first={index === 0}
            onPress={() => onOpen(transaction)}
          />
        ))
      )}

      <View style={styles.footer}>
        <Text style={styles.pageLabel}>
          {filtered.length === 0
            ? '0 transactions'
            : `${start + 1}–${start + visible.length} of ${filtered.length}`}
        </Text>
        <View style={styles.pager}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous page"
            disabled={currentPage === 0}
            onPress={() => setPage(currentPage - 1)}
            style={[styles.pageButton, currentPage === 0 ? styles.pageDisabled : null]}
          >
            <ChevronLeft size={18} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next page"
            disabled={currentPage >= pageCount - 1}
            onPress={() => setPage(currentPage + 1)}
            style={[styles.pageButton, currentPage >= pageCount - 1 ? styles.pageDisabled : null]}
          >
            <ChevronRight size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function typeLabel(type: MomoTransactionType): string {
  if (type === 'cash_in') return 'Cash in';
  if (type === 'cash_out') return 'Cash out';
  return 'Airtime';
}

function formatTransactionTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ACCRA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function SortHeader({
  label,
  active,
  align = 'left',
  onPress,
}: {
  label: string;
  active: boolean;
  align?: 'left' | 'right';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sort by ${label}`}
      onPress={onPress}
      style={[styles.sortHeader, align === 'right' ? styles.sortRight : null]}
    >
      <Text style={[styles.headerLabel, active ? styles.headerActive : null]}>{label}</Text>
      <ChevronsUpDown size={14} color={active ? colors.primary : colors.textSecondary} />
    </Pressable>
  );
}

function TransactionRow({
  transaction,
  currencySymbol,
  first,
  onPress,
}: {
  transaction: MomoTransaction;
  currencySymbol: string;
  first: boolean;
  onPress: () => void;
}) {
  const cashIn = transaction.transactionType === 'cash_in';
  const airtime = transaction.transactionType === 'airtime';
  const Icon = airtime ? Smartphone : cashIn ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${typeLabel(transaction.transactionType)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, first ? styles.firstRow : null, pressed ? styles.pressed : null]}
    >
      <View style={[styles.rowIcon, cashIn || airtime ? styles.cashInIcon : styles.cashOutIcon]}>
        <Icon size={18} color={cashIn || airtime ? colors.primary : colors.accentText} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{typeLabel(transaction.transactionType)}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {transaction.provider} · {formatTransactionTime(transaction.createdAt)}
        </Text>
      </View>
      <View style={styles.rowAmounts}>
        <Text style={styles.rowAmount}>{formatPesewas(transaction.amountPesewas, currencySymbol)}</Text>
        {transaction.feePesewas > 0 ? (
          <Text style={styles.rowFee}>+{formatPesewas(transaction.feePesewas, currencySymbol)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  table: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortHeader: {
    flex: 1,
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sortRight: {
    justifyContent: 'flex-end',
  },
  headerLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  headerActive: {
    color: colors.primary,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  firstRow: {
    borderTopWidth: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  rowIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  cashInIcon: {
    backgroundColor: colors.primaryMuted,
  },
  cashOutIcon: {
    backgroundColor: colors.accentMuted,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  rowMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  rowAmounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowAmount: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  rowFee: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.primary,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  footer: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pageLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  pager: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pageButton: {
    width: minTouchSize,
    height: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pageDisabled: {
    opacity: 0.4,
  },
});
