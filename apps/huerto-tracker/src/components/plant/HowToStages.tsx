import { useColors, useTheme } from '@portfolio/ui';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CropInfo } from '../../data/crops';
import type { PlantStatus } from '../../models/plant';
import { GUIDE_STAGES, guideStageForStatus, type GuideStage } from '../../utils/plantGuide';

const STAGES = GUIDE_STAGES;
type Stage = GuideStage;

const STAGE_EMOJI: Record<Stage, string> = {
  sowing: '🌱',
  germination: '🌿',
  growth: '🌾',
  flowering: '🌸',
  harvest: '🧺',
};

interface Props {
  crop: CropInfo;
  plantStatus?: PlantStatus;
  fallbackTip: string;
}

export function HowToStages({ crop, plantStatus, fallbackTip }: Props) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t, i18n } = useTranslation();
  const currentStage = guideStageForStatus(plantStatus);
  const [active, setActive] = useState<Stage>(currentStage);

  useEffect(() => {
    setActive(currentStage);
  }, [currentStage]);

  const stageKey = `cropStages.${crop.id}.${active}`;
  const hasStage = i18n.exists(stageKey);
  const action = hasStage
    ? t(stageKey)
    : t(`plantGuide.${active}.action`, { name: crop.name, spacing: crop.spacing });
  const checks = [
    t(`plantGuide.${active}.check1`, { name: crop.name, spacing: crop.spacing }),
    t(`plantGuide.${active}.check2`, { name: crop.name, spacing: crop.spacing }),
  ];
  const avoid = t(`plantGuide.${active}.avoid`, { name: crop.name, spacing: crop.spacing });
  const sunKey = crop.sunNeeds === 'full' ? 'sunFull' : crop.sunNeeds === 'partial' ? 'sunPartial' : 'sunShade';
  const waterKey = crop.waterNeeds === 'high' ? 'waterHigh' : crop.waterNeeds === 'medium' ? 'waterMedium' : 'waterLow';
  const harvestRange = Array.isArray(crop.daysToHarvest)
    ? t('plantGuide.days', { min: crop.daysToHarvest[0], max: crop.daysToHarvest[1] })
    : '—';

  return (
    <View style={{ marginVertical: spacing.md }}>
      <View style={[styles.tabs, { gap: spacing.xs }]}>
        {STAGES.map((s) => {
          const isActive = s === active;
          return (
            <Pressable
              key={s}
              onPress={() => setActive(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
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
          styles.guide,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
            marginTop: spacing.sm,
          },
        ]}
      >
        <View style={styles.stageHeader}>
          <Text style={{ fontSize: 22 }}>{STAGE_EMOJI[active]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('plantGuide.chapter')}
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
              {t('plantDetail.stage.' + active)}
            </Text>
          </View>
          {active === currentStage && (
            <View style={[styles.nowPill, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
              <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{t('plantGuide.now')}</Text>
            </View>
          )}
        </View>

        <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.primary + '55', borderRadius: radii.md, marginTop: spacing.md, padding: spacing.md }]}>
          <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('plantGuide.nextStep')}
          </Text>
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold, lineHeight: 22, marginTop: spacing.xs }}>
            {action || fallbackTip}
          </Text>
        </View>

        <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: spacing.lg, marginBottom: spacing.xs }}>
          {t('plantGuide.checklist')}
        </Text>
        {checks.map((check, index) => (
          <View key={index} style={styles.checkRow}>
            <Text style={[styles.checkMark, { color: colors.primary }]}>✓</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19, flex: 1 }}>{check}</Text>
          </View>
        ))}

        <View style={[styles.avoid, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '45', borderRadius: radii.sm, marginTop: spacing.md, padding: spacing.sm }]}>
          <Text style={{ color: colors.warning, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{t('plantGuide.avoid')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 18, marginTop: 2 }}>{avoid}</Text>
        </View>

        {fallbackTip ? (
          <View style={[styles.cropTip, { backgroundColor: colors.primary + '0d', borderColor: colors.primary + '35', borderRadius: radii.sm, marginTop: spacing.sm, padding: spacing.sm }]}>
            <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{t('plantGuide.cropTip', { name: crop.name })}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 18, marginTop: 2 }}>{fallbackTip}</Text>
          </View>
        ) : null}

        <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: spacing.lg, marginBottom: spacing.xs }}>
          {t('plantGuide.snapshot')}
        </Text>
        <View style={styles.snapshot}>
          <Metric label={t('plantGuide.sun')} value={t('plantDetail.' + sunKey)} colors={colors} fontSize={fontSize} />
          <Metric label={t('plantGuide.water')} value={t('plantDetail.' + waterKey)} colors={colors} fontSize={fontSize} />
          <Metric label={t('plantGuide.spacing')} value={`${crop.spacing} cm`} colors={colors} fontSize={fontSize} />
          <Metric label={t('plantGuide.harvest')} value={harvestRange} colors={colors} fontSize={fontSize} />
        </View>
      </View>
    </View>
  );
}

function Metric({ label, value, colors, fontSize }: { label: string; value: string; colors: ReturnType<typeof useColors>; fontSize: Record<string, number> }) {
  return (
    <View style={styles.metric}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>{value}</Text>
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
  guide: {
    borderWidth: 1,
  },
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nowPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  actionCard: { borderWidth: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 7 },
  checkMark: { fontSize: 16, fontWeight: '800', lineHeight: 19 },
  avoid: { borderWidth: 1 },
  cropTip: { borderWidth: 1 },
  snapshot: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48%', padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.42)' },
});
