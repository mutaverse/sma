import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

export type TabOption<T extends string> = {
  value: T;
  label: string;
};

type TabsProps<T extends string> = {
  value: T;
  options: readonly TabOption<T>[];
  onValueChange: (value: T) => void;
};

export function Tabs<T extends string>({ value, options, onValueChange }: TabsProps<T>) {
  return (
    <View accessibilityRole="tablist" style={styles.list}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onValueChange(option.value)}
            style={({ pressed }) => [
              styles.trigger,
              active ? styles.activeTrigger : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.label, active ? styles.activeLabel : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.muted,
  },
  trigger: {
    flex: 1,
    minHeight: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  activeTrigger: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  activeLabel: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
});
