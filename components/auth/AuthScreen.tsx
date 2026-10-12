import { useState, type ComponentType } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  Store,
  type LucideProps,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import { Button } from '@/components/ui/Button';
import { KeyboardAwareScrollView, useKeyboardScrollOnFocus } from '@/components/ui/keyboard-inset';
import { Tabs } from '@/components/ui/Tabs';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { sendPasswordReset, signIn, signUp, verifyPhoneSignUp } from '@/lib/auth';
import {
  authErrorMessage,
  normalizeAuthIdentifier,
  type AuthMethod,
} from '@/lib/auth-validation';
import { isBackupConfigured } from '@/lib/supabase';

type AuthMode = 'signin' | 'signup';

type AuthScreenProps = {
  onAuthenticated: (session: Session, companyName?: string) => Promise<void>;
};

const AUTH_MODES = [
  { value: 'signin', label: 'Sign in' },
  { value: 'signup', label: 'Create account' },
] as const;

const AUTH_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
] as const;

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const configured = isBackupConfigured();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [method, setMethod] = useState<AuthMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [awaitingPhoneCode, setAwaitingPhoneCode] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const identifierLabel = method === 'email' ? 'Email address' : 'Phone number';
  const identifierPlaceholder =
    method === 'email' ? 'you@company.com' : '024 123 4567';
  const canSubmit =
    configured &&
    identifier.trim().length > 0 &&
    password.length >= 6 &&
    (mode === 'signin' || companyName.trim().length > 0) &&
    !busy;

  function changeMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setAwaitingPhoneCode(false);
  }

  function changeMethod(next: AuthMethod) {
    setMethod(next);
    setIdentifier('');
    setError(null);
    setNotice(null);
    setAwaitingPhoneCode(false);
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'signin') {
        const session = await signIn(method, identifier, password);
        await onAuthenticated(session);
        return;
      }

      const data = await signUp(method, identifier, password, companyName);
      if (data.session) {
        await onAuthenticated(data.session, companyName.trim());
        return;
      }

      if (method === 'phone') {
        setAwaitingPhoneCode(true);
        setNotice('We sent a verification code to your phone.');
      } else {
        setNotice('Confirm your email, then sign in.');
        setMode('signin');
      }
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyPhone() {
    if (verificationCode.trim().length < 6 || busy) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const session = await verifyPhoneSignUp(identifier, verificationCode);
      await onAuthenticated(session, companyName.trim());
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setNotice(null);

    if (method === 'phone') {
      setError('Password reset is available with email sign-in.');
      return;
    }

    try {
      normalizeAuthIdentifier('email', identifier);
      setBusy(true);
      await sendPasswordReset(identifier);
      setNotice('Password reset instructions were sent to your email.');
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Store size={25} color={colors.surface} strokeWidth={2.2} />
            </View>
            <Text style={styles.brandName}>SMA</Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.title}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? 'Sign in to your shop'
                : 'Create your account'}
            </Text>
          </View>

          <View style={styles.formCard}>
            <Tabs value={mode} options={AUTH_MODES} onValueChange={changeMode} />
            <Tabs value={method} options={AUTH_METHODS} onValueChange={changeMethod} />

            {awaitingPhoneCode ? (
              <View style={styles.fields}>
                <AuthField
                  label="Verification code"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  icon={Phone}
                  autoFocus
                />
                {notice ? <Text style={styles.notice}>{notice}</Text> : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button
                  label={busy ? 'Verifying…' : 'Verify phone'}
                  icon={ArrowRight}
                  onPress={() => {
                    void handleVerifyPhone();
                  }}
                  disabled={busy || verificationCode.trim().length < 6}
                />
                <Button
                  label="Use a different number"
                  variant="ghost"
                  onPress={() => {
                    setAwaitingPhoneCode(false);
                    setVerificationCode('');
                    setNotice(null);
                  }}
                  disabled={busy}
                />
              </View>
            ) : (
              <View style={styles.fields}>
                {mode === 'signup' ? (
                  <AuthField
                    label="Company name"
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="e.g. Ama's Mart"
                    autoCapitalize="words"
                    autoComplete="organization"
                    icon={Building2}
                  />
                ) : null}

                <AuthField
                  label={identifierLabel}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={identifierPlaceholder}
                  keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={method === 'email' ? 'email' : 'tel'}
                  icon={method === 'email' ? Mail : Phone}
                />

                <AuthField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  icon={LockKeyhole}
                  accessory={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                      hitSlop={8}
                      onPress={() => setPasswordVisible((visible) => !visible)}
                      style={styles.fieldAction}
                    >
                      {passwordVisible ? (
                        <EyeOff size={20} color={colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={colors.textSecondary} />
                      )}
                    </Pressable>
                  }
                  onSubmitEditing={() => {
                    void handleSubmit();
                  }}
                />

                {mode === 'signin' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void handleForgotPassword();
                    }}
                    style={styles.forgotButton}
                    disabled={busy}
                  >
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </Pressable>
                ) : null}

                {!configured ? (
                  <Text style={styles.error}>
                    Sign-in not configured.
                  </Text>
                ) : null}
                {notice ? <Text style={styles.notice}>{notice}</Text> : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Button
                  label={
                    busy
                      ? mode === 'signin'
                        ? 'Signing in…'
                        : 'Creating account…'
                      : mode === 'signin'
                        ? 'Sign in'
                        : 'Create account'
                  }
                  icon={ArrowRight}
                  onPress={() => {
                    void handleSubmit();
                  }}
                  disabled={!canSubmit}
                />

                {mode === 'signup' ? (
                  <Text style={styles.terms}>
                    Keep your login details secure.
                  </Text>
                ) : null}
              </View>
            )}
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

type AuthFieldProps = TextInputProps & {
  label: string;
  icon: ComponentType<LucideProps>;
  accessory?: React.ReactNode;
};

function AuthField({ label, icon: Icon, accessory, style, onFocus, ...props }: AuthFieldProps) {
  const scrollIntoView = useKeyboardScrollOnFocus();
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldShell}>
        <Icon size={19} color={colors.textSecondary} strokeWidth={2} />
        <TextInput
          placeholderTextColor={colors.textSecondary}
          style={[styles.fieldInput, style]}
          {...props}
          onFocus={(event) => {
            onFocus?.(event);
            scrollIntoView();
          }}
        />
        {accessory}
      </View>
    </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandMark: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  brandName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 3,
    color: colors.primary,
  },
  intro: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  formCard: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  fields: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  fieldShell: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  fieldInput: {
    flex: 1,
    minHeight: minTouchSize,
    paddingVertical: 0,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  fieldAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    minHeight: minTouchSize,
    justifyContent: 'center',
  },
  forgotText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
  },
  notice: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  terms: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
