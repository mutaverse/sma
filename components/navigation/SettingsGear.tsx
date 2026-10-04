import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/constants/colors';
import { minTouchSize } from '@/constants/layout';

export function SettingsGear() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      onPress={() => router.push('/settings')}
      hitSlop={12}
      style={styles.button}
    >
      <Settings size={22} color={colors.text} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: minTouchSize,
    minHeight: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
});
