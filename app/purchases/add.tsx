import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FieldLabel } from '@/components/products/ProductChrome';
import { ProductResults } from '@/components/products/ProductResults';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { colors } from '@/constants/colors';
import { radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { getProduct } from '@/db/repositories/products';
import { recordPurchase } from '@/db/repositories/purchases';
import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { formatMarginTenths } from '@/lib/calculations';
import { cedisStringFromPesewas, formatPesewas } from '@/lib/currency';
import {
  formatDayMonthYear,
  formatDisplayDate,
  parseShopDate,
  todayAccra,
  yesterdayAccra,
} from '@/lib/dates';
import { userMessage } from '@/lib/errors';
import { tryPreviewPurchase } from '@/lib/purchase-preview';
import { formatSellingPrice } from '@/lib/product-display';
import { useAppStore } from '@/store/app-store';
import type { Product } from '@/types/domain';

type DatePreset = 'today' | 'yesterday' | 'other';

export default function AddPurchaseScreen() {
  const router = useRouter();
  const db = useShopDatabase();
  const rawId = useLocalSearchParams<{ productId?: string | string[] }>().productId;
  const initialProductId = Array.isArray(rawId) ? rawId[0] : rawId;
  const currencySymbol = useAppStore((state) => state.settings?.currencySymbol) ?? 'GH₵';

  const [product, setProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [selling, setSelling] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => todayAccra());
  const [otherDate, setOtherDate] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(Boolean(initialProductId));

  const { products, searching, ready, activeQuery } = useCatalogSearch(query);
  const preview = tryPreviewPurchase(quantity, totalCost, selling);

  const selectProduct = useCallback((next: Product) => {
    setProduct(next);
    setQuery('');
    setError(null);
    if (next.currentSellingPesewas > 0) {
      setSelling(cedisStringFromPesewas(next.currentSellingPesewas));
    }
  }, []);

  useEffect(() => {
    if (!initialProductId) {
      return;
    }

    let cancelled = false;
    void getProduct(db, initialProductId).then((next) => {
      if (cancelled) {
        return;
      }
      if (next) {
        selectProduct(next);
      }
      setHydrating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [db, initialProductId, selectProduct]);

  function applyDatePreset(preset: DatePreset) {
    setDatePreset(preset);
    setError(null);
    if (preset === 'today') {
      setPurchaseDate(todayAccra());
      return;
    }
    if (preset === 'yesterday') {
      setPurchaseDate(yesterdayAccra());
      return;
    }
    setOtherDate(formatDayMonthYear(purchaseDate));
  }

  async function handleSave() {
    if (!product || saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const nextPreview = tryPreviewPurchase(quantity, totalCost, selling);
      if (!nextPreview) {
        throw new Error('Enter quantity, total cost, and a selling price greater than zero.');
      }

      const date = datePreset === 'other' ? parseShopDate(otherDate) : purchaseDate;

      await recordPurchase(db, {
        productId: product.id,
        quantityThousandths: nextPreview.quantityThousandths,
        totalCostPesewas: nextPreview.totalCostPesewas,
        sellingPricePesewas: nextPreview.sellingPricePesewas,
        purchaseDate: date,
      });

      router.replace(`/products/${product.id}`);
    } catch (caught) {
      setError(userMessage(caught, 'We could not save this purchase. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {hydrating ? null : product ? (
          <View style={styles.productRow}>
            <View style={styles.productCopy}>
              <Text style={styles.productName} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={styles.productPrice}>{formatSellingPrice(product, currencySymbol)}</Text>
            </View>
            <Button label="Change" variant="ghost" onPress={() => setProduct(null)} />
          </View>
        ) : (
          <View style={styles.picker}>
            <SearchInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search products..."
              autoFocus={Platform.OS !== 'web' && !initialProductId}
            />
            <ProductResults
              products={products}
              searching={searching}
              query={activeQuery || query.trim()}
              currencySymbol={currencySymbol}
              ready={ready}
              resultsTitle={searching ? 'Results' : 'Recent products'}
              onPressProduct={selectProduct}
            />
          </View>
        )}

        {product ? (
          <>
            <Card style={styles.formCard}>
              <Input
                label={`Quantity (${product.unit})`}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                placeholder="24"
              />
              <Input
                label="Total cost"
                value={totalCost}
                onChangeText={setTotalCost}
                keyboardType="decimal-pad"
                placeholder="564"
              />
              <Input
                label="Selling / unit"
                value={selling}
                onChangeText={setSelling}
                keyboardType="decimal-pad"
                placeholder="28"
              />

              <FieldLabel label="Date">
                <Text style={styles.dateDisplay}>
                  {formatDisplayDate(datePreset === 'other' && otherDate ? (safeParseDate(otherDate) ?? purchaseDate) : purchaseDate)}
                </Text>
                <ChoiceChips
                  options={[
                    { value: 'today' as const, label: 'Today' },
                    { value: 'yesterday' as const, label: 'Yesterday' },
                    { value: 'other' as const, label: 'Other' },
                  ]}
                  value={datePreset}
                  onChange={applyDatePreset}
                />
                {datePreset === 'other' ? (
                  <Input
                    value={otherDate}
                    onChangeText={setOtherDate}
                    placeholder="16/09/2026"
                    keyboardType="numbers-and-punctuation"
                  />
                ) : null}
              </FieldLabel>
            </Card>

            {preview ? (
              <View style={styles.preview}>
                <PreviewRow label="Unit cost" value={formatPesewas(preview.unitCostPesewas, currencySymbol)} first />
                <PreviewRow label="Profit" value={formatPesewas(preview.profitPesewas, currencySymbol)} />
                <PreviewRow label="Margin" value={formatMarginTenths(preview.marginTenths)} />
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={saving ? 'Saving…' : 'Save purchase'}
              onPress={() => {
                void handleSave();
              }}
              disabled={!preview || saving}
            />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PreviewRow({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.previewRow, first ? styles.previewFirst : null]}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={styles.previewValue}>{value}</Text>
    </View>
  );
}

function safeParseDate(value: string): string | null {
  try {
    return parseShopDate(value);
  } catch {
    return null;
  }
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
  },
  picker: {
    gap: spacing.lg,
  },
  formCard: {
    gap: spacing.lg,
  },
  dateDisplay: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
  },
  productRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productCopy: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  productPrice: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  preview: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  previewFirst: {
    borderTopWidth: 0,
  },
  previewRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  previewLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  previewValue: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
});
