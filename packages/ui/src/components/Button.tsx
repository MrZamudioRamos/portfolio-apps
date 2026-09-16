import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const { colors, spacing, fontSize, radii, fontWeight } = useTheme();

  const sizeStyles = {
    // Keep every action comfortable for iOS and VoiceOver users. Stitch's
    // generated screens consistently used 44pt controls and 52pt primaries.
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44, textSize: fontSize.sm },
    md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 44, textSize: fontSize.md },
    lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 52, textSize: fontSize.lg },
  }[size];

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: colors.primary, text: '#FFFFFF' },
    secondary: { bg: colors.surfaceAlt, text: colors.primary },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', text: colors.primary },
  };

  const vs = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        {
          backgroundColor: vs.bg,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          minHeight: sizeStyles.minHeight,
          borderRadius: radii.xl,
          borderWidth: vs.border ? 1.5 : 0,
          borderColor: vs.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <Text
          style={{
            color: vs.text,
            fontSize: sizeStyles.textSize,
            fontWeight: fontWeight.semibold,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
