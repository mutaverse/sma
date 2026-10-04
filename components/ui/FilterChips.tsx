import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

export type FilterChipOption = {
  value: string;
  label: string;
  tone?: 'default' | 'accent';
};

type FilterChipsProps = {
  options: readonly FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
};

export function FilterChips({ options, value, onChange }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
        const selected = option.value === value;
        const accent = option.tone === 'accent';
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              selected && !accent ? styles.selected : null,
              selected && accent ? styles.selectedAccent : null,
            ]}
          >
            <Text
              style={[
                styles.label,
                selected && !accent ? styles.selectedLabel : null,
                selected && accent ? styles.selectedAccentLabel : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
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
  selectedAccent: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
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
  selectedAccentLabel: {
    color: colors.accentText,
  },
});
