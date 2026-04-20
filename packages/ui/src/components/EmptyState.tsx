import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ emoji, title, description, ctaLabel, onCta }: EmptyStateProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'] }}>
      <Text style={{ fontSize: 56, marginBottom: spacing.lg }}>{emoji}</Text>
      <Text
        style={{
          fontSize: fontSize.xl,
          fontWeight: fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: fontSize.md,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: ctaLabel ? spacing.xl : 0,
        }}
      >
        {description}
      </Text>
      {ctaLabel && onCta && (
        <Button title={ctaLabel} onPress={onCta} variant="primary" size="md" />
      )}
    </View>
  );
}
