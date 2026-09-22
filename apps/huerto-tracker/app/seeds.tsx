import { Ionicons } from '@expo/vector-icons';
import { useCollection } from '@portfolio/storage';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CollectionError } from '../src/components/CollectionError';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { usePro } from '../src/hooks/usePro';
import { CROPS_BY_ID } from '../src/data/crops';
import type { CustomCrop } from '../src/models/custom-crop';
import type { SeedLot } from '../src/models/seed-lot';
import { FREE_SEED_LOT_LIMIT, seedLotStatus, validateSeedLotDraft } from '../src/utils/seedInventory';

type Filter = 'all' | 'available' | 'low' | 'empty';

export default function SeedInventoryScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { activeGarden, gardensLoading } = useActiveGarden();
  const seedLots = useCollection<SeedLot>('seed_lots');
  const customCrops = useCollection<CustomCrop>('custom_crops');
  const { isPro } = usePro();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cropQuery, setCropQuery] = useState('');
  const [cropId, setCropId] = useState('');
  const [variety, setVariety] = useState('');
  const [brand, setBrand] = useState('');
  const [packetCount, setPacketCount] = useState('');
  const [lowStockAt, setLowStockAt] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ lotId: string; action: 'use' | 'delete' } | null>(null);
  const [showProLimit, setShowProLimit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useFocusEffect(useCallback(() => {
    void seedLots.refresh().catch(() => {});
    void customCrops.refresh().catch(() => {});
  }, [seedLots.refresh, customCrops.refresh]));

  const gardenLots = useMemo(
    () => seedLots.items.filter((lot) => lot.gardenId === activeGarden?.id),
    [activeGarden?.id, seedLots.items],
  );
  const cropOptions = useMemo(() => [
    ...Object.values(CROPS_BY_ID).map((crop) => ({ id: crop.id, name: crop.name, emoji: crop.emoji })),
    ...customCrops.items.map((crop) => ({ id: crop.id, name: crop.name, emoji: crop.emoji })),
  ].sort((a, b) => a.name.localeCompare(b.name, i18n.language)), [customCrops.items, i18n.language]);
  const candidates = useMemo(() => {
    const search = cropQuery.trim().toLocaleLowerCase(i18n.language);
    return cropOptions.filter((crop) => !search || crop.name.toLocaleLowerCase(i18n.language).includes(search)).slice(0, 8);
  }, [cropOptions, cropQuery, i18n.language]);
  const existingCrop = gardenLots.find((lot) => lot.id === editingId && lot.cropId === cropId);
  const selectedCrop = cropOptions.find((crop) => crop.id === cropId)
    ?? (existingCrop ? { id: cropId, name: existingCrop.cropName, emoji: '🌱' } : undefined);
  const today = localDateKey(new Date());
  const filteredLots = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(i18n.language);
    return gardenLots.filter((lot) => {
      const status = seedLotStatus(lot, today);
      if (filter === 'available' && lot.packetCount <= 0) return false;
      if (filter === 'low' && status !== 'low') return false;
      if (filter === 'empty' && status !== 'empty') return false;
      return !search || [lot.cropName, lot.variety, lot.brand].some((value) => value?.toLocaleLowerCase(i18n.language).includes(search));
    });
  }, [filter, gardenLots, i18n.language, query, today]);
  const packetTotal = gardenLots.reduce((total, lot) => total + lot.packetCount, 0);
  const cropTotal = new Set(gardenLots.map((lot) => lot.cropId)).size;
  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setCropId('');
    setCropQuery('');
    setVariety('');
    setBrand('');
    setPacketCount('');
    setLowStockAt('');
    setExpiresOn('');
    setNotes('');
    setSaveError(false);
    setShowProLimit(false);
    setPendingConfirm(null);
    setShowDatePicker(false);
  }

  function openEdit(lot: SeedLot) {
    setEditingId(lot.id);
    setCropId(lot.cropId);
    setCropQuery(lot.cropName);
    setVariety(lot.variety ?? '');
    setBrand(lot.brand ?? '');
    setPacketCount(String(lot.packetCount));
    setLowStockAt(lot.lowStockAt === undefined ? '' : String(lot.lowStockAt));
    setExpiresOn(lot.expiresOn ?? '');
    setNotes(lot.notes ?? '');
    setSaveError(false);
    setShowForm(true);
  }

  async function saveLot() {
    if (!activeGarden) {
      setSaveError(true);
      return;
    }
    const crop = cropOptions.find((item) => item.id === cropId)
      ?? (() => {
        const existing = editingId ? gardenLots.find((lot) => lot.id === editingId && lot.cropId === cropId) : undefined;
        return existing ? { id: existing.cropId, name: existing.cropName, emoji: '🌱' } : undefined;
      })();
    const count = packetCount.trim() === '' ? Number.NaN : Number(packetCount);
    const threshold = lowStockAt.trim() === '' ? undefined : Number(lowStockAt);
    if (validateSeedLotDraft({ cropId, cropName: crop?.name ?? '', packetCount: count, lowStockAt: threshold, expiresOn: expiresOn || undefined, variety: variety.trim(), brand: brand.trim(), notes: notes.trim() })) {
      setSaveError(true);
      return;
    }
    if (!editingId && !isPro && gardenLots.length >= FREE_SEED_LOT_LIMIT) {
      setShowProLimit(true);
      return;
    }

    setSaving(true);
    setSaveError(false);
    try {
      const data = {
        gardenId: activeGarden.id,
        cropId,
        cropName: crop!.name,
        variety: variety.trim() || undefined,
        brand: brand.trim() || undefined,
        packetCount: count,
        lowStockAt: threshold,
        expiresOn: expiresOn || undefined,
        notes: notes.trim() || undefined,
      };
      if (editingId) await seedLots.update(editingId, data);
      else await seedLots.create(data);
      closeForm();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  function usePacket(lot: SeedLot) {
    if (lot.packetCount <= 0) return;
    setPendingConfirm({ lotId: lot.id, action: 'use' });
  }

  function deleteLot(lot: SeedLot) {
    setPendingConfirm({ lotId: lot.id, action: 'delete' });
  }

  async function confirmLotAction(lot: SeedLot) {
    if (!pendingConfirm || pendingConfirm.lotId !== lot.id) return;
    setSaving(true);
    setSaveError(false);
    try {
      if (pendingConfirm.action === 'use') await seedLots.update(lot.id, { packetCount: Math.max(0, lot.packetCount - 1) });
      else await seedLots.softRemove(lot.id);
      setPendingConfirm(null);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  function statusText(lot: SeedLot) {
    const status = seedLotStatus(lot, today);
    if (status === 'empty') return t('seedInventory.statusEmpty');
    if (status === 'expired') return t('seedInventory.statusExpired');
    if (status === 'low') return t('seedInventory.statusLow');
    return t('seedInventory.statusAvailable');
  }

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: t('seedInventory.all') },
    { id: 'available', label: t('seedInventory.inStock') },
    { id: 'low', label: t('seedInventory.low') },
    { id: 'empty', label: t('seedInventory.emptyFilter') },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.replace('/(tabs)/tools' as any)} style={s.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}><Text style={[s.title, { color: colors.text }]}>{t('seedInventory.title')}</Text><Text style={[s.subtitle, { color: colors.textSecondary }]}>{activeGarden?.name ?? t('seedInventory.noGarden')}</Text></View>
        <Pressable accessibilityRole="button" disabled={!activeGarden} onPress={() => { closeForm(); setShowForm(true); }} style={[s.addButton, { backgroundColor: colors.primary, opacity: activeGarden ? 1 : 0.5 }]}><Ionicons name="add" size={18} color="#fff" /><Text style={s.addText}>{t('seedInventory.add')}</Text></Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {seedLots.loading && gardenLots.length === 0 ? <View style={s.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.textSecondary }}>{t('common.loading')}</Text></View> : null}
        {seedLots.error ? <CollectionError onRetry={() => { void seedLots.refresh().catch(() => {}); }} /> : null}
        {!activeGarden && !gardensLoading ? <View style={[s.emptyState, { borderColor: colors.border, backgroundColor: colors.surface }]}><Ionicons name="leaf-outline" size={25} color={colors.primary} /><Text style={[s.emptyTitle, { color: colors.text }]}>{t('seedInventory.noGarden')}</Text><Pressable accessibilityRole="button" onPress={() => router.push('/gardens' as any)} style={[s.primaryButton, { backgroundColor: colors.primary }]}><Text style={s.addText}>{t('gardens.title', { defaultValue: 'Mis huertos' })}</Text></Pressable></View> : null}

        {activeGarden ? <>
          <Text style={[s.summary, { color: colors.textSecondary }]}>{t('seedInventory.summary', { count: packetTotal, crops: cropTotal })}</Text>
          <TextInput accessibilityLabel={t('seedInventory.search')} value={query} onChangeText={setQuery} placeholder={t('seedInventory.search')} placeholderTextColor={colors.textDisabled} style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{filters.map((item) => {
            const active = filter === item.id;
            return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setFilter(item.id)} style={[s.filter, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}><Text style={{ color: active ? '#fff' : colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{item.label}</Text></Pressable>;
          })}</ScrollView>

          {showForm ? <View style={[s.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.formHeading}><Text style={[s.formTitle, { color: colors.text }]}>{editingId ? t('seedInventory.updateLot') : t('seedInventory.addLot')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={closeForm} hitSlop={10}><Ionicons name="close" size={21} color={colors.textSecondary} /></Pressable></View>
            {saveError ? <Text accessibilityRole="alert" style={{ color: colors.error, marginBottom: spacing.xs }}>{t('seedInventory.saveError')}</Text> : null}
            {showProLimit ? <View style={[s.limitNotice, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Text style={[s.emptyBody, { color: colors.text }]}>{t('seedInventory.limitReached', { count: FREE_SEED_LOT_LIMIT })}</Text><View style={s.formActions}><Pressable accessibilityRole="button" onPress={() => setShowProLimit(false)} style={[s.secondaryButton, { borderColor: colors.border }]}><Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/paywall?source=seed_inventory' as any)} style={[s.primaryButton, { backgroundColor: colors.primary }]}><Text style={s.addText}>{t('seedInventory.goPro')}</Text></Pressable></View></View> : null}
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('seedInventory.chooseCrop')}</Text>
            <TextInput accessibilityLabel={t('seedInventory.cropSearch')} value={cropQuery} onChangeText={(value) => { setCropQuery(value); if (selectedCrop?.name !== value) setCropId(''); }} placeholder={t('seedInventory.cropSearch')} placeholderTextColor={colors.textDisabled} style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} />
            <View style={s.cropChoices}>{candidates.map((crop) => {
              const selected = crop.id === cropId;
              return <Pressable key={crop.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => { setCropId(crop.id); setCropQuery(crop.name); }} style={[s.cropChoice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '16' : colors.background }]}><Text style={{ color: selected ? colors.primary : colors.text, fontSize: fontSize.xs }}>{crop.emoji} {crop.name}</Text></Pressable>;
            })}</View>
            <View style={s.twoColumns}><Field label={t('seedInventory.variety')} value={variety} onChangeText={setVariety} styles={s} colors={colors} /><Field label={t('seedInventory.brand')} value={brand} onChangeText={setBrand} styles={s} colors={colors} /></View>
            <View style={s.twoColumns}><Field label={t('seedInventory.packetCount')} value={packetCount} onChangeText={setPacketCount} keyboardType="number-pad" styles={s} colors={colors} /><Field label={t('seedInventory.lowStockAt')} value={lowStockAt} onChangeText={setLowStockAt} keyboardType="number-pad" styles={s} colors={colors} /></View>
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('seedInventory.expiresOn')}</Text>
            <View style={s.dateRow}><Pressable accessibilityRole="button" onPress={() => setShowDatePicker(true)} style={[s.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}><Ionicons name="calendar-outline" size={17} color={colors.primary} /><Text style={{ color: colors.text, fontSize: fontSize.sm }}>{expiresOn || t('seedInventory.noExpiry')}</Text></Pressable>{expiresOn ? <Pressable accessibilityRole="button" accessibilityLabel={t('seedInventory.clearExpiry')} onPress={() => setExpiresOn('')} style={s.iconButton}><Ionicons name="close-circle-outline" size={19} color={colors.textSecondary} /></Pressable> : null}</View>
            {showDatePicker ? <DateTimePicker value={parseLocalDate(expiresOn) ?? new Date()} mode="date" display={Platform.OS === 'ios' ? 'compact' : 'default'} onChange={(_, date) => { if (date) setExpiresOn(localDateKey(date)); if (Platform.OS !== 'ios') setShowDatePicker(false); }} /> : null}
            <TextInput accessibilityLabel={t('seedInventory.notes')} value={notes} onChangeText={setNotes} placeholder={t('seedInventory.notes')} placeholderTextColor={colors.textDisabled} multiline maxLength={1000} style={[s.input, s.notes, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} />
            <View style={s.formActions}><Pressable accessibilityRole="button" onPress={closeForm} style={[s.secondaryButton, { borderColor: colors.border }]}><Text style={{ color: colors.textSecondary, fontWeight: fontWeight.semibold }}>{t('common.cancel')}</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={() => void saveLot()} style={[s.primaryButton, { backgroundColor: colors.primary, opacity: saving ? 0.55 : 1 }]}><Text style={s.addText}>{saving ? t('common.saving') : editingId ? t('seedInventory.updateLot') : t('seedInventory.addLot')}</Text></Pressable></View>
          </View> : null}

          {!seedLots.loading && filteredLots.length === 0 ? <View style={[s.emptyState, { borderColor: colors.border, backgroundColor: colors.surface }]}><Ionicons name="file-tray-outline" size={25} color={colors.primary} /><Text style={[s.emptyTitle, { color: colors.text }]}>{gardenLots.length === 0 ? t('seedInventory.emptyTitle') : t('seedInventory.emptyFilter')}</Text><Text style={[s.emptyBody, { color: colors.textSecondary }]}>{gardenLots.length === 0 ? t('seedInventory.emptyBody') : t('seedInventory.search')}</Text>{gardenLots.length === 0 && !showForm ? <Pressable accessibilityRole="button" onPress={() => setShowForm(true)} style={[s.primaryButton, { backgroundColor: colors.primary }]}><Text style={s.addText}>{t('seedInventory.add')}</Text></Pressable> : null}</View> : null}

          {filteredLots.map((lot) => {
            const status = seedLotStatus(lot, today);
            const statusColor = status === 'expired' || status === 'low' ? colors.warning : status === 'empty' ? colors.textSecondary : colors.success;
            const crop = CROPS_BY_ID[lot.cropId];
            return <View key={lot.id} style={[s.lot, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={s.lotTop}><View style={{ flex: 1 }}><Text style={[s.lotName, { color: colors.text }]}>{lot.cropName}{lot.variety ? ` · ${lot.variety}` : ''}</Text><Text style={[s.lotMeta, { color: colors.textSecondary }]}>{lot.packetCount} {t('seedInventory.packetCount').toLocaleLowerCase(i18n.language)}{lot.brand ? ` · ${lot.brand}` : ''}</Text></View><Text style={[s.status, { color: statusColor, backgroundColor: statusColor + '18' }]}>{statusText(lot)}</Text></View>
              {lot.expiresOn ? <Text style={[s.lotMeta, { color: status === 'expired' ? colors.warning : colors.textSecondary }]}>{new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(parseLocalDate(lot.expiresOn) ?? new Date(lot.expiresOn))}{status === 'expired' ? ` · ${t('seedInventory.expiredNote')}` : ''}</Text> : null}
              {lot.lowStockAt !== undefined ? <Text style={[s.lotMeta, { color: colors.textSecondary }]}>{t('seedInventory.lowStockAt')}: {lot.lowStockAt}</Text> : null}
              {lot.notes ? <Text style={[s.lotMeta, { color: colors.textSecondary }]}>{lot.notes}</Text> : null}
              <View style={s.lotActions}>
                <Pressable accessibilityRole="button" onPress={() => openEdit(lot)} style={[s.actionButton, { borderColor: colors.border }]}><Ionicons name="create-outline" size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{t('common.edit')}</Text></Pressable>
                {lot.packetCount > 0 ? <Pressable accessibilityRole="button" onPress={() => usePacket(lot)} style={[s.actionButton, { borderColor: colors.border }]}><Ionicons name="remove-circle-outline" size={16} color={colors.textSecondary} /><Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{t('seedInventory.useOne')}</Text></Pressable> : null}
                {crop ? <Pressable accessibilityRole="button" onPress={() => router.push((`/garden/map-tools?tab=season&cropId=${encodeURIComponent(lot.cropId)}`) as any)} style={[s.actionButton, { borderColor: colors.border }]}><Ionicons name="calendar-outline" size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{t('seedInventory.planSowing')}</Text></Pressable> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} onPress={() => deleteLot(lot)} style={s.deleteButton}><Ionicons name="trash-outline" size={17} color={colors.error} /></Pressable>
              </View>
              {pendingConfirm?.lotId === lot.id ? <View style={[s.confirmBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Text style={[s.lotMeta, { color: colors.text }]}>{pendingConfirm.action === 'use' ? t('seedInventory.confirmUseBody') : t('seedInventory.deleteBody')}</Text><View style={s.formActions}><Pressable accessibilityRole="button" disabled={saving} onPress={() => setPendingConfirm(null)} style={[s.secondaryButton, { borderColor: colors.border }]}><Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={() => void confirmLotAction(lot)} style={[s.primaryButton, { backgroundColor: pendingConfirm.action === 'delete' ? colors.error : colors.primary, opacity: saving ? 0.55 : 1 }]}><Text style={s.addText}>{saving ? t('common.saving') : pendingConfirm.action === 'delete' ? t('common.delete') : t('seedInventory.confirmUse')}</Text></Pressable></View></View> : null}
            </View>;
          })}
        </> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, keyboardType = 'default', styles, colors }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'number-pad'; styles: ReturnType<typeof makeStyles>; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.field}><Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholderTextColor={colors.textDisabled} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} /></View>;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

const makeStyles = (colors: ReturnType<typeof useColors>, spacing: Record<string, number>, fontSize: Record<string, number>, fontWeight: Theme['fontWeight'], radii: Record<string, number>) => StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 66, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.xs, marginTop: 2 },
  addButton: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  summary: { fontSize: fontSize.sm, paddingVertical: spacing.xs },
  input: { minHeight: 46, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, fontSize: fontSize.sm },
  filters: { gap: spacing.xs, paddingVertical: spacing.xs },
  filter: { minHeight: 38, paddingHorizontal: spacing.md, justifyContent: 'center', borderWidth: 1, borderRadius: radii.sm },
  form: { padding: spacing.md, borderWidth: 1, borderRadius: radii.lg, gap: spacing.sm },
  formHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginBottom: 4 },
  cropChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  cropChoice: { minHeight: 36, paddingHorizontal: spacing.sm, justifyContent: 'center', borderWidth: 1, borderRadius: radii.sm },
  twoColumns: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateButton: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radii.md },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  notes: { minHeight: 76, paddingTop: spacing.sm, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  primaryButton: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  limitNotice: { gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: radii.md },
  secondaryButton: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  emptyState: { minHeight: 190, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderRadius: radii.lg },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textAlign: 'center' },
  emptyBody: { fontSize: fontSize.sm, lineHeight: 20, textAlign: 'center' },
  lot: { padding: spacing.md, borderWidth: 1, borderRadius: radii.lg, gap: spacing.xs },
  lotTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  lotName: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  lotMeta: { fontSize: fontSize.xs, lineHeight: 18 },
  status: { overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.sm, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  lotActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  confirmBox: { gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: radii.md, marginTop: spacing.xs },
  actionButton: { minHeight: 44, paddingHorizontal: spacing.sm, borderWidth: 1, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
});
