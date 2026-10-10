import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ConfirmRow,
  HistoryRow,
  PurchaseHistoryRow,
} from '@/components/products/ProductChrome';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { getProduct, hideProduct, markProductViewed, unhideProduct } from '@/db/repositories/products';
import {
  deletePurchase,
  listPriceHistory,
  listPurchaseHistory,
  previewPurchaseRemoval,
  updatePurchase,
  type UndoLatestPreview,
} from '@/db/repositories/purchases';
import { recordStockCount } from '@/db/repositories/stock-counts';
import { cedisStringFromPesewas, formatPesewas, pesewasFromCedisInput } from '@/lib/currency';
import { formatDayMonthYear, formatDisplayDate, formatIsoDateForDisplay, nowIso, parseShopDate } from '@/lib/dates';
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
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editSelling, setEditSelling] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingPurchase, setSavingPurchase] = useState(false);
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

  function openPurchase(purchase: Purchase) {
    setEditing(purchase);
    setEditQuantity(formatThousandths(purchase.quantityThousandths));
    setEditCost(cedisStringFromPesewas(purchase.totalCostPesewas));
    setEditSelling(cedisStringFromPesewas(purchase.sellingPricePesewas));
    setEditDate(formatDayMonthYear(purchase.purchaseDate));
    setEditError(null);
  }

  function closePurchase() {
    if (savingPurchase || undoing) {
      return;
    }
    setEditing(null);
    setEditError(null);
  }

  async function handleSavePurchase() {
    if (!product || !editing || savingPurchase) {
      return;
    }

    setSavingPurchase(true);
    setEditError(null);
    try {
      const totalCostPesewas = pesewasFromCedisInput(editCost);
      const sellingPricePesewas = pesewasFromCedisInput(editSelling);
      if (totalCostPesewas === null || sellingPricePesewas === null) {
        throw new Error('Enter amounts with up to 2 decimals.');
      }

      await updatePurchase(db, editing.id, {
        productId: product.id,
        quantityThousandths: thousandthsFromQuantityString(editQuantity),
        totalCostPesewas,
        sellingPricePesewas,
        purchaseDate: parseShopDate(editDate),
      });
      setEditing(null);
      await refresh();
    } catch (caught) {
      setEditError(userMessage(caught, 'We could not save this purchase. Please try again.'));
    } finally {
      setSavingPurchase(false);
    }
  }

  async function requestDeletePurchase() {
    if (!editing || undoing) {
      return;
    }

    setUndoError(null);
    setEditError(null);
    try {
      setUndoPreview(await previewPurchaseRemoval(db, editing.id));
    } catch (caught) {
      setEditError(userMessage(caught, 'We could not delete this purchase. Please try again.'));
    }
  }

  async function handleDeletePurchase() {
    if (!undoPreview || undoing) {
      return;
    }

    setUndoing(true);
    setUndoError(null);

    try {
      await deletePurchase(db, undoPreview.purchase.id);
      setUndoPreview(null);
      setEditing(null);
      await refresh();
    } catch (caught) {
      setUndoError(userMessage(caught, 'We could not delete this purchase. Please try again.'));
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
          title="Product not found"
          body="Removed or missing."
          action={
            <Button label="Back to Home" variant="secondary" onPress={() => router.replace('/')} />
          }
        />
      </View>
    );
  }

  const metrics = productGlanceMetrics(product, currencySymbol);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.unit}>{product.unit}</Text>
          {product.isActive ? null : <Badge label="Hidden" />}
        </View>

        <View style={styles.group}>
          <DetailRow label="Selling" value={metrics.selling} first />
          <DetailRow label="Cost" value={metrics.cost} />
          <DetailRow label="Profit" value={metrics.profit} />
          <DetailRow label="Margin" value={metrics.margin} />
          <DetailRow label="On hand" value={metrics.stock} />
          {product.countedAt ? (
            <DetailRow label="Counted" value={formatIsoDateForDisplay(product.countedAt)} />
          ) : null}
        </View>

        <View style={styles.group}>
          <ActionRow
            label="Add purchase"
            onPress={() => router.push(`/purchases/add?productId=${product.id}`)}
            first
          />
          <ActionRow label="Update count" onPress={openCount} />
        </View>

        <Text style={styles.section}>Purchases</Text>
        <View style={styles.group}>
          {purchases.length === 0 ? (
            <Text style={styles.emptyHistory}>None yet</Text>
          ) : (
            purchases.map((row) => (
              <PurchaseHistoryRow
                key={row.id}
                date={formatDisplayDate(row.purchaseDate)}
                quantity={formatQuantity(row.quantityThousandths, product.unit)}
                total={formatPesewas(row.totalCostPesewas, currencySymbol)}
                onPress={() => openPurchase(row)}
              />
            ))
          )}
        </View>

        <Text style={styles.section}>Prices</Text>
        <View style={styles.group}>
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>None yet</Text>
          ) : (
            history.map((row) => {
              const linked = row.purchaseId
                ? purchases.find((purchase) => purchase.id === row.purchaseId)
                : undefined;
              return (
                <HistoryRow
                  key={row.id}
                  date={formatIsoDateForDisplay(row.recordedAt)}
                  cost={formatPesewas(row.costPesewas, currencySymbol)}
                  selling={formatPesewas(row.sellingPesewas, currencySymbol)}
                  onPress={linked ? () => openPurchase(linked) : undefined}
                />
              );
            })
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.group}>
          {product.isActive ? (
            <ActionRow label="Hide" onPress={() => setHideOpen(true)} destructive first />
          ) : (
            <ActionRow
              label={unhiding ? 'Showing…' : 'Show again'}
              onPress={() => {
                void handleUnhide();
              }}
              first
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={hideOpen} title="Hide this product?" onClose={() => setHideOpen(false)}>
        <Text style={styles.modalBody}>
          {product.name} will no longer appear in search.
        </Text>
        <ConfirmRow
          confirmLabel={hiding ? 'Hiding…' : 'Hide'}
          destructive
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
        <Text style={styles.modalBody}>Count on shelf ({product.unit})</Text>
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
        visible={editing !== null && undoPreview === null}
        title="Edit purchase"
        onClose={closePurchase}
      >
        <Input
          label={`Quantity (${product.unit})`}
          value={editQuantity}
          onChangeText={setEditQuantity}
          keyboardType="decimal-pad"
        />
        <Input
          label={`Total cost (${currencySymbol})`}
          value={editCost}
          onChangeText={setEditCost}
          keyboardType="decimal-pad"
        />
        <Input
          label={`Selling price (${currencySymbol})`}
          value={editSelling}
          onChangeText={setEditSelling}
          keyboardType="decimal-pad"
        />
        <Input
          label="Date"
          value={editDate}
          onChangeText={setEditDate}
          placeholder="16/09/2026"
          keyboardType="numbers-and-punctuation"
        />
        {editError ? <Text style={styles.error}>{editError}</Text> : null}
        <Button
          label={savingPurchase ? 'Saving…' : 'Save purchase'}
          disabled={savingPurchase}
          onPress={() => {
            void handleSavePurchase();
          }}
        />
        <Button
          label="Delete"
          variant="destructive"
          disabled={savingPurchase}
          onPress={() => {
            void requestDeletePurchase();
          }}
        />
      </Modal>

      <Modal
        visible={undoPreview !== null}
        title="Delete this purchase?"
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
          confirmLabel={undoing ? 'Deleting…' : 'Delete purchase'}
          destructive
          disabled={undoing}
          onCancel={() => {
            if (!undoing) {
              setUndoPreview(null);
            }
          }}
          onConfirm={() => {
            void handleDeletePurchase();
          }}
        />
      </Modal>
    </View>
  );
}

function DetailRow({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.detailRow, first ? styles.rowFirst : null]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  label,
  onPress,
  first = false,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  first?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.detailRow,
        first ? styles.rowFirst : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.detailLabel, destructive ? styles.destructive : null]}>{label}</Text>
      <ChevronRight size={18} color={destructive ? colors.destructive : colors.textSecondary} />
    </Pressable>
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
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginTop: spacing.sm,
    marginBottom: -spacing.sm,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  detailRow: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  detailLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  detailValue: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  destructive: {
    color: colors.destructive,
  },
  pressed: {
    opacity: 0.7,
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
    justifyContent: 'space-between',
  },
  summary: {
    gap: spacing.lg,
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
