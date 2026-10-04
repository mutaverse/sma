import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

type ComingSoonProps = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export function ComingSoon({ icon: Icon, title, body }: ComingSoonProps) {
  return (
    <View style={styles.wrap}>
      <Icon size={32} color={colors.primary} strokeWidth={1.75} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    maxWidth: 360,
  },
});
