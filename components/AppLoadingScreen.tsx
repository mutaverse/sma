import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spinner } from '@/components/ui/Spinner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

export function AppLoadingScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.brand}>
          <Text accessibilityRole="header" style={styles.name}>
            SMA
          </Text>
          <View style={styles.rule} />
        </View>

        <Spinner size={28} color={colors.primary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 48,
    lineHeight: 58,
    letterSpacing: 8,
    color: colors.primary,
  },
  rule: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
