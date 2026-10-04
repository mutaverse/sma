import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductRow } from '@/components/ui/ProductRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors } from '@/constants/colors';
import { formatSellingPrice } from '@/lib/product-display';
import type { Product } from '@/types/domain';

type ProductResultsProps = {
  products: Product[];
  searching: boolean;
  query: string;
  currencySymbol: string;
  ready: boolean;
  onPressProduct?: (product: Product) => void;
  resultsTitle?: string;
};

export function ProductResults({
  products,
  searching,
  query,
  currencySymbol,
  ready,
  onPressProduct,
  resultsTitle,
}: ProductResultsProps) {
  const router = useRouter();

  if (!ready) {
    return null;
  }

  if (products.length === 0) {
    if (searching) {
      return (
        <EmptyState
          title={`No products match “${query}”`}
          body="Check the spelling, or add it so the next customer does not have to wait."
          action={
            <Button
              label="Add product"
              variant="secondary"
              onPress={() => router.push('/products/add')}
            />
          }
        />
      );
    }

    return (
      <EmptyState
        title="No products yet"
        body="Add your first product to look up prices here while a customer waits."
        action={<Button label="Add product" onPress={() => router.push('/products/add')} />}
      />
    );
  }

  return (
    <Card>
      <SectionHeader title={resultsTitle ?? (searching ? 'Results' : 'Recent products')} />
      {products.map((product, index) => (
        <View key={product.id}>
          {index > 0 ? <View style={styles.separator} /> : null}
          <ProductRow
            name={product.name}
            price={formatSellingPrice(product, currencySymbol)}
            onPress={() =>
              onPressProduct
                ? onPressProduct(product)
                : router.push(`/products/${product.id}`)
            }
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
