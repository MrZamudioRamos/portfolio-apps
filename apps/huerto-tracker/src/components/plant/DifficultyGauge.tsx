import { useColors, useTheme } from '@portfolio/ui';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  waterNeeds: 'low' | 'medium' | 'high';
  sunNeeds: 'full' | 'partial' | 'shade';
  spacing: number;
}

function computeDifficulty(water: string, sun: string, spc: number): 1 | 2 | 3 | 4 | 5 {
  let score = 1;
  if (water === 'high') score += 1;
  if (sun === 'full') score += 1;
  if (spc >= 60) score += 1;
  if (spc >= 80) score += 1;
  return Math.min(5, score) as 1 | 2 | 3 | 4 | 5;
}

const LEVEL_COLOR: Record<number, string> = {
  1: '#66BB6A',
  2: '#9CCC65',
  3: '#FFCA28',
  4: '#FF8A65',
  5: '#EF5350',
};

const LEVEL_KEY: Record<number, string> = {
  1: 'veryEasy',
  2: 'easy',
  3: 'medium',
  4: 'hard',
  5: 'veryHard',
};

export function DifficultyGauge({ waterNeeds, sunNeeds, spacing }: Props) {
  const colors = useColors();
  const { spacing: sp, fontSize, fontWeight, radii } = useTheme();
  const { t } = useTranslation();
  const level = computeDifficulty(waterNeeds, sunNeeds, spacing);
  const color = LEVEL_COLOR[level];

  return (
    <View style={{ marginVertical: sp.md }}>
      <Text style={[styles.title, { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
        {t('plantDetail.difficulty.title')}
      </Text>
      <View style={styles.row}>
        <View style={styles.dots}>
          {[1, 2, 3, 4, 5].map((n) => (
            <View
              key={n}
              style={[
                styles.dot,
                {
                  backgroundColor: n <= level ? color : colors.surfaceAlt,
                  borderColor: n <= level ? color : colors.border,
                },
              ]}
            />
          ))}
        </View>
        <View style={[styles.badge, { backgroundColor: color + '22', borderRadius: radii.full }]}>
          <Text style={[styles.label, { color, fontWeight: fontWeight.bold, fontSize: fontSize.sm }]}>
            {t('plantDetail.difficulty.' + LEVEL_KEY[level])}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4 },
  label: {},
});
