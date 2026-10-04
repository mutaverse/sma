import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ConfirmRow,
  HistoryRow,
  MetricBlock,
  PurchaseHistoryRow,
} from '@/components/products/ProductChrome';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { getProduct, hideProduct, markProductViewed, unhideProduct } from '@/db/repositories/products';
import {
  listPriceHistory,
  listPurchaseHistory,
  previewUndoLatestPurchase,
  undoLatestPurchase,
  type UndoLatestPreview,
} from '@/db/repositories/purchases';
import { recordStockCount } from '@/db/repositories/stock-counts';
import { formatPesewas } from '@/lib/currency';
import { formatDisplayDate, formatIsoDateForDisplay, nowIso } from '@/lib/dates';
import { userMessage } from '@/lib/errors';
import { describeUndoLatestPurchase, productGlanceMetrics } from '@/lib/product-display';
import { formatQuantity, formatThousandths, thousandthsFromQuantityString } from '@/lib/quantity';
import { useAppStore } from '@/store/app-store';
import type { PriceHistory, Product, Purchase } from '@/types/domain';

export default function ProductDetailScreen() {
  const router = useRouter();
  const db = useShopDatabase();
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const currencySymbol = useAppStore((state) => state.settings?.currencySymbol) ?? 'GH₵';
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [hideOpen, setHideOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);
  const [countValue, setCountValue] = useState('');
  const [undoPreview, setUndoPreview] = useState<UndoLatestPreview | null>(null);
  const [hiding, setHiding] = useState(false);
  const [unhiding, setUnhiding] = useState(false);
  const [counting, setCounting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setProduct(null);
      return;
    }

    const next = await getProduct(db, id);
    setProduct(next);
    if (!next) {
      return;
    }

    const [nextHistory, nextPurchases] = await Promise.all([
      listPriceHistory(db, next.id),
      listPurchaseHistory(db, next.id),
    ]);
    setHistory(nextHistory);
    setPurchases(nextPurchases);
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        if (!id) {
          if (!cancelled) {
            setProduct(null);
          }
          return;
        }

        const next = await getProduct(db, id);
        if (cancelled) {
          return;
        }

        setProduct(next);
        if (!next) {
          return;
        }

        await markProductViewed(db, next.id);
        const [nextHistory, nextPurchases] = await Promise.all([
          listPriceHistory(db, next.id),
          listPurchaseHistory(db, next.id),
        ]);
        if (!cancelled) {
          setHistory(nextHistory);
          setPurchases(nextPurchases);
        }
      }

      void load();
      return () => {
        cancelled = true;
      };
    }, [db, id]),
  );

  async function handleHide() {
    if (!product || hiding) {
      return;
    }

    setHiding(true);
    setError(null);

    try {
      await hideProduct(db, product.id);
      setHideOpen(false);
      router.back();
    } catch (caught) {
      setError(userMessage(caught, 'We could not hide this product. Please try again.'));
    } finally {
      setHiding(false);
    }
  }

  async function handleUnhide() {
    if (!product || unhiding) {
      return;
    }

    setUnhiding(true);
    setError(null);

    try {
      await unhideProduct(db, product.id);
      await refresh();
    } catch (caught) {
      setError(userMessage(caught, 'We could not show this product again. Please try again.'));
    } finally {
      setUnhiding(false);
    }
  }

  function openCount() {
    if (!product) {
      return;
    }

    setCountValue(formatThousandths(product.currentStockThousandths));
    setCountError(null);
    setCountOpen(true);
  }

  async function handleCount() {
    if (!product || counting) {
      return;
    }

    setCounting(true);
    setCountError(null);

    try {
      if (!countValue.trim()) {
        throw new Error('Enter how many you counted.');
      }

      await recordStockCount(db, {
        productId: product.id,
        quantityThousandths: thousandthsFromQuantityString(countValue),
        countedAt: nowIso(),
      });
      setCountOpen(false);
      await refresh();
    } catch (caught) {
      setCountError(userMessage(caught, 'We could not save this count. Please try again.'));
    } finally {
      setCounting(false);
    }
  }

  async function openUndo(purchase: Purchase) {
    if (!product) {
      return;
    }

    setUndoError(null);
    setError(null);

    try {
      const preview = await previewUndoLatestPurchase(db, product.id);
      if (preview.purchase.id !== purchase.id) {
        throw new Error('Only the latest purchase can be undone.');
      }
      setUndoPreview(preview);
    } catch (caught) {
      setError(userMessage(caught, 'We could not undo this purchase. Please try again.'));
    }
  }

  async function handleUndo() {
    if (!product || !undoPreview || undoing) {
      return;
    }

    setUndoing(true);
    setUndoError(null);

    try {
      await undoLatestPurchase(db, product.id);
      setUndoPreview(null);
      await refresh();
    } catch (caught) {
      setUndoError(userMessage(caught, 'We could not undo this purchase. Please try again.'));
    } finally {
      setUndoing(false);
    }
  }

  if (product === undefined) {
    return <View style={styles.flex} />;
  }

  if (!product) {
    return (
      <View style={styles.missing}>
        <EmptyState
          title="We could not find that product"
          body="It may have been removed. Search again from Home."
          action={
            <Button label="Back to Home" variant="secondary" onPress={() => router.replace('/')} />
          }
        />
      </View>
    );
  }

  const metrics = productGlanceMetrics(product, currencySymbol);
  const latestPurchaseId = purchases[0]?.id;

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.unit}>{product.unit}</Text>
          {product.isActive ? null : <Badge label="Hidden from search" />}
        </View>

        <Card>
          <MetricBlock label="Selling price" value={metrics.selling} large />
        </Card>

        <View style={styles.grid}>
          <Card style={styles.gridCard}>
            <MetricBlock label="Current cost" value={metrics.cost} />
          </Card>
          <Card style={styles.gridCard}>
            <MetricBlock label="Profit / unit" value={metrics.profit} />
          </Card>
        </View>

        <View style={styles.grid}>
          <Card style={styles.gridCard}>
            <MetricBlock label="Margin" value={metrics.margin} />
          </Card>
          <Card style={styles.gridCard}>
            <MetricBlock label="On hand" value={metrics.stock} />
          </Card>
        </View>

        {product.countedAt ? (
          <Text style={styles.counted}>Counted {formatIsoDateForDisplay(product.countedAt)}</Text>
        ) : (
          <Text style={styles.counted}>
            This goes up when you buy. Count the shelf to set what is really there.
          </Text>
        )}

        <Button
          label="Add purchase"
          onPress={() => router.push(`/purchases/add?productId=${product.id}`)}
        />
        <Button label="Update count" variant="secondary" onPress={openCount} />

        <Card>
          <SectionHeader title="Purchases" />
          {purchases.length === 0 ? (
            <Text style={styles.emptyHistory}>
              Purchases will show here after you restock.
            </Text>
          ) : (
            purchases.map((row) => (
              <PurchaseHistoryRow
                key={row.id}
                date={formatDisplayDate(row.purchaseDate)}
                quantity={formatQuantity(row.quantityThousandths, product.unit)}
                total={formatPesewas(row.totalCostPesewas, currencySymbol)}
                onUndo={row.id === latestPurchaseId ? () => { void openUndo(row); } : undefined}
              />
            ))
          )}
        </Card>

        <Card>
          <SectionHeader title="Price history" />
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>
              Prices will show here after you add a selling price or a purchase.
            </Text>
          ) : (
            history.map((row) => (
              <HistoryRow
                key={row.id}
                date={formatIsoDateForDisplay(row.recordedAt)}
                cost={formatPesewas(row.costPesewas, currencySymbol)}
                selling={formatPesewas(row.sellingPesewas, currencySymbol)}
              />
            ))
          )}
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {product.isActive ? (
          <Button
            label="Hide from search"
            variant="ghost"
            onPress={() => setHideOpen(true)}
          />
        ) : (
          <Button
            label={unhiding ? 'Showing…' : 'Show in search again'}
            onPress={() => {
              void handleUnhide();
            }}
            disabled={unhiding}
          />
        )}
      </ScrollView>

      <Modal visible={hideOpen} title="Hide this product?" onClose={() => setHideOpen(false)}>
        <Text style={styles.modalBody}>
          {product.name} will no longer appear in search.
        </Text>
        <ConfirmRow
          confirmLabel={hiding ? 'Hiding…' : 'Hide'}
          disabled={hiding}
          onCancel={() => setHideOpen(false)}
          onConfirm={() => {
            void handleHide();
          }}
        />
      </Modal>

      <Modal
        visible={countOpen}
        title="Update count"
        onClose={() => {
          if (!counting) {
            setCountOpen(false);
          }
        }}
      >
        <Text style={styles.modalBody}>How many {product.unit} are on the shelf now?</Text>
        <Input
          label="On hand"
          value={countValue}
          onChangeText={setCountValue}
          keyboardType="decimal-pad"
          placeholder={formatThousandths(product.currentStockThousandths)}
        />
        {countError ? <Text style={styles.error}>{countError}</Text> : null}
        <ConfirmRow
          confirmLabel={counting ? 'Saving…' : 'Save count'}
          disabled={counting || !countValue.trim()}
          onCancel={() => {
            if (!counting) {
              setCountOpen(false);
            }
          }}
          onConfirm={() => {
            void handleCount();
          }}
        />
      </Modal>

      <Modal
        visible={undoPreview !== null}
        title="Undo this purchase?"
        onClose={() => {
          if (!undoing) {
            setUndoPreview(null);
          }
        }}
      >
        {undoPreview ? (
          <Text style={styles.modalBody}>
            {describeUndoLatestPurchase(
              {
                unit: product.unit,
                quantityThousandths: undoPreview.purchase.quantityThousandths,
                nextStockThousandths: undoPreview.nextStockThousandths,
                nextCostPesewas: undoPreview.nextCostPesewas,
                nextSellingPesewas: undoPreview.nextSellingPesewas,
                clampedToZero: undoPreview.clampedToZero,
              },
              currencySymbol,
            )}
          </Text>
        ) : null}
        {undoError ? <Text style={styles.error}>{undoError}</Text> : null}
        <ConfirmRow
          confirmLabel={undoing ? 'Undoing…' : 'Undo purchase'}
          disabled={undoing}
          onCancel={() => {
            if (!undoing) {
              setUndoPreview(null);
            }
          }}
          onConfirm={() => {
            void handleUndo();
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
  missing: {
    flex: 1,
    padding: spacing.xl,
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
  name: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
  },
  unit: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridCard: {
    flex: 1,
  },
  counted: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  emptyHistory: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  modalBody: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
