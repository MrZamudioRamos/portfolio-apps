import { useColors, useTheme } from '@portfolio/ui';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const STAGES = ['sowing', 'germination', 'growth', 'flowering', 'harvest'] as const;
type Stage = typeof STAGES[number];

const STAGE_EMOJI: Record<Stage, string> = {
  sowing: '🌱',
  germination: '🌿',
  growth: '🌾',
  flowering: '🌸',
  harvest: '🧺',
};

interface Props {
  cropId: string;
  fallbackTip: string;
}

export function HowToStages({ cropId, fallbackTip }: Props) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<Stage>('sowing');

  const stageKey = `cropStages.${cropId}.${active}`;
  const hasStage = i18n.exists(stageKey);
  const content = hasStage ? t(stageKey) : fallbackTip;

  return (
    <View style={{ marginVertical: spacing.md }}>
      <View style={[styles.tabs, { gap: spacing.xs }]}>
        {STAGES.map((s) => {
          const isActive = s === active;
          return (
            <Pressable
              key={s}
              onPress={() => setActive(s)}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.primary + '22' : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderRadius: radii.md,
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>{STAGE_EMOJI[s]}</Text>
              <Text
                style={{
                  fontSize: fontSize.xs,
                  fontWeight: isActive ? fontWeight.bold : fontWeight.medium,
                  color: isActive ? colors.primary : colors.textSecondary,
                }}
              >
                {t('plantDetail.stage.' + s)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View
        style={[
          styles.body,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
            marginTop: spacing.sm,
          },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: fontSize.sm, lineHeight: 20 }}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minWidth: 60,
  },
  body: {
    borderWidth: 1,
  },
});
