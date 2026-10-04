import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.wrap}>
        <Text style={styles.title}>That screen isn’t here</Text>
        <Text style={styles.body}>Go back home and keep working from there.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  link: {
    marginTop: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.primary,
  },
});
