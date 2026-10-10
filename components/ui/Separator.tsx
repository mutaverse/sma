import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/constants/colors';

export function Separator({ style, ...props }: ViewProps) {
  return <View style={[styles.separator, style]} {...props} />;
}

const styles = StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
