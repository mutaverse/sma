import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackupCard } from '@/components/backup/BackupCard';
import { CategoryManager } from '@/components/settings/CategoryManager';
import { ConfirmRow } from '@/components/products/ProductChrome';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { APP_NAME } from '@/constants/config';
import { CSV_TEMPLATE, CSV_UNITS_HINT } from '@/constants/csv';
import { colors } from '@/constants/colors';
import { radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import { importCsvProducts, type ProductImportSummary } from '@/db/repositories/products';
import { upsertSettings } from '@/db/repositories/settings';
import { userMessage } from '@/lib/errors';
import { pickCsvText } from '@/lib/pick-csv';
import { useAppStore } from '@/store/app-store';

export default function SettingsScreen() {
  const db = useShopDatabase();
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const [name, setName] = useState(settings?.businessName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
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
      setImportError('Could not open the file picker. Paste the CSV instead.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <View style={styles.shopBlock}>
          <SectionHeader title="Shop" />
          <Input
            label="Shop name"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setSaved(false);
            }}
            autoCapitalize="words"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saved && !dirty ? <Text style={styles.saved}>Saved on this phone.</Text> : null}
          <Button
            label={saving ? 'Saving…' : 'Save name'}
            onPress={() => {
              void handleSave();
            }}
            disabled={!trimmed || !dirty || saving}
          />
          <SettingsRow
            label="Currency"
            value={`${settings.currencyCode} / ${settings.currencySymbol}`}
          />
          <SettingsRow label="Timezone" value={settings.timezone} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Import products" />
        <Text style={styles.body}>
          Use a CSV with these columns. Prices are in cedis. Units: {CSV_UNITS_HINT}.
        </Text>
        <Text selectable style={styles.template}>
          {CSV_TEMPLATE.trim()}
        </Text>
        <View style={styles.importActions}>
          <Button
            label={importing ? 'Importing…' : 'Choose CSV file'}
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
        </View>
        {importError ? <Text style={styles.error}>{importError}</Text> : null}
        {importSummary ? <ImportResult summary={importSummary} /> : null}
      </Card>

      <Card>
        <BackupCard />
      </Card>

      <Card>
        <CategoryManager />
      </Card>

      <Card>
        <SectionHeader title="About" />
        <SettingsRow label="App" value={APP_NAME} />
        <SettingsRow label="Version" value={version} />
      </Card>

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

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function ImportResult({ summary }: { summary: ProductImportSummary }) {
  const issues = [...summary.skipped, ...summary.failed].slice(0, 5);

  return (
    <View style={styles.importResult}>
      <Text style={styles.saved}>
        Imported {summary.imported}. Skipped {summary.skipped.length} already in the shop. Could not
        import {summary.failed.length}.
      </Text>
      {issues.map((issue) => (
        <Text key={`${issue.row}-${issue.name}`} style={styles.issue}>
          Row {issue.row}: {issue.name} — {issue.reason}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  shopBlock: {
    gap: spacing.lg,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  saved: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  template: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  importActions: {
    gap: spacing.md,
  },
  importResult: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  issue: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
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
