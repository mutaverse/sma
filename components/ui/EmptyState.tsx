import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { ReactNode } from 'react';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {Icon ? <Icon size={28} color={colors.textSecondary} strokeWidth={1.75} /> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  action: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});
