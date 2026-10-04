import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type Choice<T extends string | null> = {
  value: T;
  label: string;
};

type ChoiceChipsProps<T extends string | null> = {
  options: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function ChoiceChips<T extends string | null>({
  options,
  value,
  onChange,
}: ChoiceChipsProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected ? styles.selected : null]}
          >
            <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  selectedLabel: {
    color: colors.primary,
  },
});
