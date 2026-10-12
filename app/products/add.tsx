import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AddProductForm } from '@/components/products/AddProductForm';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-inset';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';

export default function AddProductScreen() {
  const router = useRouter();

  return (
    <KeyboardAwareScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <AddProductForm onSaved={(product) => router.replace(`/products/${product.id}`)} />
    </KeyboardAwareScrollView>
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
