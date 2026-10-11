import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type PointerEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import { formatPesewas } from '@/lib/currency';
import type { CumulativePoint } from '@/lib/insights';

type LineChartProps = {
  points: CumulativePoint[];
  currencySymbol: string;
  series?: 'cumulative' | 'each';
};

const HEIGHT = 164;
const TOP = 16;
const BOTTOM = 12;

export function LineChart({ points, currencySymbol, series = 'cumulative' }: LineChartProps) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const seriesKey = `${series}:${points.map((point) => point.key).join('|')}`;

  useEffect(() => {
    setActiveIndex(null);
  }, [seriesKey]);

  const values = points.map((point) =>
    series === 'each' ? point.totalPesewas : point.cumulativePesewas,
  );
  const max = Math.max(...values, 1);
  const usableHeight = HEIGHT - TOP - BOTTOM;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coordinates = values.map((value, index) => ({
    x: index * step,
    y: TOP + usableHeight - (value / max) * usableHeight,
  }));
  const path = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const baseline = TOP + usableHeight;
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const area =
    first && last ? `${path} L ${last.x} ${baseline} L ${first.x} ${baseline} Z` : '';
  const active = activeIndex === null ? null : points[activeIndex];
  const activeCoord = activeIndex === null ? null : coordinates[activeIndex];
  const finalPoint = coordinates.at(-1);
  const ticks = axisTicks(points, coordinates, width);

  function selectAt(x: number) {
    const nearest = nearestEntry(points, coordinates, x);
    if (nearest !== null) {
      setActiveIndex(nearest);
    }
  }

  function selectTouch(event: GestureResponderEvent) {
    selectAt(event.nativeEvent.locationX);
  }

  function selectPointer(event: PointerEvent) {
    if (event.nativeEvent.pointerType !== 'mouse') {
      return;
    }
    selectAt(event.nativeEvent.offsetX);
  }

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {active && active.detail ? (
        <View style={styles.readout} pointerEvents="none">
          <Text style={styles.readoutDate}>{active.detail}</Text>
          <Text style={styles.readoutValue}>{formatPesewas(active.totalPesewas, currencySymbol)}</Text>
          {series === 'cumulative' ? (
            <Text style={styles.readoutRunning}>
              Running {formatPesewas(active.cumulativePesewas, currencySymbol)}
            </Text>
          ) : null}
        </View>
      ) : null}
      {width > 0 ? (
        <View
          accessibilityLabel={series === 'each' ? 'Individual chart' : 'Cumulative chart'}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={selectTouch}
          onResponderMove={selectTouch}
          onPointerMove={selectPointer}
        >
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id={`area-${series}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity={0.28} />
                <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((ratio) => (
              <Line
                key={ratio}
                x1={0}
                x2={width}
                y1={TOP + usableHeight * ratio}
                y2={TOP + usableHeight * ratio}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            ))}
            {area ? <Path d={area} fill={`url(#area-${series})`} /> : null}
            {activeCoord ? (
              <Line
                x1={activeCoord.x}
                x2={activeCoord.x}
                y1={TOP}
                y2={TOP + usableHeight}
                stroke={colors.primary}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            ) : null}
            <Path
              d={path}
              fill="none"
              stroke={colors.primary}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {activeCoord ? (
              <Circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r={5}
                fill={colors.surface}
                stroke={colors.primary}
                strokeWidth={3}
              />
            ) : finalPoint ? (
              <Circle
                cx={finalPoint.x}
                cy={finalPoint.y}
                r={4}
                fill={colors.surface}
                stroke={colors.primary}
                strokeWidth={3}
              />
            ) : null}
          </Svg>
        </View>
      ) : (
        <View style={styles.placeholder} />
      )}
      <View style={styles.labels}>
        {ticks.map((tick) => (
          <Text
            key={tick.key}
            numberOfLines={1}
            style={[styles.label, { left: tick.left, width: tick.width, textAlign: tick.align }]}
          >
            {tick.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function nearestEntry(
  points: CumulativePoint[],
  coordinates: { x: number }[],
  x: number,
): number | null {
  let nearest: number | null = null;
  let best = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    if (!point.label) {
      return;
    }
    const distance = Math.abs(x - (coordinates[index]?.x ?? 0));
    if (distance < best) {
      nearest = index;
      best = distance;
    }
  });
  return nearest;
}

function axisTicks(
  points: CumulativePoint[],
  coordinates: { x: number }[],
  width: number,
): { key: string; label: string; left: number; width: number; align: 'left' | 'center' | 'right' }[] {
  const candidates = points.flatMap((point, index) =>
    point.label ? [{ point, x: coordinates[index]?.x ?? 0 }] : [],
  );
  if (candidates.length === 0 || width <= 0) {
    return [];
  }

  const sample = candidates.reduce((longest, item) =>
    item.point.label.length > longest.length ? item.point.label : longest,
  '');
  const box = sample.length > 4 ? 58 : 36;
  const gap = box + 8;
  const chosen = [candidates[0]];
  for (const item of candidates.slice(1, -1)) {
    const previous = chosen[chosen.length - 1];
    if (previous && item.x - previous.x >= gap) {
      chosen.push(item);
    }
  }
  const last = candidates[candidates.length - 1];
  if (last && last !== chosen[0]) {
    while (chosen.length > 1) {
      const previous = chosen[chosen.length - 1];
      if (previous && last.x - previous.x >= gap) {
        break;
      }
      chosen.pop();
    }
    chosen.push(last);
  }

  return chosen.flatMap((item) => {
    if (!item) {
      return [];
    }
    const ideal = item.x - box / 2;
    const left = Math.min(Math.max(ideal, 0), Math.max(width - box, 0));
    const align = left === 0 && ideal < 0 ? 'left' : left > ideal ? 'right' : 'center';
    return [{ key: item.point.key, label: item.point.label, left, width: box, align }];
  });
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  placeholder: {
    height: HEIGHT,
  },
  readout: {
    gap: 2,
  },
  readoutDate: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  readoutValue: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
  },
  readoutRunning: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  labels: {
    height: 16,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    top: 0,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
