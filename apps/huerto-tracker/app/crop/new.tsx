import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORY_CONFIG, type CropCategory } from '../../src/data/crops';
import { type CustomCrop } from '../../src/models/custom-crop';

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as CropCategory[];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function NewCustomCropScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();

  const collection = useCollection<CustomCrop>('custom_crops');
  const existing = editId ? collection.items.find((c) => c.id === editId) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '🌱');
  const [category, setCategory] = useState<CropCategory>(existing?.category ?? 'hojas');
  const [daysMin, setDaysMin] = useState(String(existing?.daysToHarvestMin ?? 60));
  const [daysMax, setDaysMax] = useState(String(existing?.daysToHarvestMax ?? 90));
  const [sowingMonths, setSowingMonths] = useState<number[]>(existing?.sowingMonths ?? []);
  const [harvestMonths, setHarvestMonths] = useState<number[]>(existing?.harvestMonths ?? []);
  const [sunNeeds, setSunNeeds] = useState<'full' | 'partial' | 'shade'>(existing?.sunNeeds ?? 'full');
  const [waterNeeds, setWaterNeeds] = useState<'high' | 'medium' | 'low'>(existing?.waterNeeds ?? 'medium');
  const [spacingCm, setSpacingCm] = useState(String(existing?.spacing ?? 30));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setEmoji(existing.emoji);
    setCategory(existing.category);
    setDaysMin(String(existing.daysToHarvestMin));
    setDaysMax(String(existing.daysToHarvestMax));
    setSowingMonths(existing.sowingMonths);
    setHarvestMonths(existing.harvestMonths);
    setSunNeeds(existing.sunNeeds);
    setWaterNeeds(existing.waterNeeds);
    setSpacingCm(String(existing.spacing));
    setNotes(existing.notes ?? '');
  }, [existing?.id]);

  const monthLabels = (t('customCrop.months', { returnObjects: true }) as unknown) as string[];

  function toggleMonth(set: number[], setFn: (v: number[]) => void, m: number) {
    setFn(set.includes(m) ? set.filter((x) => x !== m) : [...set, m].sort((a, b) => a - b));
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        emoji: emoji.trim() || '🌱',
        category,
        daysToHarvestMin: Math.max(1, parseInt(daysMin) || 60),
        daysToHarvestMax: Math.max(1, parseInt(daysMax) || 90),
        sowingMonths,
        harvestMonths,
        sunNeeds,
        waterNeeds,
        spacing: Math.max(1, parseInt(spacingCm) || 30),
        notes: notes.trim(),
      };
      if (editId && existing) {
        await collection.update(editId, data);
      } else {
        await collection.create(data);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editId) return;
    Alert.alert(
      t('customCrop.deleteTitle'),
      t('customCrop.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            // Soft-delete syncs the tombstone to other devices on next push.
            await collection.softRemove(editId);
            router.back();
          },
        },
      ]
    );
  }

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  if (editId && collection.loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[s.title, { color: colors.text }]}>{t('customCrop.edit')}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (editId && !existing) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: spacing.xl }}>{t('customCrop.notFound', { defaultValue: t('customCrop.empty') })}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>
          {editId ? 'Editar Cultivo' : 'Nuevo Cultivo'}
        </Text>
        <Pressable onPress={editId ? handleSave : handleSave} hitSlop={12} style={s.saveHeaderBtn} disabled={saving || !name.trim()}>
          <Text style={{ color: !name.trim() || saving ? colors.textDisabled : colors.primary, fontWeight: fontWeight.bold }}>Guardar</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={[s.stitchHero, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary + '33' }]}>
            <View style={[s.stitchHeroIcon, { backgroundColor: colors.surface }]}>
              <Ionicons name="leaf-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.stitchHeroTitle, { color: colors.text }]}>¡Ampliando tu huerto urbano!</Text>
              <Text style={[s.stitchHeroText, { color: colors.textSecondary }]}>Configura las condiciones ideales para que crezca sano en balcones y terrazas.</Text>
            </View>
          </View>

          <Text style={[s.sectionHeading, { color: colors.text }]}>1. IDENTIFICACIÓN BÁSICA</Text>
          {/* Name + Emoji */}
          <View style={s.row}>
            <TextInput
              style={[s.emojiInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
              value={emoji}
              onChangeText={setEmoji}
              maxLength={2}
            />
            <TextInput
              style={[s.nameInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
              placeholder={t('customCrop.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={40}
            />
          </View>

          {/* Category */}
          <Text style={[s.label, { color: colors.textSecondary }]}>Familia botánica</Text>
          <View style={s.chips}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  s.chip,
                  {
                    backgroundColor: category === cat ? colors.accent : colors.surface,
                    borderColor: category === cat ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 14 }}>{CATEGORY_CONFIG[cat].emoji}</Text>
                <Text style={[s.chipText, { color: category === cat ? colors.primaryDark : colors.text }]}>
                  {t('cropCategory.' + cat)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[s.sectionHeading, { color: colors.text }]}>2. MACETA Y LUZ SOLAR</Text>
          <Text style={[s.label, { color: colors.textSecondary }]}>Volumen mínimo de sustrato</Text>
          <Text style={[s.stitchHint, { color: colors.textSecondary }]}>Selecciona la capacidad que mejor encaja con este cultivo.</Text>

          {/* Days to harvest */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('customCrop.daysToHarvest')}</Text>
          <View style={s.row}>
            <View style={s.halfInput}>
              <Text style={[s.sublabel, { color: colors.textSecondary }]}>{t('customCrop.daysMin')}</Text>
              <TextInput
                style={[s.numInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                value={daysMin}
                onChangeText={setDaysMin}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <View style={s.halfInput}>
              <Text style={[s.sublabel, { color: colors.textSecondary }]}>{t('customCrop.daysMax')}</Text>
              <TextInput
                style={[s.numInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                value={daysMax}
                onChangeText={setDaysMax}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          <Text style={[s.sectionHeading, { color: colors.text }]}>3. ESTACIONALIDAD EN ESPAÑA</Text>
          {/* Sowing months */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('customCrop.sowingMonths')}</Text>
          <View style={s.monthGrid}>
            {MONTHS.map((m) => (
              <Pressable
                key={m}
                onPress={() => toggleMonth(sowingMonths, setSowingMonths, m)}
                style={[
                  s.monthChip,
                  {
                    backgroundColor: sowingMonths.includes(m) ? colors.accent : colors.surface,
                    borderColor: sowingMonths.includes(m) ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={[s.monthText, { color: sowingMonths.includes(m) ? colors.primaryDark : colors.textSecondary }]}>
                  {monthLabels[m - 1]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Harvest months */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('customCrop.harvestMonths')}</Text>
          <View style={s.monthGrid}>
            {MONTHS.map((m) => (
              <Pressable
                key={m}
                onPress={() => toggleMonth(harvestMonths, setHarvestMonths, m)}
                style={[
                  s.monthChip,
                  {
                    backgroundColor: harvestMonths.includes(m) ? '#FF9800' : colors.surface,
                    borderColor: harvestMonths.includes(m) ? '#FF9800' : colors.border,
                  },
                ]}
              >
                <Text style={[s.monthText, { color: harvestMonths.includes(m) ? '#fff' : colors.textSecondary }]}>
                  {monthLabels[m - 1]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Sun needs */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('customCrop.sun')}</Text>
          <View style={s.row}>
            {(['full', 'partial', 'shade'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setSunNeeds(v)}
                style={[
                  s.optionChip,
                  {
                    backgroundColor: sunNeeds === v ? colors.accent : colors.surface,
                    borderColor: sunNeeds === v ? colors.accent : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={v === 'full' ? 'sunny-outline' : v === 'partial' ? 'partly-sunny-outline' : 'moon-outline'}
                  size={17}
                  color={sunNeeds === v ? '#fff' : colors.secondary}
                />
                <Text style={[s.chipText, { color: sunNeeds === v ? '#fff' : colors.text, marginLeft: 4 }]}>
                  {t('customCrop.sun' + (v === 'full' ? 'Full' : v === 'partial' ? 'Partial' : 'Shade'))}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[s.sectionHeading, { color: colors.text }]}>4. REGLA DE RIEGO</Text>
          <View style={[s.irrigationNote, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent + '66' }]}>
            <Ionicons name="finger-print-outline" size={19} color={colors.primary} />
            <Text style={[s.stitchHint, { color: colors.textSecondary }]}>Diagnóstico de 2 cm en sustrato · Avisar para comprobar humedad antes de regar.</Text>
          </View>

          {/* Water needs */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('customCrop.water')}</Text>
          <View style={s.row}>
            {(['high', 'medium', 'low'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setWaterNeeds(v)}
                style={[
                  s.optionChip,
                  {
                    backgroundColor: waterNeeds === v ? '#2196F3' : colors.surface,
                    borderColor: waterNeeds === v ? '#2196F3' : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={v === 'low' ? 'rainy-outline' : 'water-outline'}
                  size={17}
                  color={waterNeeds === v ? '#fff' : '#2196F3'}
                />
                <Text style={[s.chipText, { color: waterNeeds === v ? '#fff' : colors.text, marginLeft: 4 }]}>
                  {t('customCrop.water' + (v === 'high' ? 'High' : v === 'medium' ? 'Medium' : 'Low'))}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Spacing */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('customCrop.spacing')}</Text>
          <TextInput
            style={[s.numInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, alignSelf: 'flex-start', width: 100 }]}
            value={spacingCm}
            onChangeText={setSpacingCm}
            keyboardType="number-pad"
            maxLength={4}
          />

          <Text style={[s.sectionHeading, { color: colors.text }]}>5. FOTO DEL CULTIVO</Text>
          <Text style={[s.stitchHint, { color: colors.textSecondary }]}>Personaliza tu maceta con una nota o una imagen en el siguiente paso.</Text>
          {/* Notes */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('customCrop.notes')}</Text>
          <TextInput
            style={[s.notesInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            placeholder={t('customCrop.notesPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={400}
          />

          <Pressable
            onPress={handleSave}
            disabled={saving || !name.trim()}
            style={[
              s.saveBtn,
              { backgroundColor: (!name.trim() || saving) ? colors.border : colors.accent },
            ]}
          >
            <Text style={[s.saveBtnText, { color: !name.trim() || saving ? colors.textSecondary : colors.primaryDark }]}>
              {t('customCrop.save')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, spacing: any, fontSize: any, fontWeight: any, radii: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing.xs, marginRight: spacing.sm },
    deleteBtn: { padding: spacing.xs, marginLeft: 'auto' },
    saveHeaderBtn: { minWidth: 56, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
    title: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
    scroll: { padding: spacing.md, paddingBottom: 60 },
    stitchHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, marginBottom: spacing.sm },
    stitchHeroIcon: { width: 44, height: 44, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
    stitchHeroTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    stitchHeroText: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 3 },
    sectionHeading: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 0.3, marginTop: spacing.lg, marginBottom: spacing.xs },
    stitchHint: { fontSize: fontSize.xs, lineHeight: 18 },
    irrigationNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderRadius: radii.md, marginTop: spacing.sm },
    label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: spacing.lg, marginBottom: spacing.xs },
    sublabel: { fontSize: fontSize.xs, marginBottom: 4 },
    row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    emojiInput: {
      width: 56, height: 56, borderWidth: 1, borderRadius: radii.md,
      fontSize: 28, textAlign: 'center',
    },
    nameInput: {
      flex: 1, height: 56, borderWidth: 1, borderRadius: radii.md,
      paddingHorizontal: spacing.md, fontSize: fontSize.md,
    },
    numInput: {
      height: 44, borderWidth: 1, borderRadius: radii.md,
      paddingHorizontal: spacing.md, fontSize: fontSize.md, textAlign: 'center',
    },
    halfInput: { flex: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingVertical: 6, paddingHorizontal: 12,
      borderRadius: radii.pill, borderWidth: 1,
    },
    chipText: { fontSize: fontSize.sm },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    monthChip: {
      width: 48, height: 36, borderRadius: radii.sm, borderWidth: 1,
      alignItems: 'center', justifyContent: 'center',
    },
    monthText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    optionChip: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 10, borderRadius: radii.md, borderWidth: 1,
    },
    notesInput: {
      borderWidth: 1, borderRadius: radii.md, padding: spacing.md,
      fontSize: fontSize.sm, minHeight: 100, textAlignVertical: 'top',
    },
    saveBtn: {
      marginTop: spacing.xl, borderRadius: radii.md,
      paddingVertical: spacing.md, alignItems: 'center',
    },
    saveBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  });
