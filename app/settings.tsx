import { Children, useEffect, useState, type ReactNode } from 'react';
import Constants from 'expo-constants';
import { Check, ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackupCard } from '@/components/backup/BackupCard';
import { CategoryManager } from '@/components/settings/CategoryManager';
import { ConfirmRow } from '@/components/products/ProductChrome';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { APP_NAME } from '@/constants/config';
import { CSV_TEMPLATE, CSV_UNITS_HINT } from '@/constants/csv';
import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { importCsvProducts, type ProductImportSummary } from '@/db/repositories/products';
import { upsertSettings } from '@/db/repositories/settings';
import { userMessage } from '@/lib/errors';
import { pickCsvText } from '@/lib/pick-csv';
import { isBackupConfigured } from '@/lib/supabase';
import { useAppStore } from '@/store/app-store';
import { useSyncStore } from '@/store/sync-store';

export default function SettingsScreen() {
  const db = useShopDatabase();
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const backupEmail = useSyncStore((state) => state.email);
  const backupUserId = useSyncStore((state) => state.userId);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const [name, setName] = useState(settings?.businessName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState(CSV_TEMPLATE);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ProductImportSummary | null>(null);

  useEffect(() => {
    setName(settings?.businessName ?? '');
  }, [settings?.businessName]);

  if (!settings) {
    return null;
  }

  const shop = settings;
  const trimmed = name.trim();
  const dirty = trimmed !== shop.businessName;
  const backupValue = !isBackupConfigured()
    ? 'Off'
    : backupUserId
      ? (backupEmail ?? 'On')
      : 'Sign in';

  async function handleSave() {
    if (!trimmed || !dirty || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const next = await upsertSettings(db, {
        businessName: trimmed,
        currencyCode: shop.currencyCode,
        currencySymbol: shop.currencySymbol,
        timezone: shop.timezone,
      });
      setSettings(next);
      setSaved(true);
      setNameOpen(false);
    } catch {
      setError('We could not save the shop name. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function runImport(text: string) {
    setImporting(true);
    setImportError(null);
    setImportSummary(null);

    try {
      const summary = await importCsvProducts(db, text);
      setImportSummary(summary);
      setPasteOpen(false);
      setImportOpen(false);
    } catch (caught) {
      setImportError(userMessage(caught, 'We could not import that file. Check the columns and try again.'));
    } finally {
      setImporting(false);
    }
  }

  async function handlePickCsv() {
    setImportError(null);
    try {
      const text = await pickCsvText();
      if (text) {
        await runImport(text);
      }
    } catch {
      setImportError('We could not open your files. Please try again.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SETTINGS</Text>
        <Text style={styles.title} numberOfLines={2}>
          {shop.businessName}
        </Text>
      </View>

      <SectionLabel label="Shop" />
      <SettingsGroup>
        <SettingsRow
          label="Name"
          value={saved ? undefined : shop.businessName}
          accessory={saved ? <SavedMark /> : undefined}
          onPress={() => setNameOpen(true)}
        />
        <SettingsRow label="Currency" value={shop.currencySymbol} />
        <SettingsRow label="Timezone" value={shortZone(shop.timezone)} />
      </SettingsGroup>

      <SectionLabel label="Stock" />
      <SettingsGroup>
        <SettingsRow label="Categories" onPress={() => setCategoriesOpen(true)} />
        <SettingsRow
          label="Import"
          value={importSummary ? `${importSummary.imported} added` : undefined}
          onPress={() => setImportOpen(true)}
        />
      </SettingsGroup>

      <SectionLabel label="Backup" />
      <SettingsGroup>
        <SettingsRow label="Cloud backup" value={backupValue} onPress={() => setBackupOpen(true)} />
      </SettingsGroup>

      <Text style={styles.footer}>
        {APP_NAME} · {version}
      </Text>

      <Modal
        visible={nameOpen}
        title="Shop name"
        onClose={() => {
          if (!saving) {
            setName(shop.businessName);
            setError(null);
            setNameOpen(false);
          }
        }}
      >
        <Input
          label="Name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setSaved(false);
            setError(null);
          }}
          autoCapitalize="words"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={saving ? 'Saving…' : 'Save'}
          onPress={() => {
            void handleSave();
          }}
          disabled={!trimmed || !dirty || saving}
        />
      </Modal>

      <Modal visible={categoriesOpen} title="Categories" onClose={() => setCategoriesOpen(false)}>
        <CategoryManager />
      </Modal>

      <Modal visible={backupOpen} title="Backup" onClose={() => setBackupOpen(false)}>
        <BackupCard />
      </Modal>

      <Modal
        visible={importOpen && !pasteOpen}
        title="Import products"
        onClose={() => setImportOpen(false)}
      >
        <Text style={styles.hint}>Prices in cedis. Units: {CSV_UNITS_HINT}.</Text>
        <Button
          label={importing ? 'Importing…' : 'Choose file'}
          onPress={() => {
            void handlePickCsv();
          }}
          disabled={importing}
        />
        <Button
          label="Paste CSV"
          variant="secondary"
          onPress={() => setPasteOpen(true)}
          disabled={importing}
        />
        {importError ? <Text style={styles.error}>{importError}</Text> : null}
      </Modal>

      <Modal visible={pasteOpen} title="Paste CSV" onClose={() => setPasteOpen(false)}>
        <TextInput
          value={paste}
          onChangeText={setPaste}
          multiline
          autoCorrect={false}
          autoCapitalize="none"
          textAlignVertical="top"
          style={styles.paste}
        />
        <ConfirmRow
          confirmLabel={importing ? 'Importing…' : 'Import'}
          disabled={importing || !paste.trim()}
          onCancel={() => setPasteOpen(false)}
          onConfirm={() => {
            void runImport(paste);
          }}
        />
      </Modal>
    </ScrollView>
  );
}

function shortZone(timezone: string): string {
  return timezone.split('/').pop()?.replaceAll('_', ' ') ?? timezone;
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.section}>{label}</Text>;
}

function SettingsGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <View style={styles.group}>
      {items.map((child, index) => (
        <View key={index} style={index > 0 ? styles.divider : null}>
          {child}
        </View>
      ))}
    </View>
  );
}

function SettingsRow({
  label,
  value,
  accessory,
  onPress,
}: {
  label: string;
  value?: string;
  accessory?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowEnd}>
        {accessory}
        {value ? (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {onPress ? <ChevronRight size={18} color={colors.textSecondary} /> : null}
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

function SavedMark() {
  return (
    <View style={styles.savedMark}>
      <Check size={14} color={colors.primary} strokeWidth={2.5} />
      <Text style={styles.saved}>Saved</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  rowEnd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  rowValue: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  pressed: {
    backgroundColor: colors.muted,
  },
  savedMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  saved: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.primary,
  },
  footer: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
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
  paste: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
