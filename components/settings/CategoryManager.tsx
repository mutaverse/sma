import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmRow } from '@/components/products/ProductChrome';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { useShopDatabase } from '@/db/database';
import {
  createCategory,
  deleteCategory,
  listCategories,
  listCategoryUsage,
  renameCategory,
} from '@/db/repositories/categories';
import { userMessage } from '@/lib/errors';
import type { Category } from '@/types/domain';

export function CategoryManager() {
  const db = useShopDatabase();
  const [categories, setCategories] = useState<Category[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const [nextCategories, nextUsage] = await Promise.all([
      listCategories(db),
      listCategoryUsage(db),
    ]);
    setCategories(nextCategories);
    setUsage(nextUsage);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createCategory(db, trimmed);
      setNewName('');
      await load();
    } catch (caught) {
      setError(userMessage(caught, 'We could not add that category.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRename() {
    if (!editing || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await renameCategory(db, editing.id, editName);
      setEditing(null);
      await load();
    } catch (caught) {
      setError(userMessage(caught, 'We could not rename that category.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await deleteCategory(db, deleting.id);
      setDeleting(null);
      await load();
    } catch (caught) {
      setError(userMessage(caught, 'We could not delete that category.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Categories" />
      <Text style={styles.body}>
        Use these on Stock to browse by shelf. You can only delete a category that has no products.
      </Text>
      <Input
        label="New category"
        value={newName}
        onChangeText={(value) => {
          setNewName(value);
          setError(null);
        }}
        autoCapitalize="words"
        placeholder="Drinks"
      />
      <Button
        label={saving && !editing && !deleting ? 'Adding…' : 'Add category'}
        onPress={() => {
          void handleAdd();
        }}
        disabled={!newName.trim() || saving}
      />
      {error && !editing && !deleting ? <Text style={styles.error}>{error}</Text> : null}

      {categories.map((category) => {
        const count = usage[category.id] ?? 0;
        return (
          <View key={category.id} style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.name}>{category.name}</Text>
              <Text style={styles.meta}>
                {count === 1 ? '1 product' : `${count} products`}
              </Text>
            </View>
            <View style={styles.actions}>
              <Button
                label="Rename"
                variant="ghost"
                onPress={() => {
                  setEditing(category);
                  setEditName(category.name);
                  setError(null);
                }}
              />
              {count === 0 ? (
                <Button
                  label="Delete"
                  variant="ghost"
                  onPress={() => {
                    setDeleting(category);
                    setError(null);
                  }}
                />
              ) : null}
            </View>
          </View>
        );
      })}

      <Modal
        visible={Boolean(editing)}
        title="Rename category"
        onClose={() => setEditing(null)}
      >
        <Input
          label="Name"
          value={editName}
          onChangeText={setEditName}
          autoCapitalize="words"
          autoFocus
        />
        {error && editing ? <Text style={styles.error}>{error}</Text> : null}
        <ConfirmRow
          confirmLabel={saving ? 'Saving…' : 'Save'}
          disabled={saving || !editName.trim()}
          onCancel={() => setEditing(null)}
          onConfirm={() => {
            void handleRename();
          }}
        />
      </Modal>

      <Modal
        visible={Boolean(deleting)}
        title="Delete this category?"
        onClose={() => setDeleting(null)}
      >
        <Text style={styles.body}>
          {deleting ? `${deleting.name} will be removed. Products are not deleted.` : ''}
        </Text>
        {error && deleting ? <Text style={styles.error}>{error}</Text> : null}
        <ConfirmRow
          confirmLabel={saving ? 'Deleting…' : 'Delete'}
          disabled={saving}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            void handleDelete();
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 0,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  row: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  copy: {
    gap: 2,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
