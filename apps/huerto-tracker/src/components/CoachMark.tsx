import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useColors, useTheme } from '@portfolio/ui';
import { useTranslation } from 'react-i18next';
import { CoachBubble } from './CoachBubble';
import type { MascotPose } from './Mascot';

interface Props {
  visible: boolean;
  text: string;
  pose?: MascotPose;
  onDismiss: () => void;
  dismissLabel?: string;
}

/**
 * First-run guide: a dimmed backdrop with Semillita + a tip at the bottom.
 * Tapping the backdrop or the button dismisses it. Used once per screen via
 * useCoachMark so Semillita walks a new user through the app.
 */
export function CoachMark({ visible, text, pose = 'idle', onDismiss, dismissLabel }: Props) {
  const colors = useColors();
  const { spacing } = useTheme();
  const { t } = useTranslation();
  const s = useMemo(() => makeStyles(spacing), [spacing]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onDismiss} />
      <View style={s.cardWrap} pointerEvents="box-none">
        <View style={[s.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <CoachBubble
            text={text}
            pose={pose}
            onNext={onDismiss}
            nextLabel={dismissLabel ?? t('coach.gotIt')}
          />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (spacing: Record<string, number>) =>
  StyleSheet.create({
    backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
    cardWrap: { flex: 1, justifyContent: 'flex-end' },
    card: {
      margin: spacing.lg,
      padding: spacing.lg,
      borderRadius: 24,
      borderWidth: 1,
    },
  });
