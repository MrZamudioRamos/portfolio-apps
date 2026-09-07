import React from 'react';
import { useTheme } from '@portfolio/ui';
import type { WebDatePickerProps } from './WebDatePicker';

export function WebDatePicker({ value, label, onChange }: WebDatePickerProps) {
  const { colors, radii, isDark } = useTheme();
  return <input type="date" aria-label={label} value={value} onChange={(event) => {
    // The native-focused tsconfig omits DOM members; this is a real HTML date input.
    const date = (event.currentTarget as typeof event.currentTarget & { value: string }).value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) onChange(date);
  }} style={{ boxSizing: 'border-box', minHeight: 48, width: '100%', borderRadius: radii.md, padding: 12, backgroundColor: colors.surface, color: colors.text, border: '1px solid ' + colors.border, font: 'inherit', colorScheme: isDark ? 'dark' : 'light' }} />;
}
