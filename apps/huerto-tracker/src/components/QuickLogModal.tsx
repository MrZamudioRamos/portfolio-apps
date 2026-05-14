import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { DiaryEntry, EntryType } from '../models/diary-entry';
import { CROPS_BY_ID } from '../data';
import type { Plant } from '../models/plant';
import { getPestsForCrop } from '../data/pests';
import { useActiveGarden } from '../hooks/useActiveGarden';

interface QuickAction {
  type: EntryType;
  emoji: string;
  label: string;
  color: string;
  hasNote?: boolean;
  hasWeight?: boolean;
}


interface Props {
  plant: Plant | null;
  visible: boolean;
  onClose: () => void;
}

export function QuickLogModal({ plant, visible, onClose }: Props) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t } = useTranslation();

  const QUICK_ACTIONS: QuickAction[] = [
    { type: 'watering',    emoji: '💧', label: t('quickLog.water'),     color: '#29B6F6' },
    { type: 'harvest',     emoji: '🧺', label: t('quickLog.harvest'),   color: '#FF7043', hasWeight: true },
    { type: 'pest',        emoji: '🐛', label: t('quickLog.pest'),      color: '#EF5350', hasNote: true },
    { type: 'fertilizing', emoji: '🌾', label: t('quickLog.fertilize'), color: '#FFA726' },
    { type: 'pruning',     emoji: '✂️', label: t('quickLog.prune'),     color: '#AB47BC' },
    { type: 'note',        emoji: '📝', label: t('quickLog.note'),      color: '#78909C', hasNote: true },
  ];

  const { activeGarden } = useActiveGarden();
  const entries = useCollection<DiaryEntry>('diary_entries');
  const plants = useCollection<Plant>('plants');

  const [selected, setSelected] = useState<QuickAction | null>(null);
  const [note, setNote] = useState('');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'kg' | 'units'>('kg');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const crop = plant ? CROPS_BY_ID[plant.cropId] : null;
  const gardenId = activeGarden?.id ?? '';
  const suggestedPests = plant && crop ? getPestsForCrop(crop.id).slice(0, 3) : [];

  function reset() {
    setSelected(null);
    setNote('');
    setWeight('');
    setUnit('kg');
    setSaving(false);
    setDone(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    if (!selected || !gardenId || !plant) return;
    setSaving(true);
    try {
      const harvestData = selected.hasWeight && weight.trim()
        ? { weight: weight.trim(), unit }
        : undefined;
      await entries.create({
        gardenId,
        plantId: plant.id,
        type: selected.type,
        date: new Date().toISOString().split('T')[0],
        ...(note.trim() ? { notes: note.trim() } : {}),
        ...(harvestData ? { data: harvestData } : {}),
      });
      // Auto-update pestStatus on plant
      if (selected.type === 'pest') {
        await plants.update(plant.id, { pestStatus: 'active' });
      } else if (selected.type === 'treatment' && plant.pestStatus === 'active') {
        await plants.update(plant.id, { pestStatus: 'treated' });
      }
      setDone(true);
      setTimeout(() => { handleClose(); }, 900);
    } finally {
      setSaving(false);
    }
  }

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (!plant) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kavWrapper}
        pointerEvents="box-none"
      >
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Plant header */}
          <View style={s.plantHeader}>
            <Text style={s.plantEmoji}>{crop?.emoji ?? '🌱'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.plantName, { color: colors.text }]} numberOfLines={1}>
                {plant.name}
              </Text>
              {plant.variety ? (
                <Text style={[s.plantVariety, { color: colors.textSecondary }]} numberOfLines={1}>
                  {plant.variety}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {done ? (
            <View style={s.doneBox}>
              <Text style={s.doneEmoji}>✅</Text>
              <Text style={[s.doneText, { color: colors.text }]}>{t('quickLog.done')}</Text>
            </View>
          ) : (
            <>
              {/* Action grid */}
              <View style={s.actionGrid}>
                {QUICK_ACTIONS.map((action) => {
                  const active = selected?.type === action.type;
                  return (
                    <Pressable
                      key={action.type}
                      onPress={() => setSelected(active ? null : action)}
                      style={[
                        s.actionBtn,
                        {
                          backgroundColor: active ? action.color + '22' : colors.surfaceAlt,
                          borderColor: active ? action.color : colors.border,
                        },
                      ]}
                    >
                      <Text style={s.actionEmoji}>{action.emoji}</Text>
                      <Text style={[s.actionLabel, { color: active ? action.color : colors.textSecondary }]}>
                        {action.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Pest suggestions */}
              {selected?.type === 'pest' && suggestedPests.length > 0 && (
                <View style={[s.pestSuggestions, { backgroundColor: '#EF535010', borderColor: '#EF5350' }]}>
                  <Text style={[s.pestSuggestLabel, { color: '#EF5350' }]}>🐛 {t('quickLog.commonPests', { crop: crop?.name })}</Text>
                  <View style={s.pestChips}>
                    {suggestedPests.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => setNote((prev) => prev ? prev : p.name)}
                        style={[s.pestChip, { borderColor: '#EF535066' }]}
                      >
                        <Text style={[s.pestChipText, { color: colors.text }]}>{p.emoji} {p.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Treatment tip if plant has active pest */}
              {selected?.type === 'treatment' && plant.pestStatus === 'active' && (
                <View style={[s.pestSuggestions, { backgroundColor: '#FF980010', borderColor: '#FF9800' }]}>
                  <Text style={[s.pestSuggestLabel, { color: '#FF9800' }]}>
                    🧴 {t('quickLog.treatmentTip')}
                  </Text>
                </View>
              )}

              {/* Extra inputs */}
              {selected?.hasNote && (
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={selected.type === 'pest' ? t('quickLog.pestPlaceholder') : t('quickLog.notePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[
                    s.noteInput,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
                  ]}
                />
              )}

              {selected?.hasWeight && (
                <View style={{ gap: spacing.xs }}>
                  <View style={s.weightRow}>
                    <Ionicons name="scale-outline" size={18} color={colors.textSecondary} />
                    <TextInput
                      value={weight}
                      onChangeText={setWeight}
                      placeholder={unit === 'kg' ? t('quickLog.weightKgPlaceholder') : t('quickLog.weightUnitsPlaceholder')}
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="decimal-pad"
                      style={[
                        s.weightInput,
                        { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
                      ]}
                    />
                    <View style={[s.unitToggle, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                      {(['kg', 'units'] as const).map((u) => (
                        <Pressable
                          key={u}
                          onPress={() => setUnit(u)}
                          style={[
                            s.unitBtn,
                            unit === u && { backgroundColor: '#FF7043', borderRadius: radii.sm - 1 },
                          ]}
                        >
                          <Text style={[s.unitBtnText, { color: unit === u ? '#fff' : colors.textSecondary }]}>
                            {u === 'kg' ? 'kg' : t('quickLog.units')}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Save button */}
              <Pressable
                onPress={handleSave}
                disabled={!selected || saving}
                style={[
                  s.saveBtn,
                  {
                    backgroundColor: selected ? selected.color : colors.border,
                    opacity: !selected || saving ? 0.6 : 1,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.saveBtnText}>
                    {selected ? t('quickLog.save', { action: selected.label.toLowerCase() }) : t('quickLog.chooseAction')}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    kavWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: radii.xl ?? 20,
      borderTopRightRadius: radii.xl ?? 20,
      paddingHorizontal: spacing.xl,
      paddingBottom: 36,
      paddingTop: spacing.md,
      gap: spacing.lg,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: spacing.sm,
    },
    plantHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    plantEmoji: { fontSize: 32 },
    plantName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    plantVariety: { fontSize: fontSize.xs, marginTop: 1 },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    actionBtn: {
      width: '30%',
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      gap: 4,
    },
    actionEmoji: { fontSize: 26 },
    actionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    noteInput: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      padding: spacing.md,
      fontSize: fontSize.sm,
      minHeight: 80,
    },
    weightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    weightInput: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.md,
    },
    unitToggle: {
      flexDirection: 'row',
      borderWidth: 1.5,
      borderRadius: radii.sm,
      overflow: 'hidden',
    },
    unitBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    saveBtn: {
      paddingVertical: spacing.lg,
      borderRadius: radii.lg,
      alignItems: 'center',
    },
    saveBtnText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
    },
    pestSuggestions: {
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: spacing.xs,
    },
    pestSuggestLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    pestChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    pestChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    pestChipText: { fontSize: fontSize.xs },
    doneBox: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.md,
    },
    doneEmoji: { fontSize: 48 },
    doneText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  });
