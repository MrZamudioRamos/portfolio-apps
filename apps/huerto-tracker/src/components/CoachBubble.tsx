import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Mascot, type MascotPose } from './Mascot';
import { ScalePress } from './ScalePress';

interface Props {
  text: string;
  pose?: MascotPose;
  onNext?: () => void;
  nextLabel?: string;
  onSkip?: () => void;
  skipLabel?: string;
  /** progress dots */
  step?: number;
  total?: number;
}

/**
 * Semillita + a speech bubble + a next button. The reusable coach unit:
 * drop it in onboarding or at any first-use moment.
 */
export function CoachBubble({
  text,
  pose = 'idle',
  onNext,
  nextLabel,
  onSkip,
  skipLabel,
  step,
  total,
}: Props) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  return (
    <View style={s.wrap}>
      {/* speech bubble */}
      <View style={[s.bubble, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.md }]}>
        <Text style={[s.text, { color: colors.text }]}>{text}</Text>
        <View style={[s.tail, { backgroundColor: colors.surface, borderColor: colors.border }]} />
      </View>

      {/* mascot + controls */}
      <View style={s.row}>
        <Mascot pose={pose} size={96} />
        <View style={{ flex: 1 }} />
        {onSkip && (
          <Pressable onPress={onSkip} hitSlop={8} style={s.skip}>
            <Text style={[s.skipText, { color: colors.textSecondary }]}>{skipLabel ?? 'Saltar'}</Text>
          </Pressable>
        )}
        {onNext && (
          <ScalePress
            onPress={onNext}
            style={[s.next, { backgroundColor: colors.primary, ...shadows.sm }]}
          >
            <Text style={s.nextText}>{nextLabel ?? 'Siguiente'}</Text>
          </ScalePress>
        )}
      </View>

      {/* progress dots */}
      {typeof step === 'number' && typeof total === 'number' && total > 1 && (
        <View style={s.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor: i <= step ? colors.primary : colors.border,
                  width: i === step ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) =>
  StyleSheet.create({
    wrap: { width: '100%', gap: spacing.lg },
    bubble: {
      borderRadius: radii.xl,
      borderWidth: 1,
      padding: spacing.lg,
    },
    text: { fontSize: fontSize.lg, lineHeight: 26, fontWeight: fontWeight.medium },
    tail: {
      position: 'absolute',
      bottom: -7,
      left: 36,
      width: 14,
      height: 14,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      transform: [{ rotate: '45deg' }],
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    skip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    skipText: { fontSize: fontSize.md },
    next: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.full,
    },
    nextText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
    dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
    dot: { height: 8, borderRadius: 4 },
  });
