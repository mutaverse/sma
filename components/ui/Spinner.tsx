import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LoaderCircle } from 'lucide-react-native';

import { colors } from '@/constants/colors';

type SpinnerProps = {
  size?: number;
  color?: string;
};

export function Spinner({ size = 28, color = colors.primary }: SpinnerProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={styles.frame}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <LoaderCircle size={size} color={color} strokeWidth={2.5} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
