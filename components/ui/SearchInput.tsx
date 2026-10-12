import { useState } from 'react';
import { Search } from 'lucide-react-native';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useKeyboardScrollOnFocus } from '@/components/ui/keyboard-inset';
import { colors } from '@/constants/colors';
import { radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type SearchInputProps = TextInputProps;

export function SearchInput({ style, onFocus, onBlur, ...rest }: SearchInputProps) {
  const [focused, setFocused] = useState(false);
  const scrollIntoView = useKeyboardScrollOnFocus();

  return (
    <View style={[styles.wrap, focused ? styles.focused : null]}>
      <Search size={19} color={colors.textSecondary} strokeWidth={2} />
      <TextInput
        accessibilityRole="search"
        placeholder="Search products..."
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.field, style]}
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
          scrollIntoView();
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radii.md,
  },
  focused: {
    borderColor: colors.ring,
    borderWidth: 2,
  },
  field: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    paddingVertical: spacing.md,
  },
});
