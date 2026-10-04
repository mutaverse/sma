import { Search } from 'lucide-react-native';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/constants/colors';
import { radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type SearchInputProps = TextInputProps;

export function SearchInput({ style, ...rest }: SearchInputProps) {
  return (
    <View style={styles.wrap}>
      <Search size={22} color={colors.textSecondary} strokeWidth={2} />
      <TextInput
        accessibilityRole="search"
        placeholder="Search products..."
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.field, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radii.lg,
  },
  field: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    paddingVertical: spacing.md,
  },
});
