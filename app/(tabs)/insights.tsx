import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/insights/LineChart';
import { Card } from '@/components/ui/Card';
import { FilterChips } from '@/components/ui/FilterChips';
import { Spinner } from '@/components/ui/Spinner';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { loadInsightSources, type InsightSources } from '@/db/repositories/insights';
import { formatPesewas } from '@/lib/currency';
import { todayAccra } from '@/lib/dates';
import {
  buildCumulativeTrend,
  periodRange,
  periodTitle,
  serviceSummary,
  type InsightMetric,
  type InsightPeriod,
} from '@/lib/insights';
import { useAppStore } from '@/store/app-store';

const PERIODS: { value: InsightPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '15d', label: '15d' },
  { value: 'month', label: 'Month' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: 'year', label: 'Year' },
];

const METRICS: { value: InsightMetric; label: string }[] = [
  { value: 'sales', label: 'Sales' },
  { value: 'cashIn', label: 'Cash in' },
  { value: 'cashOut', label: 'Cash out' },
  { value: 'airtime', label: 'Airtime' },
  { value: 'commission', label: 'Commission' },
];

export default function InsightsScreen() {
  const db = useShopDatabase();
  const currencySymbol = useAppStore((state) => state.settings?.currencySymbol) ?? 'GH₵';
  const [period, setPeriod] = useState<InsightPeriod>('7d');
  const [metric, setMetric] = useState<InsightMetric>('sales');
  const [sources, setSources] = useState<InsightSources | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const range = periodRange(period, todayAccra());
      setLoading(true);
      void loadInsightSources(db, range)
        .then((next) => {
          if (!cancelled) setSources(next);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [db, period]),
  );

  if (!sources && loading) {
    return (
      <View style={[styles.flex, styles.loading]}>
        <Spinner />
      </View>
    );
  }

  const today = todayAccra();
  const range = periodRange(period, today);
  const daily = sources?.daily ?? [];
  const summaries = Object.fromEntries(
    METRICS.map((item) => [item.value, serviceSummary(daily, item.value, range)]),
  ) as Record<InsightMetric, ReturnType<typeof serviceSummary>>;
  const selected = METRICS.find((item) => item.value === metric) ?? METRICS[0];
  const selectedSummary = summaries[metric];
  const trend = buildCumulativeTrend(period, range, daily, metric);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>INSIGHTS</Text>
        <Text style={styles.title}>{periodTitle(period)}</Text>
      </View>

      <FilterChips
        options={PERIODS}
        value={period}
        onChange={(value) => setPeriod(value as InsightPeriod)}
      />

      <Card style={styles.chartCard}>
        <View style={styles.chartTop}>
          <View>
            <Text style={styles.chartLabel}>{selected.label} total</Text>
            <Text style={styles.chartValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatPesewas(selectedSummary.totalPesewas, currencySymbol)}
            </Text>
          </View>
          {loading ? <Spinner size={18} /> : null}
        </View>
        <Text style={styles.chartMeta}>
          {formatPesewas(selectedSummary.averagePesewas, currencySymbol)} / day
        </Text>
        <LineChart points={trend} currencySymbol={currencySymbol} />
      </Card>

      <View style={styles.group}>
        {METRICS.map((item, index) => (
          <MetricRow
            key={item.value}
            label={item.label}
            total={formatPesewas(summaries[item.value].totalPesewas, currencySymbol)}
            average={`${formatPesewas(summaries[item.value].averagePesewas, currencySymbol)} / day`}
            selected={metric === item.value}
            first={index === 0}
            onPress={() => setMetric(item.value)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function MetricRow({
  label,
  total,
  average,
  selected,
  first,
  onPress,
}: {
  label: string;
  total: string;
  average: string;
  selected: boolean;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.metricRow, first ? null : styles.metricDivider, selected ? styles.metricSelected : null]}
    >
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricAverage} numberOfLines={1}>
          {average}
        </Text>
      </View>
      <Text style={styles.metricTotal} numberOfLines={1}>
        {total}
      </Text>
    </Pressable>
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
    gap: spacing.xl,
    backgroundColor: colors.background,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
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
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
  },
  chartCard: {
    gap: spacing.sm,
    overflow: 'hidden',
  },
  chartTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  chartLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  chartValue: {
    marginTop: 2,
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 36,
    color: colors.text,
  },
  chartMeta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  metricRow: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  metricDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metricSelected: {
    backgroundColor: colors.primaryMuted,
  },
  metricCopy: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  metricTotal: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  metricAverage: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
