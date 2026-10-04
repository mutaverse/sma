import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FieldLabel, WarningBanner } from '@/components/products/ProductChrome';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Input } from '@/components/ui/Input';
import { PRODUCT_UNITS, type ProductUnit } from '@/constants/catalog';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { listCategories } from '@/db/repositories/categories';
import { createProduct, findActiveByNormalizedName } from '@/db/repositories/products';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { pesewasFromCedisString } from '@/lib/currency';
import { userMessage } from '@/lib/errors';
import { normalizeName } from '@/lib/normalize';
import { thousandthsFromQuantityString } from '@/lib/quantity';
import type { Category } from '@/types/domain';

function optionalPesewas(value: string, label: string): number {
  if (!value.trim()) {
    return 0;
  }

  const pesewas = pesewasFromCedisString(value);
  if (pesewas < 0) {
    throw new Error(`${label} cannot be negative.`);
  }

  return pesewas;
}

function optionalQuantity(value: string): number {
  if (!value.trim()) {
    return 0;
  }

  return thousandthsFromQuantityString(value);
}

export default function AddProductScreen() {
  const router = useRouter();
  const db = useShopDatabase();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('piece');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selling, setSelling] = useState('');
  const [cost, setCost] = useState('');
  const [opening, setOpening] = useState('');
  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedName = useDebouncedValue(name, 120);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const next = await listCategories(db);
        if (!cancelled) {
          setCategories(next);
        }
      }

      void load();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const normalized = normalizeName(debouncedName);

      async function checkDuplicate() {
        if (!normalized) {
          if (!cancelled) {
            setDuplicateName(null);
          }
          return;
        }

        const existing = await findActiveByNormalizedName(db, normalized);
        if (!cancelled) {
          setDuplicateName(existing ? existing.name : null);
        }
      }

      void checkDuplicate();
      return () => {
        cancelled = true;
      };
    }, [db, debouncedName]),
  );

  const trimmedName = name.trim();

  async function handleSave() {
    if (!trimmedName || saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const product = await createProduct(db, {
        name: trimmedName,
        unit,
        categoryId,
        sellingPricePesewas: optionalPesewas(selling, 'Selling price'),
        costPricePesewas: optionalPesewas(cost, 'Cost price'),
        openingStockThousandths: optionalQuantity(opening),
      });
      router.replace(`/products/${product.id}`);
    } catch (caught) {
      setError(userMessage(caught, 'We could not save this product. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Product name"
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
          placeholder="Milo 400g"
        />

        <FieldLabel label="Unit">
          <ChoiceChips
            options={PRODUCT_UNITS.map((item) => ({ value: item, label: item }))}
            value={unit}
            onChange={setUnit}
          />
        </FieldLabel>

        <FieldLabel label="Category (optional)">
          <ChoiceChips
            options={[
              { value: null, label: 'None' },
              ...categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
            value={categoryId}
            onChange={setCategoryId}
          />
        </FieldLabel>

        <Input
          label="Selling price (optional)"
          value={selling}
          onChangeText={setSelling}
          keyboardType="decimal-pad"
          placeholder="28.00"
        />
        <Input
          label="Cost price (optional)"
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          placeholder="23.50"
        />
        <Input
          label="Opening count (optional)"
          value={opening}
          onChangeText={setOpening}
          keyboardType="decimal-pad"
          placeholder="24"
        />

        {duplicateName ? (
          <WarningBanner
            message={`You already have “${duplicateName}”. Save another anyway?`}
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.save}>
          <Button
            label={saving ? 'Saving…' : duplicateName ? 'Save anyway' : 'Save product'}
            onPress={() => {
              void handleSave();
            }}
            disabled={!trimmedName || saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  save: {
    marginTop: spacing.sm,
  },
});
