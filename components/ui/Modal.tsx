import { useRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { minTouchSize, radii, spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';

import { IconButton } from '@/components/ui/Button';
import { KeyboardScrollProvider, useKeyboardOverlap } from '@/components/ui/keyboard-inset';

type ModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

const SHEET_HEADER = spacing.lg + minTouchSize + spacing.md;

export function Modal({ visible, title, onClose, children }: ModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboard = useKeyboardOverlap();
  const androidKeyboard = Platform.OS === 'android' ? keyboard : 0;
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const restingPadding = Math.max(insets.bottom + spacing.md, spacing.xxl);
  const bottomPad = androidKeyboard > 0 ? spacing.md : restingPadding;
  const topGap = Math.max(insets.top, spacing.md);
  const sheetMaxHeight =
    androidKeyboard > 0
      ? Math.max(220, windowHeight - androidKeyboard - topGap)
      : windowHeight * 0.88;
  const scrollMaxHeight = Math.max(140, sheetMaxHeight - SHEET_HEADER - bottomPad);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardScrollProvider scrollRef={scrollRef} scrollY={scrollY} overlap={androidKeyboard}>
          <View
            style={[
              styles.sheet,
              {
                maxHeight: sheetMaxHeight,
                marginBottom: androidKeyboard,
                paddingBottom: bottomPad,
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <IconButton icon={X} onPress={onClose} accessibilityLabel="Close" />
            </View>
            <ScrollView
              ref={scrollRef}
              style={{ maxHeight: scrollMaxHeight }}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              bounces={false}
              contentContainerStyle={styles.body}
              onScroll={(event) => {
                scrollY.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardScrollProvider>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  body: {
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    flex: 1,
  },
});
