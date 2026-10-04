import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterChips } from '@/components/ui/FilterChips';
import { SearchInput } from '@/components/ui/SearchInput';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import type { CatalogSort, CatalogScope, CategoryFilter } from '@/db/repositories/products';
import { useStockCatalog } from '@/hooks/useStockCatalog';
import { useAppStore } from '@/store/app-store';

export default function StockScreen() {
  const router = useRouter();
  const currencySymbol = useAppStore((state) => state.settings?.currencySymbol) ?? 'GH₵';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [scope, setScope] = useState<CatalogScope>('active');
  const [sort, setSort] = useState<CatalogSort>('recent');
  const { products, categories, ready, searching, activeQuery } = useStockCatalog(
    query,
    category,
    scope,
    sort,
  );

  const chipOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      { value: 'uncategorized', label: 'Uncategorized' },
      ...categories.map((item) => ({ value: item.id, label: item.name })),
    ],
    [categories],
  );

  function emptyCopy() {
    if (scope === 'hidden') {
      if (searching) {
        return {
          title: `No hidden products match “${activeQuery}”`,
          body: 'Hidden products stay out of Home search until you show them again.',
        };
      }
      return {
        title: 'No hidden products',
        body: 'Products you hide from search will show up here.',
      };
    }

    if (searching) {
      return {
        title: `No products match “${activeQuery}”`,
        body: 'Try another name, or add it so the next customer does not have to wait.',
      };
    }

    if (category !== 'all') {
      return {
        title: 'Nothing in this category yet',
        body: 'Add a product here, or pick another category.',
      };
    }

    return {
      title: 'No products yet',
      body: 'Add your first product to browse stock, prices, and margins here.',
    };
  }

  const empty = emptyCopy();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SearchInput value={query} onChangeText={setQuery} />
        <FilterChips
          options={chipOptions}
          value={category}
          onChange={(value) => setCategory(value)}
        />
        <View style={styles.toolbar}>
          <SortChip
            label="Recently viewed"
            selected={sort === 'recent'}
            onPress={() => setSort('recent')}
          />
          <SortChip label="A–Z" selected={sort === 'name'} onPress={() => setSort('name')} />
          <View style={styles.toolbarSpacer} />
          <SortChip
            label="Hidden"
            selected={scope === 'hidden'}
            accent
            onPress={() => setScope((current) => (current === 'hidden' ? 'active' : 'hidden'))}
          />
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            currencySymbol={currencySymbol}
            onPress={() => router.push(`/products/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          ready ? (
            <EmptyState
              title={empty.title}
              body={empty.body}
              action={
                scope === 'active' ? (
                  <Button label="Add product" onPress={() => router.push('/products/add')} />
                ) : undefined
              }
            />
          ) : null
        }
      />

      {products.length > 0 ? (
        <View style={styles.footer}>
          <Button label="Add product" onPress={() => router.push('/products/add')} />
          <Button
            label="Add purchase"
            variant="secondary"
            onPress={() => router.push('/purchases/add')}
          />
        </View>
      ) : null}
    </View>
  );
}

function SortChip({
  label,
  selected,
  onPress,
  accent = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.sortChip,
        selected && !accent ? styles.sortSelected : null,
        selected && accent ? styles.sortAccent : null,
      ]}
    >
      <Text
        style={[
          styles.sortLabel,
          selected && !accent ? styles.sortSelectedLabel : null,
          selected && accent ? styles.sortAccentLabel : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  toolbarSpacer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  sortChip: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  sortAccent: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  sortLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  sortSelectedLabel: {
    color: colors.primary,
  },
  sortAccentLabel: {
    color: colors.accentText,
  },
});
