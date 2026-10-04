import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { formatSellingPrice, productGlanceMetrics } from '@/lib/product-display';
import type { Product } from '@/types/domain';

type ProductCardProps = {
  product: Product;
  currencySymbol: string;
  onPress: () => void;
};

export function ProductCard({ product, currencySymbol, onPress }: ProductCardProps) {
  const metrics = productGlanceMetrics(product, currencySymbol);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatSellingPrice(product, currencySymbol)}, ${metrics.stock}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatSellingPrice(product, currencySymbol)}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.stock}>{metrics.stock}</Text>
        {metrics.marginTone ? (
          <Badge
            label={metrics.margin}
            variant={metrics.marginTone === 'negative' ? 'accent' : 'success'}
          />
        ) : null}
        <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: minTouchSize,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  name: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  price: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stock: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
