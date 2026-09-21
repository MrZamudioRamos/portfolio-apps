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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORY_CONFIG, type CropCategory } from '../../src/data/crops';
import { type CustomCrop } from '../../src/models/custom-crop';
import { usePickPhoto } from '../../src/hooks/usePickPhoto';

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as CropCategory[];
const FAMILY_OPTIONS: Array<{ value: CropCategory; label: string }> = [
  { value: 'frutas', label: 'Rosáceas (Fresa, Zarzamora...)' },
  { value: 'frutas', label: 'Solanáceas (Tomate, Pimiento, Berenjena)' },
  { value: 'aromaticas', label: 'Lamiáceas (Albahaca, Romero, Menta)' },
  { value: 'cucurbitaceas', label: 'Cucurbitáceas (Calabacín, Pepino)' },
  { value: 'cruciferas', label: 'Crucíferas (Rúcula, Rábano, Col)' },
  { value: 'legumbres', label: 'Leguminosas (Guisantes, Habas)' },
];

export default function NewCustomCropScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();

  const collection = useCollection<CustomCrop>('custom_crops');
  const existing = editId ? collection.items.find((c) => c.id === editId) : null;

  const [name, setName] = useState(existing?.name ?? 'Fresón de Aranjuez');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '🍓');
  const [category, setCategory] = useState<CropCategory>(existing?.category ?? 'frutas');
  const [daysMin, setDaysMin] = useState(String(existing?.daysToHarvestMin ?? 60));
  const [daysMax, setDaysMax] = useState(String(existing?.daysToHarvestMax ?? 90));
  const [sowingMonths, setSowingMonths] = useState<number[]>(existing?.sowingMonths ?? []);
  const [harvestMonths, setHarvestMonths] = useState<number[]>(existing?.harvestMonths ?? []);
  const [sunNeeds, setSunNeeds] = useState<'full' | 'partial' | 'shade'>(existing?.sunNeeds ?? 'full');
  const [volume, setVolume] = useState('12 L');
  const [waterNeeds, setWaterNeeds] = useState<'high' | 'medium' | 'low'>(existing?.waterNeeds ?? 'medium');
  const [spacingCm, setSpacingCm] = useState(String(existing?.spacing ?? 30));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [showFamilyMenu, setShowFamilyMenu] = useState(false);
  const [familyLabel, setFamilyLabel] = useState(FAMILY_OPTIONS[0].label);
  const [season, setSeason] = useState<'spring' | 'autumn' | 'winter'>('spring');
  const [daysEstimate, setDaysEstimate] = useState(75);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const { pickFromCamera, pickFromGallery, picking } = usePickPhoto({ aspect: [4, 3], quality: 0.8 });

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
    setDaysEstimate(Math.round((existing.daysToHarvestMin + existing.daysToHarvestMax) / 2));
  }, [existing?.id]);

  async function choosePhoto(fromCamera: boolean) {
    const result = await (fromCamera ? pickFromCamera() : pickFromGallery());
    if (result.kind === 'success') setPhotoUri(result.uri);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        emoji: emoji.trim() || '🌱',
        category,
        daysToHarvestMin: Math.max(1, parseInt(daysMin) || Math.max(1, daysEstimate - 10)),
        daysToHarvestMax: Math.max(1, parseInt(daysMax) || daysEstimate + 10),
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
          <Ionicons name="arrow-back" size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 13 }}>Cancelar</Text>
        </Pressable>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: spacing.xl }}>{t('customCrop.notFound', { defaultValue: t('customCrop.empty') })}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 13 }}>Cancelar</Text>
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
          <Text style={[s.label, { color: colors.textSecondary }]}>Nombre común del cultivo</Text>
          <View style={[s.inlineField, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="leaf-outline" size={18} color={colors.primary} />
            <TextInput style={[s.inlineInput, { color: colors.text }]} placeholder={t('customCrop.namePlaceholder')} placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} maxLength={40} />
          </View>
          <Text style={[s.label, { color: colors.textSecondary }]}>Nombre botánico <Text style={{ fontWeight: '400' }}>(opcional)</Text></Text>
          <TextInput style={[s.nameInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]} placeholder="Fragaria × ananassa" placeholderTextColor={colors.textSecondary} />

          {/* Category */}
          <Text style={[s.label, { color: colors.textSecondary }]}>Familia botánica</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Elegir familia botánica" onPress={() => setShowFamilyMenu((value) => !value)} style={[s.selectField, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={{ color: colors.text, fontSize: 14 }}>{familyLabel}</Text><Ionicons name={showFamilyMenu ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textSecondary} /></Pressable>
          {showFamilyMenu && <View style={[s.familyMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>{FAMILY_OPTIONS.map((item, index) => <Pressable key={`${item.value}-${index}`} accessibilityRole="button" onPress={() => { setCategory(item.value); setFamilyLabel(item.label); setShowFamilyMenu(false); }} style={[s.familyOption, { borderBottomColor: colors.border, backgroundColor: familyLabel === item.label ? colors.primary + '12' : colors.surface }]}><Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{item.label}</Text>{familyLabel === item.label && <Ionicons name="checkmark" size={17} color={colors.primary} />}</Pressable>)}</View>}

          <Text style={[s.sectionHeading, { color: colors.text }]}>2. MACETA Y LUZ SOLAR</Text>
          <Text style={[s.label, { color: colors.textSecondary }]}>Volumen mínimo de sustrato</Text>
          <Text style={[s.selectedVolume, { color: colors.text }]}>{volume.replace(' L', ' Litros')}</Text>
          <View style={s.volumeRow}>{[['5 L', 'Aromáticas'], ['12 L', 'Fresas'], ['25 L', 'Pimientos'], ['40+ L', 'Tomates']].map(([value, label]) => <Pressable key={value} onPress={() => setVolume(value)} style={[s.volumeChip, { backgroundColor: volume === value ? colors.primary : colors.surface, borderColor: volume === value ? colors.primary : colors.border }]}><Text style={{ color: volume === value ? '#FFFFFF' : colors.text, fontSize: 12, fontWeight: '800' }}>{value}</Text><Text style={{ color: volume === value ? '#FFFFFF' : colors.textSecondary, fontSize: 10 }}>{label}</Text></Pressable>)}</View>
          <Text style={[s.label, { color: colors.textSecondary }]}>Exposición de sol directa diaria</Text>
          <View style={s.sunRow}>{[['2-4h', 'Semisombra', 'partly-sunny-outline'], ['4-6h', 'Sol suave', 'sunny-outline'], ['6+h', 'Sol pleno', 'sunny']].map(([value, label, icon]) => <Pressable key={value} onPress={() => setSunNeeds(value === '6+h' ? 'full' : value === '4-6h' ? 'partial' : 'shade')} style={[s.sunChip, { backgroundColor: ((sunNeeds === 'full' && value === '6+h') || (sunNeeds === 'partial' && value === '4-6h') || (sunNeeds === 'shade' && value === '2-4h')) ? colors.primary : colors.surface, borderColor: colors.border }]}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={((sunNeeds === 'full' && value === '6+h') || (sunNeeds === 'partial' && value === '4-6h') || (sunNeeds === 'shade' && value === '2-4h')) ? '#FFFFFF' : colors.primary} /><Text style={{ color: ((sunNeeds === 'full' && value === '6+h') || (sunNeeds === 'partial' && value === '4-6h') || (sunNeeds === 'shade' && value === '2-4h')) ? '#FFFFFF' : colors.text, fontSize: 11, fontWeight: '700' }}>{value} {label}</Text></Pressable>)}</View>

          <Text style={[s.sectionHeading, { color: colors.text }]}>3. ESTACIONALIDAD EN ESPAÑA</Text>
          <Text style={[s.label, { color: colors.textSecondary }]}>Ventana de siembra y trasplante</Text>
          <View style={s.seasonRow}>
            {([['spring', 'checkmark', 'Primavera (Mar - May)', [3, 4, 5]], ['autumn', 'add', 'Otoño (Sep - Nov)', [9, 10, 11]], ['winter', 'close', 'Invierno', [12, 1, 2]]] as const).map(([id, icon, label, months]) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: season === id }} onPress={() => { setSeason(id); setSowingMonths([...months]); }} style={[s.seasonChip, { backgroundColor: season === id ? colors.primary + '16' : colors.surface, borderColor: season === id ? colors.primary : colors.border }]}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={15} color={season === id ? colors.primary : colors.textSecondary} /><Text style={{ color: season === id ? colors.primaryDark : colors.textSecondary, fontSize: 11, fontWeight: season === id ? '800' : '600' }}>{label}</Text></Pressable>)}
          </View>
          <Text style={[s.label, { color: colors.textSecondary }]}>Días estimados hasta la primera cosecha</Text>
          <Text style={[s.harvestEstimate, { color: colors.text }]}>~{daysEstimate} días</Text>
          <View style={[s.fakeSlider, { backgroundColor: colors.border }]}><View style={[s.fakeSliderFill, { backgroundColor: colors.primary, width: `${Math.min(100, Math.max(12, (daysEstimate / 150) * 100))}%` }]} /></View>
          <View style={s.harvestPresets}>{([[30, 'Rápidos (30d)'], [75, 'Estándar (75d)'], [150, 'Tardíos (150d)']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" onPress={() => { setDaysEstimate(value); setDaysMin(String(Math.max(1, value - 10))); setDaysMax(String(value + 10)); }}><Text style={{ color: daysEstimate === value ? colors.primaryDark : colors.textSecondary, fontSize: 11, fontWeight: daysEstimate === value ? '800' : '600' }}>{label}</Text></Pressable>)}</View>

          <Text style={[s.sectionHeading, { color: colors.text }]}>4. REGLA DE RIEGO</Text>
          <View style={[s.irrigationNote, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent + '66' }]}>
            <Ionicons name="finger-print-outline" size={19} color={colors.primary} />
            <View style={{ flex: 1 }}><Text style={[s.chipText, { color: colors.text }]}>Sin Encharcar</Text><Text style={[s.stitchHint, { color: colors.textSecondary }]}>Diagnóstico de 2 cm en sustrato · Avisar para comprobar humedad antes de regar.</Text></View>
          </View>
          <View style={[s.semillaNote, { backgroundColor: colors.accent + '20' }]}><Ionicons name="sparkles-outline" size={17} color={colors.primary} /><Text style={[s.stitchHint, { color: colors.textSecondary }]}><Text style={{ fontWeight: '800', color: colors.text }}>Nota de Semillita: </Text>En balcones con viento, la superficie seca engaña. Hundir 2 cm el dedo evita la asfixia radicular.</Text></View>

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
          <Text style={[s.label, { color: colors.textSecondary }]}>Personaliza tu maceta</Text>
          <View style={s.photoActions}><Pressable disabled={picking} onPress={() => void choosePhoto(true)} style={[s.photoButton, { borderColor: colors.border, backgroundColor: colors.surface, opacity: picking ? 0.5 : 1 }]}><Ionicons name="camera-outline" size={19} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>Cámara</Text></Pressable><Pressable disabled={picking} onPress={() => void choosePhoto(false)} style={[s.photoButton, { borderColor: colors.border, backgroundColor: colors.surface, opacity: picking ? 0.5 : 1 }]}><Ionicons name="images-outline" size={19} color={colors.primary} /><Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>Álbum</Text></Pressable></View>
          {photoUri && <Image accessibilityLabel="Foto del cultivo seleccionada" source={{ uri: photoUri }} resizeMode="cover" style={s.photoPreview} />}
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
              Registrar cultivo en mi catálogo
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
    semillaNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, marginTop: spacing.sm },
    label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: spacing.lg, marginBottom: spacing.xs },
    sublabel: { fontSize: fontSize.xs, marginBottom: 4 },
    row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    inlineField: { minHeight: 50, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    inlineInput: { flex: 1, minHeight: 48, fontSize: fontSize.md },
    selectField: { minHeight: 48, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    familyMenu: { borderWidth: 1, borderRadius: radii.md, overflow: 'hidden', marginTop: spacing.xs },
    familyOption: { minHeight: 44, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
    selectedVolume: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
    volumeRow: { flexDirection: 'row', gap: spacing.xs },
    volumeChip: { flex: 1, minHeight: 54, borderWidth: 1, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', gap: 2 },
    sunRow: { flexDirection: 'row', gap: spacing.xs },
    sunChip: { flex: 1, minHeight: 50, borderWidth: 1, borderRadius: radii.md, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 },
    seasonRow: { gap: spacing.xs },
    seasonChip: { minHeight: 42, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 },
    harvestEstimate: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.xs },
    fakeSlider: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: spacing.sm },
    fakeSliderFill: { height: '100%', borderRadius: 4 },
    harvestPresets: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
    photoActions: { flexDirection: 'row', gap: spacing.sm },
    photoButton: { flex: 1, minHeight: 50, borderWidth: 1, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    photoPreview: { width: '100%', height: 170, borderRadius: radii.md, marginTop: spacing.sm },
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
