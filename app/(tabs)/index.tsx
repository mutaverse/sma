import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Banknote, Plus, ShoppingCart } from 'lucide-react-native';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsGear } from '@/components/navigation/SettingsGear';
import { ProductResults } from '@/components/products/ProductResults';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SyncStatusChip } from '@/components/ui/SyncStatusChip';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { countActiveProducts, listRecentlyViewedProducts } from '@/db/repositories/products';
import { getDailySale } from '@/db/repositories/sales';
import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { formatPesewas } from '@/lib/currency';
import { greetingForHour } from '@/lib/greeting';
import { hourInAccra, todayAccra } from '@/lib/dates';
import { useAppStore } from '@/store/app-store';
import { useSyncStore } from '@/store/sync-store';
import type { DailySale, Product } from '@/types/domain';

export default function HomeScreen() {
  const router = useRouter();
  const db = useShopDatabase();
  const settings = useAppStore((state) => state.settings);
  const syncStatus = useSyncStore((state) => state.status);
  const businessName = settings?.businessName ?? 'Shop';
  const currencySymbol = settings?.currencySymbol ?? 'GH₵';
  const [query, setQuery] = useState('');
  const [todaySale, setTodaySale] = useState<DailySale | null>(null);
  const [recents, setRecents] = useState<Product[]>([]);
  const [productCount, setProductCount] = useState(0);
  const greeting = greetingForHour(hourInAccra());
  const { products, searching, ready, activeQuery } = useCatalogSearch(query);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const [sale, viewed, count] = await Promise.all([
          getDailySale(db, todayAccra()),
          listRecentlyViewedProducts(db, 8),
          countActiveProducts(db),
        ]);
        if (!cancelled) {
          setTodaySale(sale);
          setRecents(viewed);
          setProductCount(count);
        }
      }

      void load();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.top}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.shopName}>{businessName}</Text>
          </View>
          <View style={styles.topActions}>
            {syncStatus === 'offline' ? <SyncStatusChip /> : null}
            <SettingsGear />
          </View>
        </View>

        <SearchInput
          value={query}
          onChangeText={setQuery}
          autoFocus={Platform.OS !== 'web'}
        />

        {searching ? (
          <ProductResults
            products={products}
            searching
            query={activeQuery || query.trim()}
            currencySymbol={currencySymbol}
            ready={ready}
          />
        ) : null}

        <StatCard
          label="Today's sales"
          value={
            todaySale ? formatPesewas(todaySale.totalPesewas, currencySymbol) : `${currencySymbol} —`
          }
          hint={todaySale ? 'Tap to update today.' : "Tap to record today's total."}
          accent
          onPress={() => router.push('/(tabs)/sales')}
        />

        <View>
          <SectionHeader title="Quick actions" />
          <View style={styles.actions}>
            <Button
              label="Add purchase"
              icon={ShoppingCart}
              onPress={() => router.push('/purchases/add')}
            />
            <Button
              label="Record sales"
              variant="secondary"
              icon={Banknote}
              onPress={() => router.push('/(tabs)/sales')}
            />
            <Button
              label="Add product"
              variant="ghost"
              icon={Plus}
              onPress={() => router.push('/products/add')}
            />
          </View>
        </View>

        {searching ? null : recents.length > 0 ? (
          <ProductResults
            products={recents}
            searching={false}
            query=""
            currencySymbol={currencySymbol}
            ready
            resultsTitle="Recent products"
          />
        ) : productCount === 0 ? (
          <EmptyState
            title="No products yet"
            body="Add one now, or import the price list from Settings so you can look up prices while a customer waits."
            action={
              <View style={styles.actions}>
                <Button label="Add product" onPress={() => router.push('/products/add')} />
                <Button
                  label="Import a price list"
                  variant="secondary"
                  onPress={() => router.push('/settings')}
                />
              </View>
            }
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  greetingBlock: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontFamily: fonts.semibold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
  },
  shopName: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
});
