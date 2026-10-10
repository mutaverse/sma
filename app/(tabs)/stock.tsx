import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AddProductForm } from '@/components/products/AddProductForm';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterChips } from '@/components/ui/FilterChips';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
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
  const [addOpen, setAddOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const { products, categories, ready, searching, activeQuery } = useStockCatalog(
    query,
    category,
    scope,
    sort,
    revision,
  );

  function openAdd() {
    setSaved(false);
    setFormKey((current) => current + 1);
    setAddOpen(true);
  }

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
          title: `No hidden match for “${activeQuery}”`,
        };
      }
      return {
        title: 'No hidden products',
      };
    }

    if (searching) {
      return {
        title: `No match for “${activeQuery}”`,
      };
    }

    if (category !== 'all') {
      return {
        title: 'Nothing in this category',
      };
    }

    return {
      title: 'No products yet',
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
          <View style={styles.sortTabs}>
            <Tabs
              value={scope === 'hidden' ? 'hidden' : sort}
              options={[
                { value: 'recent', label: 'Recent' },
                { value: 'name', label: 'A–Z' },
                { value: 'hidden', label: 'Hidden' },
              ]}
              onValueChange={(value) => {
                if (value === 'hidden') {
                  setScope('hidden');
                  return;
                }
                setScope('active');
                setSort(value);
              }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add product"
            onPress={openAdd}
            style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}
          >
            <Plus size={17} color={colors.primaryForeground} />
            <Text style={styles.addLabel}>Add</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <ProductCard
            product={item}
            currencySymbol={currencySymbol}
            first={index === 0}
            last={index === products.length - 1}
            onPress={() => router.push(`/products/${item.id}`)}
          />
        )}
        ListHeaderComponent={
          saved ? (
            <View style={styles.savedRow}>
              <Check size={18} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.saved}>Saved</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          ready ? (
            <EmptyState
              title={empty.title}
              action={
                scope === 'active' ? (
                  <Button label="Add product" onPress={openAdd} />
                ) : undefined
              }
            />
          ) : null
        }
      />

      <Modal visible={addOpen} title="Add product" onClose={() => setAddOpen(false)}>
        <AddProductForm
          key={formKey}
          onSaved={() => {
            setAddOpen(false);
            setSaved(true);
            setRevision((current) => current + 1);
          }}
        />
      </Modal>
    </View>
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
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sortTabs: {
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
  addButton: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  addLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primaryForeground,
  },
  pressed: {
    opacity: 0.72,
  },
  savedRow: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  saved: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.primary,
  },
});
