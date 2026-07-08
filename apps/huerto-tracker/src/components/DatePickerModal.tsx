import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@portfolio/ui';
import { GlassView, isLiquidGlassAvailable } from '../utils/glassEffect';
import { Button } from '@portfolio/ui';
import { dateToStr } from '../utils/dateStr';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

interface DatePickerModalProps {
  value: string;
  onChange: (dateStr: string) => void;
  quickChips?: number[];
  showClear?: boolean;
  onClear?: () => void;
  i18nPrefix?: string;
  inputStyle?: object;
}

export function DatePickerModal({
  value,
  onChange,
  quickChips = [0, 1, 2],
  showClear = false,
  onClear,
  i18nPrefix = 'entryNew',
  inputStyle,
}: DatePickerModalProps) {
  const { colors, spacing, fontSize, fontWeight, radii } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      {/* Quick-date chips */}
      {quickChips.length > 0 && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
          {quickChips.map((days) => {
            const d = new Date();
            d.setDate(d.getDate() - days);
            const dateStr = dateToStr(d);
            const active = value === dateStr;
            return (
              <Pressable
                key={days}
                onPress={() => onChange(dateStr)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing.sm,
                  borderRadius: radii.full,
                  borderWidth: 1.5,
                  backgroundColor: active ? colors.primary + '22' : colors.surfaceAlt,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: active ? colors.primary : colors.textSecondary }}>
                  {days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} días`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Calendar trigger */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={[{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1.5,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          }, inputStyle]}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontSize: fontSize.md, flex: 1 }}>{value}</Text>
        </Pressable>
        {showClear && (
          <Pressable onPress={onClear} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Android DateTimePicker */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={new Date(value + 'T12:00:00')}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowPicker(false);
            if (d) onChange(dateToStr(d));
          }}
        />
      )}

      {/* iOS DateTimePicker Modal */}
      {showPicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
            onPress={() => setShowPicker(false)}
          >
            <Pressable
              style={{
                borderTopLeftRadius: radii.xl,
                borderTopRightRadius: radii.xl,
                paddingTop: spacing.sm,
                alignItems: 'center',
                backgroundColor: glassAvailable ? 'transparent' : colors.surface,
                overflow: 'hidden',
              }}
              onPress={() => {}}
            >
              {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
              <View style={{ width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md, backgroundColor: colors.border }} />
              <DateTimePicker
                value={new Date(value + 'T12:00:00')}
                mode="date"
                display="spinner"
                onChange={(_, d) => { if (d) onChange(dateToStr(d)); }}
                style={{ width: '100%' }}
              />
              <Button
                title="Guardar"
                onPress={() => setShowPicker(false)}
                size="lg"
                style={{ margin: spacing.xl, marginTop: 0 }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
