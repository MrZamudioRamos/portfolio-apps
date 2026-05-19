import { useColors, useTheme } from '@portfolio/ui';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ClimateZone } from '../../models/garden';

interface Props {
  sowingMonths: number[];
  harvestMonths: number[];
  climateZone: ClimateZone;
}

export function CalendarGantt({ sowingMonths, harvestMonths }: Props) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t } = useTranslation();
  const monthLabels = (t('cropNew.months', { returnObjects: true }) as string[]) ?? [];

  const now = new Date().getMonth() + 1;
  const sowingSet = new Set(sowingMonths);
  const harvestSet = new Set(harvestMonths);

  return (
    <View style={{ marginVertical: spacing.md }}>
      {/* Legend */}
      <View style={[styles.legend, { gap: spacing.md, marginBottom: spacing.sm }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#66BB6A' }]} />
          <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
            {t('plantDetail.calendar.sowing')}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF7043' }]} />
          <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
            {t('plantDetail.calendar.harvest')}
          </Text>
        </View>
      </View>

      {/* Month grid */}
      <View style={styles.row}>
        {Array.from({ length: 12 }, (_, i) => i).map((i) => {
          const m = i + 1;
          const isSow = sowingSet.has(m);
          const isHarv = harvestSet.has(m);
          const isCurrent = m === now;
          return (
            <View key={i} style={[styles.cell, { borderColor: isCurrent ? colors.primary : 'transparent' }]}>
              <Text
                style={[
                  styles.monthLabel,
                  {
                    color: isCurrent ? colors.primary : colors.textSecondary,
                    fontWeight: isCurrent ? fontWeight.bold : fontWeight.medium,
                  },
                ]}
              >
                {monthLabels[i] ?? ''}
              </Text>
              <View style={[styles.bars, { borderRadius: radii.sm }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: isSow ? '#66BB6A' : colors.surfaceAlt,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: isHarv ? '#FF7043' : colors.surfaceAlt,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', gap: 2 },
  cell: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingVertical: 4 },
  monthLabel: { fontSize: 9, textTransform: 'uppercase', marginBottom: 4 },
  bars: { width: '90%', overflow: 'hidden' },
  bar: { height: 6, marginBottom: 1 },
});
