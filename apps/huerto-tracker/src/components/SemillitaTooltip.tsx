import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useCopilot } from 'react-native-copilot';
import { useTranslation } from 'react-i18next';
import { useColors, useTheme } from '@portfolio/ui';
import { Mascot } from './Mascot';

/**
 * On-brand tooltip for the react-native-copilot spotlight tour: Semillita +
 * the step text + localized buttons, replacing the library's plain white box.
 * Pass as `tooltipComponent` to CopilotProvider.
 */
export function SemillitaTooltip() {
  const { currentStep, isFirstStep, isLastStep, goToNext, goToPrev, stop } = useCopilot();
  const colors = useColors();
  const { fontSize, fontWeight, spacing } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Mascot pose="point" size={56} />
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.md,
            lineHeight: 21,
            fontWeight: fontWeight.medium,
          }}
        >
          {currentStep?.text}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" onPress={() => stop()} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('onboarding.skip')}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {!isFirstStep && (
          <Pressable accessibilityRole="button" onPress={() => goToPrev()} hitSlop={8} style={{ marginRight: spacing.lg, minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
              {t('onboarding.back')}
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => (isLastStep ? stop() : goToNext())}
          style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: colors.background, fontWeight: fontWeight.bold, fontSize: fontSize.sm }}>
            {isLastStep ? t('coach.gotIt') : t('onboarding.continue')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
