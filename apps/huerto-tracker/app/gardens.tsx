import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PROVINCE_ZONES, CLIMATE_ZONE_CONFIG } from '../src/data/zones';
import type { ClimateZone, Garden, GardenType } from '../src/models/garden';
import { GARDEN_TYPE_CONFIG } from '../src/models/garden';
import { DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS } from '../src/hooks/useGardenLayout';
import { usePro as usePurchases } from '../src/hooks/usePro';

const ACTIVE_KEY = '@portfolio/active_garden_id';
const ALL_PROVINCES = Object.keys(PROVINCE_ZONES).sort();
const FREE_GARDEN_LIMIT = 2;

export default function GardensScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { isPro } = usePurchases();

  const gardens = useCollection<Garden>('gardens');
  const [activeId, setActiveIdState] = useState<string | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem(ACTIVE_KEY).then(setActiveIdState);
  }, []);

  const effectiveActiveId = activeId ?? gardens.items[0]?.id ?? null;

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [gardenType, setGardenType] = useState<GardenType>('huerto');
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const climateZone: ClimateZone | null = province ? (PROVINCE_ZONES[province] ?? null) : null;
  const zoneConfig = climateZone ? CLIMATE_ZONE_CONFIG[climateZone] : null;

  const filteredProvinces = useMemo(
    () => ALL_PROVINCES.filter((p) => p.toLowerCase().includes(provinceSearch.toLowerCase())),
    [provinceSearch]
  );

  async function handleCreate() {
    if (!name.trim() || !province) return;
    setSaving(true);
    try {
      const created = await gardens.create({
        name: name.trim(),
        province,
        climateZone: climateZone!,
        gardenType,
        gridRows: DEFAULT_GRID_ROWS,
        gridCols: DEFAULT_GRID_COLS,
      });
      if (created?.id) {
        await AsyncStorage.setItem(ACTIVE_KEY, created.id);
        setActiveIdState(created.id);
      }
      setShowCreate(false);
      setName('');
      setProvince('');
    } finally {
      setSaving(false);
    }
  }

  async function handleSwitch(id: string) {
    await AsyncStorage.setItem(ACTIVE_KEY, id);
    setActiveIdState(id);
  }

  function handleDelete(garden: Garden) {
    if (gardens.items.length <= 1) {
      Alert.alert(t('gardens.cantDeleteLast'));
      return;
    }
    Alert.alert(
      t('gardens.deleteTitle', { name: garden.name }),
      t('gardens.deleteDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await gardens.remove(garden.id);
            if (effectiveActiveId === garden.id) {
              const remaining = gardens.items.filter((g) => g.id !== garden.id);
              if (remaining.length > 0) {
                await AsyncStorage.setItem(ACTIVE_KEY, remaining[0].id);
                setActiveIdState(remaining[0].id);
              }
            }
          },
        },
      ]
    );
  }

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  const canCreateMore = isPro || gardens.items.length < FREE_GARDEN_LIMIT;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('gardens.title')}</Text>
        <Pressable
          onPress={() => canCreateMore ? setShowCreate(true) : router.push('/paywall')}
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          {!canCreateMore && (
            <View style={[s.proBadge, { backgroundColor: colors.primary }]}>
              <Text style={s.proBadgeText}>PRO</Text>
            </View>
          )}
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}>
        <Text style={[s.hint, { color: colors.textSecondary }]}>{t('gardens.hint')}</Text>

        {gardens.items.map((garden) => {
          const isActive = garden.id === effectiveActiveId;
          const zc = CLIMATE_ZONE_CONFIG[garden.climateZone];
          const gtc = garden.gardenType ? GARDEN_TYPE_CONFIG[garden.gardenType] : null;
          return (
            <Pressable key={garden.id} onPress={() => handleSwitch(garden.id)} style={{ marginBottom: spacing.md }}>
              <Card
                padded
                style={StyleSheet.flatten([
                  s.gardenCard,
                  { borderColor: isActive ? colors.primary : colors.border, borderWidth: isActive ? 2 : 1 },
                ]) as ViewStyle}
              >
                <View style={s.gardenCardRow}>
                  <Text style={{ fontSize: 28 }}>{gtc?.emoji ?? '🏡'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text style={[s.gardenName, { color: colors.text }]}>{garden.name}</Text>
                      {isActive && (
                        <View style={[s.activeBadge, { backgroundColor: colors.primary + '22' }]}>
                          <Text style={[s.activeBadgeText, { color: colors.primary }]}>{t('gardens.active')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.gardenSub, { color: colors.textSecondary }]}>
                      {zc?.emoji} {garden.province} · {gtc?.label ?? ''}
                    </Text>
                  </View>
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : (
                    <Pressable
                      onPress={() => handleDelete(garden)}
                      hitSlop={12}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  )}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Create garden modal ── */}
      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCreate(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={[s.headerTitle, { color: colors.text }]}>{t('gardens.createTitle')}</Text>
            <Pressable
              onPress={handleCreate}
              disabled={!name.trim() || !climateZone || saving}
              style={{ opacity: !name.trim() || !climateZone || saving ? 0.4 : 1 }}
            >
              <Text style={[s.saveText, { color: colors.primary }]}>{t('common.save')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
            {/* Name */}
            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('gardens.fieldName')}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('gardens.fieldNamePlaceholder')}
                placeholderTextColor={colors.textDisabled}
                style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            {/* Type */}
            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('gardens.fieldType')}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(Object.keys(GARDEN_TYPE_CONFIG) as GardenType[]).map((type) => {
                  const cfg = GARDEN_TYPE_CONFIG[type];
                  const active = gardenType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setGardenType(type)}
                      style={[
                        s.typeChip,
                        {
                          backgroundColor: active ? colors.primary + '22' : colors.surfaceAlt,
                          borderColor: active ? colors.primary : colors.border,
                          flex: 1,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 20 }}>{cfg.emoji}</Text>
                      <Text style={[s.typeChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                        {cfg.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Province */}
            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('gardens.fieldProvince')}</Text>
              <Pressable
                onPress={() => setShowProvinceModal(true)}
                style={[s.input, s.provinceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ color: province ? colors.text : colors.textDisabled, fontSize: 16 }}>
                  {province || t('gardens.fieldProvincePlaceholder')}
                </Text>
                {zoneConfig && (
                  <Text style={{ color: colors.primary, fontSize: 14 }}>
                    {zoneConfig.emoji} {zoneConfig.label}
                  </Text>
                )}
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Province picker modal */}
        <Modal
          visible={showProvinceModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowProvinceModal(false)}
        >
          <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[s.header, { borderBottomColor: colors.border }]}>
              <Text style={[s.headerTitle, { color: colors.text }]}>{t('gardenEdit.provinceTitle')}</Text>
              <Pressable onPress={() => setShowProvinceModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, margin: spacing.lg }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                value={provinceSearch}
                onChangeText={setProvinceSearch}
                placeholder={t('common.search')}
                placeholderTextColor={colors.textDisabled}
                style={[{ flex: 1, color: colors.text, marginLeft: spacing.sm }]}
                autoFocus
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredProvinces.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => { setProvince(p); setShowProvinceModal(false); }}
                  style={[s.provinceRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[s.provinceName, { color: colors.text }]}>{p}</Text>
                  <Text style={[{ color: colors.textSecondary, fontSize: 12 }]}>
                    {CLIMATE_ZONE_CONFIG[PROVINCE_ZONES[p]]?.label ?? ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </Modal>
    </SafeAreaView>
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
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    saveText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    hint: { fontSize: fontSize.sm, marginBottom: spacing.lg, lineHeight: 20 },
    gardenCard: { borderRadius: radii.lg },
    gardenCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    gardenName: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    gardenSub: { fontSize: fontSize.xs, marginTop: 2 },
    activeBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    activeBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
    proBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    proBadgeText: { fontSize: 9, fontWeight: fontWeight.bold, color: '#fff' },
    field: { gap: spacing.sm },
    label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      borderWidth: 1.5,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
    },
    provinceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    typeChip: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      gap: 4,
    },
    typeChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    provinceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    provinceName: { fontSize: fontSize.md },
  });
