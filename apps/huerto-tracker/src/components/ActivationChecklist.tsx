import { useColors, useTheme } from '@portfolio/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChecklistItem } from '../utils/activation';

interface ActivationChecklistProps {
  checklist: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  onSelect?: (id: string) => void;
}

export function ActivationChecklist({
  checklist,
  completedCount,
  totalCount,
  onSelect,
}: ActivationChecklistProps) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t } = useTranslation();

  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }]}>
          {t('activation.title')}
        </Text>
        <Text style={[s.counter, { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium }]}>
          {completedCount}/{totalCount}
        </Text>
      </View>
      <View style={[s.progressTrack, { backgroundColor: colors.border, borderRadius: radii.full }]}>
        <View
          style={[
            s.progressFill,
            { backgroundColor: colors.primary, width: `${progress * 100}%`, borderRadius: radii.full },
          ]}
        />
      </View>
      <View style={s.items}>
        {checklist.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ disabled: item.completed || !onSelect }} disabled={item.completed || !onSelect} onPress={() => onSelect?.(item.id)} style={[s.row, { minHeight: 44 }]}>
            <View
              style={[
                s.check,
                {
                  backgroundColor: item.completed ? colors.primary : 'transparent',
                  borderColor: item.completed ? colors.primary : colors.border,
                },
              ]}
            >
              {item.completed && <Text style={[s.checkMark, { color: colors.background }]}>✓</Text>}
            </View>
            <Text
              style={[
                s.label,
                {
                  color: item.completed ? colors.textSecondary : colors.text,
                  fontSize: fontSize.sm,
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {t(item.labelKey)}
            </Text>
            {!item.completed && onSelect && <Text style={{ color: colors.textSecondary }} accessible={false}>›</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    padding: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: {},
  counter: {},
  progressTrack: { height: 4, marginBottom: 14 },
  progressFill: { height: 4 },
  items: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  label: { flex: 1 },
});
