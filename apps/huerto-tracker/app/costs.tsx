import { useColors, useTheme, Card, Button, type Theme } from '@portfolio/ui';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCollection } from '@portfolio/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from '../src/utils/glassEffect';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { usePro } from '../src/hooks/usePro';
import { CROPS_BY_ID } from '../src/data/crops';
import { dateToStr, todayStr } from '../src/utils/dateStr';
import type { DiaryEntry } from '../src/models/diary-entry';
import type { Plant } from '../src/models/plant';
import { COST_CATEGORY_CONFIG, type CostCategory, type CostEntry } from '../src/models/cost-entry';
import { Illustration } from '../src/components/Illustration';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

const WATER_PRICE_KEY = '@portfolio/costs/water_price';
const HARVEST_PRICE_KEY = '@portfolio/costs/harvest_price';
const DEFAULT_WATER_PRICE = 0.002;  // €/L
const DEFAULT_HARVEST_PRICE = 2.5;  // €/kg

const CATEGORIES = Object.keys(COST_CATEGORY_CONFIG) as CostCategory[];

function fmt(n: number, locale = 'es') {
  const intlLocale = locale === 'val' ? 'ca-ES' : locale;
  return n.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function CostsScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows, isDark } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isPro } = usePro();
  const { activeGarden, refreshActiveId } = useActiveGarden();

  useFocusEffect(useCallback(() => { refreshActiveId(); }, []));

  const plants = useCollection<Plant>('plants');
  const diaryEntries = useCollection<DiaryEntry>('diary_entries');
  const costEntries = useCollection<CostEntry>('cost_entries');

  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([plants.refresh(), diaryEntries.refresh(), costEntries.refresh()]);
    setRefreshing(false);
  }

  const [year, setYear] = useState(new Date().getFullYear());
  const [waterPrice, setWaterPrice] = useState(DEFAULT_WATER_PRICE);
  const [harvestPrice, setHarvestPrice] = useState(DEFAULT_HARVEST_PRICE);
  const [waterPriceInput, setWaterPriceInput] = useState(String(DEFAULT_WATER_PRICE));
  const [harvestPriceInput, setHarvestPriceInput] = useState(String(DEFAULT_HARVEST_PRICE));

  // Add cost modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState<CostCategory>('seeds');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(todayStr());
  const [newPlantId, setNewPlantId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(WATER_PRICE_KEY),
      AsyncStorage.getItem(HARVEST_PRICE_KEY),
    ]).then(([w, h]) => {
      if (w) { setWaterPrice(parseFloat(w)); setWaterPriceInput(w); }
      if (h) { setHarvestPrice(parseFloat(h)); setHarvestPriceInput(h); }
    });
  }, []);

  function saveWaterPrice(v: string) {
    setWaterPriceInput(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 0) {
      setWaterPrice(n);
      AsyncStorage.setItem(WATER_PRICE_KEY, String(n));
    }
  }

  function saveHarvestPrice(v: string) {
    setHarvestPriceInput(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 0) {
      setHarvestPrice(n);
      AsyncStorage.setItem(HARVEST_PRICE_KEY, String(n));
    }
  }

  const gardenId = activeGarden?.id ?? '';
  const yearStr = String(year);

  // Plants for optional linking (needs gardenId)
  const gardenPlants = useMemo(
    () => plants.items.filter((p) => p.gardenId === gardenId && p.status !== 'finished'),
    [plants.items, gardenId]
  );

  const yearDiary = useMemo(
    () => gardenId ? diaryEntries.items.filter((e) => e.date.startsWith(yearStr) && e.gardenId === gardenId) : [],
    [diaryEntries.items, yearStr, gardenId]
  );

  const yearCosts = useMemo(
    () => gardenId ? costEntries.items.filter((e) => e.date.startsWith(yearStr) && e.gardenId === gardenId) : [],
    [costEntries.items, yearStr, gardenId]
  );

  // Auto-derive water liters from diary
  const totalLiters = useMemo(() =>
    yearDiary
      .filter((e) => e.type === 'watering')
      .reduce((sum, e) => sum + (parseFloat((e.data as any)?.liters ?? '0') || 0), 0),
    [yearDiary]
  );

  // Harvest kg from diary
  const harvestData = useMemo(() => {
    const harvests = yearDiary.filter((e) => e.type === 'harvest' && (e.data as any)?.unit !== 'units');
    const totalKg = harvests.reduce((sum, e) => {
      const d = e.data as any;
      return sum + (parseFloat((d?.weightGrams ?? d?.weight) ?? '0') || 0);
    }, 0);
    const byPlant: Record<string, number> = {};
    for (const h of harvests) {
      const d = h.data as any;
      if (h.plantId) byPlant[h.plantId] = (byPlant[h.plantId] ?? 0) + (parseFloat((d?.weightGrams ?? d?.weight) ?? '0') || 0);
    }
    return { totalKg, byPlant };
  }, [yearDiary]);

  // Manual costs by category
  const costByCategory = useMemo(() => {
    const map: Record<CostCategory, number> = { seeds: 0, fertilizer: 0, treatment: 0, tools: 0, other: 0 };
    for (const e of yearCosts) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return map;
  }, [yearCosts]);

  const waterCost = totalLiters * waterPrice;
  const totalManualCost = CATEGORIES.reduce((s, c) => s + costByCategory[c], 0);
  const totalCost = totalManualCost + waterCost;
  const harvestValue = harvestData.totalKg * harvestPrice;

  const monthlyCostChart = useMemo(() => {
    const intlLocale = i18n.language === 'val' ? 'ca-ES' : i18n.language;
    return Array.from({ length: 12 }, (_, idx) => {
      const d = new Date(year, idx, 1);
      const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat(intlLocale, { month: 'short' }).format(d);
      const total = costEntries.items
        .filter((e) => e.gardenId === gardenId && e.date.startsWith(key))
        .reduce((s, e) => s + e.amount, 0);
      return { key, label: label.charAt(0).toUpperCase() + label.slice(1, 3), total };
    });
  }, [costEntries.items, gardenId, year, i18n.language]);
  const netProfit = harvestValue - totalCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : null;

  // Per-plant ROI: cost entries linked to a plant + harvest kg from diary
  // Water is garden-level (hard to attribute per-plant) so excluded here.
  const plantRoi = useMemo(() => {
    const costByPlant: Record<string, number> = {};
    for (const e of yearCosts) {
      if (e.plantId) costByPlant[e.plantId] = (costByPlant[e.plantId] ?? 0) + e.amount;
    }
    const allPlantIds = new Set([...Object.keys(costByPlant), ...Object.keys(harvestData.byPlant)]);
    return Array.from(allPlantIds)
      .map((plantId) => {
        const plant = plants.items.find((p) => p.id === plantId);
        if (!plant) return null;
        const crop = CROPS_BY_ID[plant.cropId];
        const costTotal = costByPlant[plantId] ?? 0;
        const harvestKg = harvestData.byPlant[plantId] ?? 0;
        const harvestVal = harvestKg * harvestPrice;
        const net = harvestVal - costTotal;
        const roiPct = costTotal > 0 ? (net / costTotal) * 100 : harvestVal > 0 ? Infinity : null;
        return { plant, crop, costTotal, harvestKg, harvestVal, net, roiPct };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.net) - (a!.net)) as Array<{
        plant: Plant;
        crop: typeof CROPS_BY_ID[string] | undefined;
        costTotal: number;
        harvestKg: number;
        harvestVal: number;
        net: number;
        roiPct: number | null;
      }>;
  }, [yearCosts, harvestData.byPlant, plants.items, harvestPrice]);

  async function addCost() {
    const amount = parseFloat(newAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0 || !gardenId) return;
    setSaving(true);
    await costEntries.create({
      gardenId,
      category: newCategory,
      amount,
      description: newDesc.trim() || undefined,
      date: newDate || todayStr(),
      ...(newPlantId ? { plantId: newPlantId } : {}),
    });
    setNewAmount('');
    setNewDesc('');
    setNewDate(todayStr());
    setNewCategory('seeds');
    setNewPlantId(undefined);
    setSaving(false);
    setShowDatePicker(false);
    setShowAddModal(false);
  }

  function deleteCost(entry: CostEntry) {
    Alert.alert(
      t('costs.deleteTitle'),
      t('costs.deleteDesc', { desc: entry.description || t(`costs.cat.${entry.category}`), amount: fmt(entry.amount, locale) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await costEntries.softRemove(entry.id);
          },
        },
      ]
    );
  }

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii, shadows), [colors, spacing, fontSize, fontWeight, radii, shadows]);

  const roiColor = roi === null ? colors.textSecondary : roi >= 0 ? '#4CAF50' : '#EF5350';
  const locale = i18n.language;

  if (!isPro) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>💰 {t('costs.title')}</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] }}>
          <Text style={{ fontSize: 56, marginBottom: spacing.lg }}>💶</Text>
          <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center', marginBottom: spacing.md }}>
            {t('costs.proTitle')}
          </Text>
          <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing['2xl'] }}>
            {t('costs.proDesc')}
          </Text>
          <Pressable
            onPress={() => router.push('/paywall?source=costs' as any)}
            style={{ backgroundColor: colors.primary, paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'], borderRadius: radii.lg }}
          >
            <Text style={{ color: colors.background, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('costs.proBtn')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>💰 {t('costs.title')}</Text>
        {/* Year selector */}
        <View style={s.yearRow}>
          <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[s.yearLabel, { color: colors.text }]}>{year}</Text>
          <Pressable onPress={() => setYear((y) => Math.min(y + 1, new Date().getFullYear()))} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color={year >= new Date().getFullYear() ? colors.textDisabled : colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >

        {/* ── Empty state ── */}
        {yearCosts.length === 0 && harvestData.totalKg === 0 && (
          <View style={[s.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Illustration name="empty-basket" size={110} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t('costs.emptyTitle')}</Text>
            <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>{t('costs.emptyDesc')}</Text>
          </View>
        )}

        {/* ── Summary KPI row ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('costs.summaryLabel')}</Text>
        <View style={s.kpiRow}>
          <Card padded style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: '#EF5350' }]}>{fmt(totalCost, locale)}</Text>
            <Text style={[s.kpiLabel, { color: colors.textSecondary }]}>{t('costs.totalExpense')}</Text>
          </Card>
          <Card padded style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: '#4CAF50' }]}>{fmt(harvestValue, locale)}</Text>
            <Text style={[s.kpiLabel, { color: colors.textSecondary }]}>{t('costs.harvestValue')}</Text>
          </Card>
          <Card padded style={[s.kpiCard, { borderWidth: 1.5, borderColor: roiColor + '55' }] as unknown as ViewStyle}>
            <Text style={[s.kpiValue, { color: roiColor }]}>
              {roi === null ? '—' : `${roi >= 0 ? '+' : ''}${Math.round(roi)}%`}
            </Text>
            <Text style={[s.kpiLabel, { color: colors.textSecondary }]}>ROI</Text>
          </Card>
        </View>

        {/* Net profit banner */}
        {totalCost > 0 && (
          <View style={[s.netBanner, { backgroundColor: (netProfit >= 0 ? colors.success : colors.error) + '20', borderColor: (netProfit >= 0 ? colors.success : colors.error) + '44' }]}>
            <Ionicons name={netProfit >= 0 ? 'trending-up' : 'trending-down'} size={18} color={netProfit >= 0 ? colors.success : colors.error} />
            <Text style={[s.netText, { color: netProfit >= 0 ? colors.success : colors.error }]}>
              {netProfit >= 0 ? t('costs.netProfit') : t('costs.netLoss')} {fmt(Math.abs(netProfit), locale)}
            </Text>
          </View>
        )}

        {/* ── Monthly spend chart ── */}
        {totalCost > 0 && (() => {
          const maxMonthly = Math.max(...monthlyCostChart.map((m) => m.total), 0.01);
          const BAR_H = 56;
          const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
          return (
            <>
              <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('costs.monthlyChartLabel')}</Text>
              <Card padded style={s.card}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                  {monthlyCostChart.map((m) => {
                    const h = m.total > 0 ? Math.max((m.total / maxMonthly) * BAR_H, 6) : 2;
                    const isCurrent = m.key === currentMonthKey;
                    return (
                      <View key={m.key} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                        <View
                          style={{
                            width: '100%',
                            height: h,
                            borderRadius: 3,
                            backgroundColor: isCurrent ? '#EF5350' : '#EF535055',
                            opacity: m.total === 0 ? 0.15 : 1,
                          }}
                        />
                        <Text style={{ fontSize: 9, color: isCurrent ? '#EF5350' : colors.textDisabled, fontWeight: isCurrent ? '700' : '400' }}>
                          {m.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </>
          );
        })()}

        {/* ── Manual costs ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('costs.expensesLabel')}</Text>
        <Card padded style={s.card}>
          {CATEGORIES.map((cat, i) => {
            const cfg = COST_CATEGORY_CONFIG[cat];
            const amt = costByCategory[cat];
            return (
              <View key={cat}>
                {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                <View style={s.costRow}>
                  <View style={[s.catIcon, { backgroundColor: cfg.color + '18' }]}>
                    <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
                  </View>
                  <Text style={[s.costLabel, { color: colors.text, flex: 1 }]}>{t(`costs.cat.${cat}`)}</Text>
                  <Text style={[s.costAmt, { color: amt > 0 ? colors.text : colors.textDisabled }]}>
                    {fmt(amt, locale)}
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          {/* Water auto-derived */}
          <View style={s.costRow}>
            <View style={[s.catIcon, { backgroundColor: '#29B6F618' }]}>
              <Text style={{ fontSize: 18 }}>💧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.costLabel, { color: colors.text }]}>{t('costs.waterAuto')}</Text>
              <Text style={[s.costSub, { color: colors.textSecondary }]}>{totalLiters.toFixed(0)} L × {waterPrice} €/L</Text>
            </View>
            <Text style={[s.costAmt, { color: waterCost > 0 ? colors.text : colors.textDisabled }]}>{fmt(waterCost, locale)}</Text>
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <View style={[s.costRow, { paddingTop: spacing.sm }]}>
            <Text style={[s.costLabel, { color: colors.text, flex: 1, fontWeight: fontWeight.bold }]}>{t('costs.totalExpense')}</Text>
            <Text style={[s.costAmt, { color: '#EF5350', fontWeight: fontWeight.bold }]}>{fmt(totalCost, locale)}</Text>
          </View>
        </Card>

        <Pressable
          onPress={() => setShowAddModal(true)}
          style={[s.addBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={[s.addBtnText, { color: colors.primary }]}>{t('costs.addExpense')}</Text>
        </Pressable>

        {/* ── Harvest value ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('costs.harvestLabel')}</Text>
        <Card padded style={s.card}>
          <View style={s.costRow}>
            <Text style={{ fontSize: 22 }}>🧺</Text>
            <Text style={[s.costLabel, { color: colors.text, flex: 1, marginLeft: spacing.sm }]}>{t('costs.totalKg')}</Text>
            <Text style={[s.costAmt, { color: colors.text }]}>{harvestData.totalKg.toFixed(2)} kg</Text>
          </View>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <View style={s.priceRow}>
            <Text style={[s.costLabel, { color: colors.text, flex: 1 }]}>{t('costs.pricePerKg')}</Text>
            <View style={[s.priceInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <TextInput
                value={harvestPriceInput}
                onChangeText={saveHarvestPrice}
                keyboardType="decimal-pad"
                style={{ color: colors.text, fontSize: fontSize.sm, minWidth: 48, textAlign: 'right' }}
              />
              <Text style={[s.priceUnit, { color: colors.textSecondary }]}> €/kg</Text>
            </View>
          </View>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <View style={s.costRow}>
            <Text style={[s.costLabel, { color: colors.text, flex: 1, fontWeight: fontWeight.bold }]}>{t('costs.estimatedValue')}</Text>
            <Text style={[s.costAmt, { color: '#4CAF50', fontWeight: fontWeight.bold }]}>{fmt(harvestValue, locale)}</Text>
          </View>
        </Card>

        {/* ── Water price config ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('costs.waterLabel')}</Text>
        <Card padded style={s.card}>
          <View style={s.costRow}>
            <Text style={{ fontSize: 22 }}>💧</Text>
            <Text style={[s.costLabel, { color: colors.text, flex: 1, marginLeft: spacing.sm }]}>{t('costs.totalLiters')}</Text>
            <Text style={[s.costAmt, { color: colors.text }]}>{totalLiters.toFixed(0)} L</Text>
          </View>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <View style={s.priceRow}>
            <Text style={[s.costLabel, { color: colors.text, flex: 1 }]}>{t('costs.pricePerLiter')}</Text>
            <View style={[s.priceInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <TextInput
                value={waterPriceInput}
                onChangeText={saveWaterPrice}
                keyboardType="decimal-pad"
                style={{ color: colors.text, fontSize: fontSize.sm, minWidth: 60, textAlign: 'right' }}
              />
              <Text style={[s.priceUnit, { color: colors.textSecondary }]}> €/L</Text>
            </View>
          </View>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <View style={s.costRow}>
            <Text style={[s.costLabel, { color: colors.text, flex: 1, fontWeight: fontWeight.bold }]}>{t('costs.waterCost')}</Text>
            <Text style={[s.costAmt, { color: '#29B6F6', fontWeight: fontWeight.bold }]}>{fmt(waterCost, locale)}</Text>
          </View>
        </Card>

        {/* ── Per-plant ROI ── */}
        {plantRoi.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('costs.perPlantLabel')}</Text>
            <Card padded style={s.card}>
              {plantRoi.map((row, i) => {
                const netColor = row.net >= 0 ? colors.success : colors.error;
                const roiLabel = row.roiPct === null
                  ? '—'
                  : row.roiPct === Infinity
                    ? '∞%'
                    : `${row.roiPct >= 0 ? '+' : ''}${Math.round(row.roiPct)}%`;
                return (
                  <View key={row.plant.id}>
                    {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                    <View style={[s.costRow, { paddingVertical: spacing.md }]}>
                      {/* Plant info */}
                      <View style={[s.catIcon, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={{ fontSize: 18 }}>{row.crop?.emoji ?? '🌱'}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={[s.costLabel, { color: colors.text }]} numberOfLines={1}>{row.plant.name}</Text>
                        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 2 }}>
                          {row.costTotal > 0 && (
                            <Text style={[s.costSub, { color: colors.error }]}>
                              -{fmt(row.costTotal, locale)}
                            </Text>
                          )}
                          {row.harvestKg > 0 && (
                            <Text style={[s.costSub, { color: colors.success }]}>
                              +{fmt(row.harvestVal, locale)} ({row.harvestKg.toFixed(2)} kg)
                            </Text>
                          )}
                        </View>
                      </View>
                      {/* Net + ROI badge */}
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={[s.costAmt, { color: netColor }]}>
                          {row.net >= 0 ? '+' : ''}{fmt(row.net, locale)}
                        </Text>
                        <View style={[s.roiBadge, { backgroundColor: netColor + '20' }]}>
                          <Text style={[s.roiBadgeText, { color: netColor }]}>{roiLabel}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Cost entries list */}
        {yearCosts.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm }}>
              <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: 0, marginBottom: 0 }]}>{t('costs.recentLabel')}</Text>
              {yearCosts.length > 10 && (
                <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={8}>
                  <Text style={[{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
                    {showAll ? t('costs.showLess') : t('costs.showAll', { count: yearCosts.length })}
                  </Text>
                </Pressable>
              )}
            </View>
            <Card padded style={s.card}>
              {[...yearCosts]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, showAll ? undefined : 10)
                .map((e, i) => {
                  const cfg = COST_CATEGORY_CONFIG[e.category];
                  const linkedPlant = e.plantId ? plants.items.find((p) => p.id === e.plantId) : null;
                  return (
                    <View key={e.id}>
                      {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                      <View style={s.costRow}>
                        <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <Text style={[s.costLabel, { color: colors.text }]}>
                            {e.description || t(`costs.cat.${e.category}`)}
                          </Text>
                          <Text style={[s.costSub, { color: colors.textSecondary }]}>
                            {e.date}{linkedPlant ? ` · ${linkedPlant.name}` : ''}
                          </Text>
                        </View>
                        <Text style={[s.costAmt, { color: colors.error }]}>-{fmt(e.amount, locale)}</Text>
                        <Pressable onPress={() => deleteCost(e)} hitSlop={10} style={{ marginLeft: spacing.sm }}>
                          <Ionicons name="trash-outline" size={18} color={colors.textDisabled} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
            </Card>
          </>
        )}

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>

      {/* ── Add cost modal ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => { setShowAddModal(false); setShowDatePicker(false); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => { setShowAddModal(false); setShowDatePicker(false); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            onPress={() => {}}
            style={[s.addModal, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, overflow: 'hidden' }]}
          >
            {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}

            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.modalTitle, { color: colors.text }]}>{t('costs.addExpense')}</Text>

            {/* Category picker */}
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>{t('costs.categoryLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {CATEGORIES.map((cat) => {
                  const cfg = COST_CATEGORY_CONFIG[cat];
                  const active = newCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setNewCategory(cat)}
                      style={[s.catChip, {
                        backgroundColor: active ? cfg.color + '22' : colors.surfaceAlt,
                        borderColor: active ? cfg.color : colors.border,
                      }]}
                    >
                      <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                      <Text style={[s.catChipText, { color: active ? cfg.color : colors.textSecondary }]}>
                        {t(`costs.cat.${cat}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Date */}
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>{t('entryNew.date')}</Text>
            <View style={s.dateBtnsRow}>
              {([0, 1, 2] as const).map((days) => {
                const d = new Date();
                d.setDate(d.getDate() - days);
                const ds = dateToStr(d);
                const active = newDate === ds;
                const label = days === 0 ? t('entryNew.today') : days === 1 ? t('entryNew.yesterday') : t('entryNew.twoDaysAgo');
                return (
                  <Pressable
                    key={days}
                    onPress={() => setNewDate(ds)}
                    style={[s.dateBtn, { backgroundColor: active ? colors.primary + '20' : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[s.dateBtnText, { color: active ? colors.primary : colors.textSecondary }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[s.descInput, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={{ color: colors.text, fontSize: fontSize.md, flex: 1 }}>{newDate}</Text>
            </Pressable>
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={new Date(newDate + 'T12:00:00')}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setNewDate(dateToStr(d)); }}
              />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
              <Modal transparent animationType="slide" visible>
                <Pressable style={s.dateModalOverlay} onPress={() => setShowDatePicker(false)}>
                  <Pressable style={[s.dateModalSheet, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, overflow: 'hidden' }]} onPress={() => {}}>
                    {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
                    <View style={[s.dateModalHandle, { backgroundColor: colors.border }]} />
                    <DateTimePicker
                      value={new Date(newDate + 'T12:00:00')}
                      mode="date"
                      display="spinner"
                      onChange={(_, d) => { if (d) setNewDate(dateToStr(d)); }}
                      style={{ width: '100%' }}
                    />
                    <Button
                      title={t('common.save')}
                      onPress={() => setShowDatePicker(false)}
                      size="lg"
                      style={{ margin: spacing.xl, marginTop: 0 }}
                    />
                  </Pressable>
                </Pressable>
              </Modal>
            )}

            {/* Plant (optional) */}
            {gardenPlants.length > 0 && (
              <>
                <Text style={[s.modalLabel, { color: colors.textSecondary }]}>{t('costs.plantLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable
                      onPress={() => setNewPlantId(undefined)}
                      style={[s.catChip, { backgroundColor: !newPlantId ? colors.primary + '22' : colors.surfaceAlt, borderColor: !newPlantId ? colors.primary : colors.border }]}
                    >
                      <Text style={[s.catChipText, { color: !newPlantId ? colors.primary : colors.textSecondary }]}>{t('costs.noPlant')}</Text>
                    </Pressable>
                    {gardenPlants.map((p) => {
                      const crop = CROPS_BY_ID[p.cropId];
                      const active = newPlantId === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => setNewPlantId(active ? undefined : p.id)}
                          style={[s.catChip, { backgroundColor: active ? colors.primary + '22' : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border }]}
                        >
                          <Text style={{ fontSize: 14 }}>{crop?.emoji ?? '🌱'}</Text>
                          <Text style={[s.catChipText, { color: active ? colors.primary : colors.textSecondary }]} numberOfLines={1}>{p.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Amount */}
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>{t('costs.amountLabel')}</Text>
            <View style={[s.amountRow, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
              <TextInput
                value={newAmount}
                onChangeText={setNewAmount}
                placeholder="0,00"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                style={[s.amountInput, { color: colors.text, fontSize: fontSize.lg }]}
                autoFocus
              />
              <Text style={[s.priceUnit, { color: colors.textSecondary, fontSize: fontSize.lg }]}>€</Text>
            </View>

            {/* Description */}
            <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>{t('costs.descLabel')}</Text>
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder={t('costs.descPlaceholder')}
              placeholderTextColor={colors.textDisabled}
              style={[s.descInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              returnKeyType="done"
            />

            <Pressable
              onPress={addCost}
              disabled={saving || !newAmount}
              style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving || !newAmount ? 0.5 : 1 }]}
            >
              {saving
                ? <ActivityIndicator color={colors.background} />
                : <Text style={[s.saveBtnText, { color: colors.background }]}>{t('costs.save')}</Text>
              }
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>,
  shadows: Record<string, object>
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
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, flex: 1, marginLeft: spacing.md },
    yearRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    yearLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, minWidth: 42, textAlign: 'center' },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    kpiRow: { flexDirection: 'row', gap: spacing.sm },
    kpiCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
    kpiValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textAlign: 'center' },
    kpiLabel: { fontSize: fontSize.xs, textAlign: 'center', marginTop: 2 },
    netBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing.md,
    },
    netText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    card: { marginBottom: 0 },
    costRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
    catIcon: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
    costLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    costSub: { fontSize: fontSize.xs, marginTop: 1 },
    costAmt: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, minWidth: 70, textAlign: 'right' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing.md,
    },
    addBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    priceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
    priceInput: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    priceUnit: { fontSize: fontSize.xs },
    // Modal
    addModal: {
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.xl,
      paddingBottom: 40,
      gap: spacing.sm,
    },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
    modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    modalLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.6, marginTop: spacing.xs },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    catChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    amountInput: { flex: 1, fontWeight: fontWeight.bold },
    descInput: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
    },
    saveBtn: {
      paddingVertical: spacing.lg,
      borderRadius: radii.lg,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    saveBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    emptyCard: {
      alignItems: 'center',
      padding: spacing['2xl'],
      borderRadius: radii.xl,
      borderWidth: 1,
      marginTop: spacing.xl,
      gap: spacing.md,
    },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
    emptyDesc: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
    dateBtnsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    dateBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1.5,
    },
    dateBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    roiBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    roiBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    dateModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    dateModalSheet: {
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: spacing.sm,
      alignItems: 'center',
    },
    dateModalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      marginBottom: spacing.md,
    },
  });
