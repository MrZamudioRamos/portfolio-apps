import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Mascot, type MascotPose } from './Mascot';

interface Props {
  title: string;
  subtitle?: string;
  pose?: MascotPose;
}

/**
 * Compact Semillita + title/subtitle. Lets the mascot narrate a step or
 * section without crowding the form below it.
 */
export function CoachHeader({ title, subtitle, pose = 'point' }: Props) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight } = useTheme();
  const s = useMemo(() => makeStyles(spacing, fontSize, fontWeight), [spacing, fontSize, fontWeight]);

  return (
    <View style={s.row}>
      <Mascot pose={pose} size={56} />
      <View style={s.col}>
        <Text style={[s.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[s.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const makeStyles = (
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight']
) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    col: { flex: 1 },
    title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    subtitle: { fontSize: fontSize.md, lineHeight: 22, marginTop: 2 },
  });
