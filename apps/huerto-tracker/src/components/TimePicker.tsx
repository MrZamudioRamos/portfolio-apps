import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Button, useTheme } from '@portfolio/ui';
import { GlassView, isLiquidGlassAvailable } from '../utils/glassEffect';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

export interface TimePickerProps {
  hour: number;
  minute: number;
  label: string;
  hint: string;
  confirmLabel: string;
  onChange: (hour: number, minute: number) => void;
}

function timeValue(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function TimePicker({ hour, minute, label, hint, confirmLabel, onChange }: TimePickerProps) {
  const { colors, spacing } = useTheme();
  const [visible, setVisible] = useState(false);
  const value = timeValue(hour, minute);

  function handleChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setVisible(false);
    if (selected) onChange(selected.getHours(), selected.getMinutes());
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
        onPress={() => setVisible(true)}
        style={[s.trigger, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
      >
        <View style={[s.icon, { backgroundColor: colors.primary + '1c' }]}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
        </View>
        <View style={s.copy}>
          <Text style={[s.label, { color: colors.text }]}>{label}</Text>
          <Text style={[s.hint, { color: colors.textSecondary }]}>{hint}</Text>
        </View>
        <View style={s.valueWrap}>
          <Text style={[s.value, { color: colors.text }]}>{String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</Text>
          <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
        </View>
      </Pressable>

      {visible && Platform.OS === 'android' && (
        <DateTimePicker
          value={value}
          mode="time"
          display="clock"
          is24Hour
          minuteInterval={5}
          onChange={handleChange}
        />
      )}

      {visible && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible>
          <Pressable style={s.overlay} onPress={() => setVisible(false)}>
            <Pressable
              style={[s.sheet, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, overflow: 'hidden' }]}
              onPress={() => {}}
            >
              {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
              <View style={[s.handle, { backgroundColor: colors.border }]} />
              <View style={s.sheetHeader}>
                <View>
                  <Text style={[s.sheetTitle, { color: colors.text }]}>{label}</Text>
                  <Text style={[s.sheetHint, { color: colors.textSecondary }]}>{hint}</Text>
                </View>
                <Text style={[s.sheetValue, { color: colors.primary }]}>{String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</Text>
              </View>
              <DateTimePicker
                value={value}
                mode="time"
                display="spinner"
                is24Hour
                minuteInterval={5}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
              <Button
                title={confirmLabel}
                onPress={() => setVisible(false)}
                size="lg"
                style={{ margin: spacing.xl, marginTop: spacing.sm }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 70,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  label: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 16 },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontSize: 21, fontWeight: '800', letterSpacing: 0.4 },
  overlay: { flex: 1, backgroundColor: 'rgba(10, 18, 10, 0.42)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, alignItems: 'center' },
  handle: { width: 42, height: 5, borderRadius: 3, marginBottom: 18 },
  sheetHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  sheetTitle: { fontSize: 19, fontWeight: '800' },
  sheetHint: { fontSize: 13, marginTop: 3 },
  sheetValue: { fontSize: 24, fontWeight: '800' },
});
