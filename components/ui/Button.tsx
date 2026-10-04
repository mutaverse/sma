import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: LucideIcon;
  accessibilityLabel?: string;
} & Pick<PressableProps, 'testID'>;

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon: Icon,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled ? pressedByVariant[variant] : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {Icon ? (
        <Icon
          size={18}
          color={variant === 'primary' ? colors.surface : colors.primary}
          strokeWidth={2.25}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.labelOnPrimary : styles.labelOnLight,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  color = colors.text,
}: {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed ? styles.iconPressed : null]}
    >
      <Icon size={22} color={color} strokeWidth={2} />
    </Pressable>
  );
}

export function HeaderButton({ children, onPress, accessibilityLabel }: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.headerButton, pressed ? styles.iconPressed : null]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchSize,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryPressed: {
    backgroundColor: colors.background,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: colors.background,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  labelOnPrimary: {
    color: colors.surface,
  },
  labelOnLight: {
    color: colors.primary,
  },
  iconButton: {
    width: minTouchSize,
    height: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  iconPressed: {
    opacity: 0.55,
  },
  headerButton: {
    minWidth: minTouchSize,
    minHeight: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
});

const pressedByVariant = {
  primary: styles.primaryPressed,
  secondary: styles.secondaryPressed,
  ghost: styles.ghostPressed,
} as const;
