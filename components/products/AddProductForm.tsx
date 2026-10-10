import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

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
import type { Category, Product } from '@/types/domain';

type AddProductFormProps = {
  onSaved: (product: Product) => void;
};

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

export function AddProductForm({ onSaved }: AddProductFormProps) {
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
  const trimmedName = name.trim();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void listCategories(db).then((next) => {
        if (!cancelled) {
          setCategories(next);
        }
      });
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
      onSaved(product);
    } catch (caught) {
      setError(userMessage(caught, 'We could not save this product. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <Input
        label="Name"
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
      <FieldLabel label="Category">
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
        label="Selling price"
        value={selling}
        onChangeText={setSelling}
        keyboardType="decimal-pad"
        placeholder="28.00"
      />
      <Input
        label="Cost price"
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
        placeholder="23.50"
      />
      <Input
        label="On hand"
        value={opening}
        onChangeText={setOpening}
        keyboardType="decimal-pad"
        placeholder="24"
      />
      {duplicateName ? (
        <WarningBanner message={`Duplicate of “${duplicateName}”. Save anyway?`} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={saving ? 'Saving…' : duplicateName ? 'Save anyway' : 'Save product'}
        onPress={() => {
          void handleSave();
        }}
        disabled={!trimmedName || saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
});
