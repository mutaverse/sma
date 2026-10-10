import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SearchInput } from '@/components/ui/SearchInput';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { formatPesewas } from '@/lib/currency';
import { formatDisplayDate, todayAccra } from '@/lib/dates';
import type { DailySale } from '@/types/domain';

type SortKey = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 8;

type SalesHistoryTableProps = {
  rows: DailySale[];
  currencySymbol: string;
  onOpenDay: (saleDate: string) => void;
};

export function SalesHistoryTable({ rows, currencySymbol, onOpenDay }: SalesHistoryTableProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const today = todayAccra();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? rows.filter((row) => {
          const date = formatDisplayDate(row.saleDate).toLowerCase();
          const amount = formatPesewas(row.totalPesewas, currencySymbol).toLowerCase();
          return date.includes(needle) || amount.includes(needle) || row.saleDate.includes(needle);
        })
      : rows;

    return [...matched].sort((left, right) => {
      const result =
        sortKey === 'date'
          ? left.saleDate.localeCompare(right.saleDate)
          : left.totalPesewas - right.totalPesewas;
      return sortDirection === 'asc' ? result : -result;
    });
  }, [currencySymbol, query, rows, sortDirection, sortKey]);

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
    setSortDirection(key === 'date' ? 'desc' : 'asc');
  }

  return (
    <View style={styles.table}>
      <SearchInput
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setPage(0);
        }}
        placeholder="Search days"
      />

      <View style={styles.header}>
        <SortHeader
          label="Date"
          active={sortKey === 'date'}
          onPress={() => toggleSort('date')}
        />
        <SortHeader
          label="Amount"
          active={sortKey === 'amount'}
          align="right"
          onPress={() => toggleSort('amount')}
        />
      </View>

      {visible.length === 0 ? (
        <Text style={styles.empty}>{rows.length === 0 ? 'Saved days appear here.' : 'No matching days.'}</Text>
      ) : (
        visible.map((row) => {
          const isToday = row.saleDate === today;
          return (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={`${formatDisplayDate(row.saleDate)}, ${formatPesewas(row.totalPesewas, currencySymbol)}`}
              onPress={() => onOpenDay(row.saleDate)}
              style={({ pressed }) => [
                styles.row,
                isToday ? styles.todayRow : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.dateCell}>
                <Text style={styles.date}>{formatDisplayDate(row.saleDate)}</Text>
                {isToday ? <Text style={styles.today}>Today</Text> : null}
              </View>
              <Text style={styles.amount}>{formatPesewas(row.totalPesewas, currencySymbol)}</Text>
            </Pressable>
          );
        })
      )}

      <View style={styles.footer}>
        <Text style={styles.pageLabel}>
          {filtered.length === 0
            ? '0 days'
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
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  todayRow: {
    backgroundColor: colors.primaryMuted,
    borderBottomWidth: 0,
  },
  dateCell: {
    flex: 1,
    gap: 2,
  },
  date: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  today: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.primary,
  },
  amount: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
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
  pressed: {
    opacity: 0.7,
  },
});
