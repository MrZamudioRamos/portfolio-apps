import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from './Card';

interface StatCardProps {
  emoji: string;
  value: string | number;
  label: string;
  onPress?: () => void;
}

export function StatCard({ emoji, value, label, onPress }: StatCardProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  return (
    <Card onPress={onPress} padded>
      <Text style={{ fontSize: 28, marginBottom: spacing.xs }}>{emoji}</Text>
      <Text
        style={{
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.bold,
          color: colors.primary,
          marginBottom: 2,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{label}</Text>
    </Card>
  );
}
