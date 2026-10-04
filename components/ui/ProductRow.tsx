import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { minTouchSize, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type ProductRowProps = {
  name: string;
  price: string;
  onPress?: () => void;
};

export function ProductRow({ name, price, onPress }: ProductRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text style={styles.price}>{price}</Text>
      {onPress ? <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  copy: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.medium,
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
});
