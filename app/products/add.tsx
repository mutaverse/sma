import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { AddProductForm } from '@/components/products/AddProductForm';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';

export default function AddProductScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AddProductForm onSaved={(product) => router.replace(`/products/${product.id}`)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
});
