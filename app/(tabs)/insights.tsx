import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/components/insights/BarChart';
import { MetricBlock } from '@/components/products/ProductChrome';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FilterChips } from '@/components/ui/FilterChips';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { loadInsightSources, type InsightSources } from '@/db/repositories/insights';
import { formatPesewas } from '@/lib/currency';
import { formatIsoDateForDisplay, todayAccra } from '@/lib/dates';
import {
  buildTrend,
  calculateVsAveragePercent,
  detectCostMovers,
  formatCostChange,
  formatSignedPercent,
  isHighlightedCostChange,
  periodRange,
  periodTitle,
  periodTotals,
  pickWeekdayExtremes,
  rankProductMargins,
  salesInRange,
  trailingAveragePesewas,
  weekdayLabel,
  WEEKDAY_MIN_DAYS,
  type InsightPeriod,
} from '@/lib/insights';
import { formatMarginTenths } from '@/lib/calculations';
import { useAppStore } from '@/store/app-store';

const PERIODS: { value: InsightPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export default function InsightsScreen() {
  const db = useShopDatabase();
  const currencySymbol = useAppStore((state) => state.settings?.currencySymbol) ?? 'GH₵';
  const [period, setPeriod] = useState<InsightPeriod>('7d');
  const [sources, setSources] = useState<InsightSources | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadInsightSources(db).then((next) => {
        if (!cancelled) {
          setSources(next);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  if (!sources) {
    return <View style={styles.flex} />;
  }

  const today = todayAccra();
  const todaySale = sources.sales.find((sale) => sale.saleDate === today) ?? null;
  const average = trailingAveragePesewas(sources.sales, today);
  const vsAverage =
    todaySale && average !== null
      ? calculateVsAveragePercent(todaySale.totalPesewas, average)
      : null;
  const range = periodRange(period, today);
  const periodSales = salesInRange(sources.sales, range);
  const totals = periodTotals(periodSales);
  const extremes = pickWeekdayExtremes(periodSales);
  const trend = buildTrend(period, range, sources.sales);
  const margins = rankProductMargins(sources.products);
  const movers = detectCostMovers(sources.products, sources.costHistory);
  const weekdayRemaining = Math.max(0, WEEKDAY_MIN_DAYS - periodSales.length);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <FilterChips
        options={PERIODS}
        value={period}
        onChange={(value) => setPeriod(value as InsightPeriod)}
      />

      <View>
        <SectionHeader title="Today" />
        <View style={styles.stack}>
          <StatCard
            label="Today's sales"
            value={
              todaySale
                ? formatPesewas(todaySale.totalPesewas, currencySymbol)
                : `${currencySymbol} —`
            }
            hint={todaySale ? undefined : 'Record the close on the Sales tab.'}
            accent
          />
          <View style={styles.grid}>
            <Card style={styles.gridCard}>
              <MetricBlock
                label="Average day"
                value={average === null ? '—' : formatPesewas(average, currencySymbol)}
              />
              <Text style={styles.caption}>Last 30 days you recorded, not including today.</Text>
            </Card>
            <Card style={styles.gridCard}>
              <MetricBlock
                label="vs average"
                value={vsAverage === null ? '—' : formatSignedPercent(vsAverage)}
              />
            </Card>
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title={periodTitle(period)} />
        {totals.recordedDays === 0 ? (
          <Text style={styles.body}>No closing totals in this period yet.</Text>
        ) : (
          <View style={styles.stack}>
            <StatCard
              label="Sales"
              value={formatPesewas(totals.totalPesewas, currencySymbol)}
              hint={`${totals.recordedDays} recorded ${totals.recordedDays === 1 ? 'day' : 'days'}`}
            />
            <Card>
              <MetricBlock
                label="Average / day"
                value={
                  totals.averagePesewas === null
                    ? '—'
                    : formatPesewas(totals.averagePesewas, currencySymbol)
                }
              />
            </Card>
            {extremes ? (
              <View style={styles.grid}>
                <Card style={styles.gridCard}>
                  <MetricBlock label="Busiest weekday" value={weekdayLabel(extremes.best.weekday)} />
                  <Text style={styles.caption}>
                    {formatPesewas(extremes.best.averagePesewas, currencySymbol)} average
                  </Text>
                </Card>
                <Card style={styles.gridCard}>
                  <MetricBlock
                    label="Quietest weekday"
                    value={weekdayLabel(extremes.lowest.weekday)}
                  />
                  <Text style={styles.caption}>
                    {formatPesewas(extremes.lowest.averagePesewas, currencySymbol)} average
                  </Text>
                </Card>
              </View>
            ) : (
              <Text style={styles.body}>
                {periodSales.length < WEEKDAY_MIN_DAYS
                  ? `${weekdayRemaining} more recorded ${weekdayRemaining === 1 ? 'day' : 'days'} and we'll name the busiest and quietest weekdays.`
                  : 'Not enough different weekdays yet to name a busiest and quietest day.'}
              </Text>
            )}
            {trend.some((point) => point.totalPesewas > 0) ? (
              <Card>
                <Text style={styles.chartLabel}>Sales</Text>
                <BarChart points={trend} />
              </Card>
            ) : null}
          </View>
        )}
      </View>

      <View>
        <SectionHeader title="Top margins" />
        {margins.length === 0 ? (
          <Text style={styles.body}>
            Add a selling price and cost on products to see margins here.
          </Text>
        ) : (
          <Card>
            {margins.map((row, index) => (
              <View key={row.productId} style={[styles.row, index === 0 ? styles.rowFirst : null]}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={styles.rowValue}>{formatMarginTenths(row.marginTenths)}</Text>
              </View>
            ))}
          </Card>
        )}
      </View>

      <View>
        <SectionHeader title="Cost changes" />
        {movers.length === 0 ? (
          <Text style={styles.body}>
            Cost changes will show here after a purchase with a new unit cost.
          </Text>
        ) : (
          <Card>
            {movers.map((row, index) => (
              <View
                key={`${row.productId}-${row.recordedAt}`}
                style={[styles.mover, index === 0 ? styles.rowFirst : null]}
              >
                <View style={styles.moverTop}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {row.productName}
                  </Text>
                  <Badge
                    label={formatCostChange(row.changeTenths)}
                    variant={isHighlightedCostChange(row.changeTenths) ? 'accent' : 'neutral'}
                  />
                </View>
                <Text style={styles.caption}>
                  {formatPesewas(row.previousCostPesewas, currencySymbol)} →{' '}
                  {formatPesewas(row.currentCostPesewas, currencySymbol)}
                  {' · '}
                  {formatIsoDateForDisplay(row.recordedAt)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
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
    gap: spacing.xxl,
    backgroundColor: colors.background,
  },
  stack: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridCard: {
    flex: 1,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chartLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  rowName: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  rowValue: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  mover: {
    gap: 4,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  moverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
