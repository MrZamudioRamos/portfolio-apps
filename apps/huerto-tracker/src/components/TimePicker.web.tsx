import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@portfolio/ui';
import { View, Text } from 'react-native';
import type { TimePickerProps } from './TimePicker';

export function TimePicker({ hour, minute, label, hint, onChange }: TimePickerProps) {
  const { colors, fontSize, fontWeight, radii } = useTheme();
  const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const updateTime = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const next = (event.currentTarget as typeof event.currentTarget & { value: string }).value;
    const match = /^(\d{2}):(\d{2})$/.exec(next);
    if (match) onChange(Number(match[1]), Number(match[2]));
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, padding: 14, borderRadius: 18, borderWidth: 1, backgroundColor: colors.surfaceAlt, borderColor: colors.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '1c' }}>
        <Ionicons name="time-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: fontWeight.bold }}>{label}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{hint}</Text>
      </View>
      <input
        type="time"
        aria-label={label}
        value={value}
        step={300}
        onInput={updateTime}
        onChange={updateTime}
        style={{ boxSizing: 'border-box', minHeight: 44, width: 112, borderRadius: radii.md, padding: '0 10px', backgroundColor: colors.surface, color: colors.text, border: '1px solid ' + colors.border, fontFamily: 'inherit', fontSize: fontSize.md, fontWeight: fontWeight.bold, colorScheme: colors.background.startsWith('#0') ? 'dark' : 'light' }}
      />
    </View>
  );
}
