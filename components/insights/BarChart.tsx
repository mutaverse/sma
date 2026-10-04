import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { spacing } from '@/constants/layout';
import type { TrendPoint } from '@/lib/insights';

type BarChartProps = {
  points: TrendPoint[];
};

const CHART_HEIGHT = 88;
const LABEL_HEIGHT = 18;

export function BarChart({ points }: BarChartProps) {
  const [width, setWidth] = useState(0);
  const max = Math.max(...points.map((point) => point.totalPesewas), 1);
  const showLabels = points.length <= 12;
  const gap = points.length > 14 ? 2 : 4;
  const barWidth = points.length === 0 || width === 0 ? 0 : (width - gap * (points.length - 1)) / points.length;

  return (
    <View
      style={styles.wrap}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          {points.map((point, index) => {
            const height = Math.max((point.totalPesewas / max) * CHART_HEIGHT, point.totalPesewas > 0 ? 2 : 0);
            const x = index * (barWidth + gap);
            return (
              <Rect
                key={point.key}
                x={x}
                y={CHART_HEIGHT - height}
                width={Math.max(barWidth, 1)}
                height={height}
                rx={2}
                fill={colors.primary}
                opacity={point.totalPesewas === 0 ? 0.18 : 1}
              />
            );
          })}
        </Svg>
      ) : (
        <View style={{ height: CHART_HEIGHT }} />
      )}
      {showLabels ? (
        <View style={styles.labels}>
          {points.map((point) => (
            <Text key={point.key} style={styles.label} numberOfLines={1}>
              {point.label}
            </Text>
          ))}
        </View>
      ) : (
        <View style={{ height: LABEL_HEIGHT }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  labels: {
    flexDirection: 'row',
    height: LABEL_HEIGHT,
  },
  label: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
