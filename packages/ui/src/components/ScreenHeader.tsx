import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  variant?: 'centered' | 'left';
  borderBottom?: boolean;
  backgroundColor?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  variant = 'centered',
  borderBottom = true,
  backgroundColor,
}: ScreenHeaderProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const borderStyle = borderBottom ? { borderBottomColor: colors.border, borderBottomWidth: 1 } : {};

  if (variant === 'left') {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, borderStyle, backgroundColor ? { backgroundColor } : {}]}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
        )}
        <View style={{ flex: 1, marginLeft: onBack ? spacing.md : 0 }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text }}>{title}</Text>
          {subtitle && <Text style={{ fontSize: fontSize.xs, marginTop: 1, color: colors.textSecondary }}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    );
  }

  // centered variant
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, borderStyle, backgroundColor ? { backgroundColor } : {}]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={{ width: 24 }} />
      )}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center' }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: fontSize.xs, marginTop: 1, color: colors.textSecondary }}>{subtitle}</Text>}
      </View>
      {right ?? <View style={{ width: 24 }} />}
    </View>
  );
}
