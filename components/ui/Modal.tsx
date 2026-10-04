import { type ReactNode } from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

import { IconButton } from '@/components/ui/Button';

type ModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ visible, title, onClose, children }: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <IconButton icon={X} onPress={onClose} accessibilityLabel="Close" />
          </View>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    flex: 1,
  },
});
