import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { Button as SharedButton, useTheme } from '@portfolio/ui';

type Props = React.ComponentProps<typeof SharedButton>;

/** App button: keeps the label readable against the active theme colour. */
export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style }: Props) {
  const { colors, spacing, fontSize, fontWeight, radii } = useTheme();
  const inactive = Boolean(disabled || loading);
  const backgroundColor = variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surfaceAlt : 'transparent';
  const foreground = variant === 'primary' ? colors.primaryDark : colors.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: inactive, busy: Boolean(loading) }} disabled={inactive} onPress={onPress}
      style={({ pressed }) => [{ minHeight: 48, paddingVertical: size === 'lg' ? spacing.md : spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.md, borderWidth: variant === 'outline' ? 1.5 : 0, borderColor: colors.border, backgroundColor, alignItems: 'center', justifyContent: 'center', opacity: inactive ? 0.5 : pressed ? 0.8 : 1 }, style]}>
      {loading ? <ActivityIndicator color={foreground} /> : <Text style={{ color: foreground, textAlign: 'center', fontSize: size === 'sm' ? fontSize.sm : fontSize.md, fontWeight: fontWeight.semibold }}>{title}</Text>}
    </Pressable>
  );
}
