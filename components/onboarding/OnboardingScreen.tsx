import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_TIMEZONE,
} from '@/constants/config';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import type { DbClient } from '@/db/client';
import { upsertSettings } from '@/db/repositories/settings';
import { userMessage } from '@/lib/errors';
import type { AppSettings } from '@/types/domain';

type OnboardingScreenProps = {
  db: DbClient;
  onComplete: (settings: AppSettings) => void;
};

export function OnboardingScreen({ db, onComplete }: OnboardingScreenProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  async function handleStart() {
    if (!trimmed || saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const settings = await upsertSettings(db, {
        businessName: trimmed,
        currencyCode: DEFAULT_CURRENCY_CODE,
        currencySymbol: DEFAULT_CURRENCY_SYMBOL,
        timezone: DEFAULT_TIMEZONE,
      });
      onComplete(settings);
    } catch (caught) {
      setError(userMessage(caught, 'We could not save the shop name. Please try again.'));
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>What's the shop called?</Text>
          <Text style={styles.body}>
            This stays on this phone. You can change it later in Settings.
          </Text>

          <Input
            label="Shop name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ama's Mart"
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => {
              void handleStart();
            }}
          />

          <Text style={styles.hint}>
            Amounts will show in Ghana cedis ({DEFAULT_CURRENCY_SYMBOL}).
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={saving ? 'Saving…' : 'Start using the app'}
            onPress={() => {
              void handleStart();
            }}
            disabled={!trimmed || saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
});
