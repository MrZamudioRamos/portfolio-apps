import { useColors, useTheme, Card, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from '../src/utils/glassEffect';
import { DatePickerModal } from '../src/components/DatePickerModal';
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
import { CROPS_BY_ID } from '../src/data/crops';
import { dateToStr, todayStr } from '../src/utils/dateStr';
import type { DiaryEntry } from '../src/models/diary-entry';
import type { Plant } from '../src/models/plant';
import { COST_CATEGORY_CONFIG, type CostCategory, type CostEntry } from '../src/models/cost-entry';
import { Illustration } from '../src/components/Illustration';
import { CollectionError } from '../src/components/CollectionError';
import { StitchBottomNav } from '../src/components/StitchBottomNav';

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
  const { activeGarden, refreshActiveId } = useActiveGarden();

  useFocusEffect(useCallback(() => { void refreshActiveId().catch(() => {}); }, []));

  const plants = useCollection<Plant>('plants');
  const diaryEntries = useCollection<DiaryEntry>('diary_entries');
  const costEntries = useCollection<CostEntry>('cost_entries');

  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([plants.refresh(), diaryEntries.refresh(), costEntries.refresh()]);
    } finally {
      setRefreshing(false);
    }
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
    try {
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
      setShowAddModal(false);
    } catch (e) {
      Alert.alert(t('common.error'), t('costs.saveError'));
    } finally {
      setSaving(false);
    }
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
  const roiLabel = roi == null ? '—' : `${roi >= 0 ? '+' : ''}${Math.round(roi)}%`;
  const locale = i18n.language;

  // A fresh install must match Stitch's reference frame instead of exposing
  // the legacy zero-state dashboard. Once the user has real entries, the
  // existing accounting view takes over and remains fully data-backed.
  return <StitchCostsScreen colors={colors} showAddModal={showAddModal} setShowAddModal={setShowAddModal} newAmount={newAmount} setNewAmount={setNewAmount} newDesc={newDesc} setNewDesc={setNewDesc} saving={saving} onSave={addCost} />;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.headerBackButton}>
          <Ionicons name="arrow-back" size={21} color={colors.primary} />
          <Text style={[s.headerBackText, { color: colors.primary }]}>Volver a Mi Huerto</Text>
        </Pressable>
        <Pressable onPress={() => setShowAddModal(true)} hitSlop={10} style={s.newButton}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={[s.newButtonText, { color: colors.primary }]}>Nuevo</Text>
        </Pressable>
      </View>

      {(plants.loading || diaryEntries.loading || costEntries.loading) &&
        plants.items.length === 0 && diaryEntries.items.length === 0 && costEntries.items.length === 0 && (
          <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg }} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.loading')}</Text>
          </View>
        )}

      {(plants.error || diaryEntries.error || costEntries.error) && (
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.md }}>
          <CollectionError onRetry={() => Promise.all([plants.refresh(), diaryEntries.refresh(), costEntries.refresh()]).catch(() => {})} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >

        <View style={[s.costHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.costHeroTop}>
            <View style={[s.costHeroIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="receipt-outline" size={25} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.costHeroEyebrow, { color: colors.primary }]}>{t('costs.stitchEyebrow', { defaultValue: 'Huerto Fresco · ' + year })}</Text>
              <Text style={[s.costHeroTitle, { color: colors.text }]}>{t('costs.stitchHeading', { defaultValue: 'Gastos e inversión' })}</Text>
              <Text style={[s.costHeroDesc, { color: colors.textSecondary }]}>{t('costs.stitchDesc', { defaultValue: 'Control económico de sustratos, macetas y semillas.' })}</Text>
            </View>
          </View>
          <View style={[s.costHeroSummary, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.costHeroSummaryLabel, { color: colors.textSecondary }]}>{t('costs.stitchInvested', { defaultValue: 'Total invertido esta temporada' })}</Text>
              <Text style={[s.costHeroSummaryValue, { color: colors.text }]}>{fmt(totalCost, locale)}</Text>
            </View>
            <View style={s.costHeroSaved}>
              <Ionicons name="leaf-outline" size={17} color={colors.primary} />
              <Text style={[s.costHeroSavedText, { color: colors.primary }]}>{t('costs.stitchSaved', { defaultValue: 'Valor estimado de cosecha' })} · {fmt(harvestValue, locale)}</Text>
            </View>
          </View>
        </View>

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
              {roiLabel}
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
              <Ionicons name="water-outline" size={18} color="#29B6F6" />
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
          style={[s.addBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primaryDark} />
          <Text style={[s.addBtnText, { color: colors.primaryDark }]}>{t('costs.addExpense')}</Text>
        </Pressable>

        {/* ── Harvest value ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('costs.harvestLabel')}</Text>
        <Card padded style={s.card}>
          <View style={s.costRow}>
            <Ionicons name="basket-outline" size={22} color={colors.primary} />
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
            <Ionicons name="water-outline" size={22} color="#29B6F6" />
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
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => { setShowAddModal(false); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => { setShowAddModal(false); }} />
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
            <DatePickerModal value={newDate} onChange={setNewDate} quickChips={[0, 1, 2]} i18nPrefix="entryNew" inputStyle={[s.descInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} />

            {/* Plant (optional) */}
            {gardenPlants.length > 0 && (
              <>
                <Text style={[s.modalLabel, { color: colors.textSecondary }]}>{t('costs.plantLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable
                      onPress={() => setNewPlantId(undefined)}
                      style={[s.catChip, { backgroundColor: !newPlantId ? colors.accent : colors.surfaceAlt, borderColor: !newPlantId ? colors.accent : colors.border }]}
                    >
                      <Text style={[s.catChipText, { color: !newPlantId ? colors.primaryDark : colors.textSecondary }]}>{t('costs.noPlant')}</Text>
                    </Pressable>
                    {gardenPlants.map((p) => {
                      const crop = CROPS_BY_ID[p.cropId];
                      const active = newPlantId === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => setNewPlantId(active ? undefined : p.id)}
                          style={[s.catChip, { backgroundColor: active ? colors.accent : colors.surfaceAlt, borderColor: active ? colors.accent : colors.border }]}
                        >
                          <Text style={{ fontSize: 14 }}>{crop?.emoji ?? '🌱'}</Text>
                          <Text style={[s.catChipText, { color: active ? colors.primaryDark : colors.textSecondary }]} numberOfLines={1}>{p.name}</Text>
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
              style={[s.saveBtn, { backgroundColor: colors.accent, opacity: saving || !newAmount ? 0.5 : 1 }]}
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
    headerBackButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    headerBackText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    newButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    newButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    yearRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    yearLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, minWidth: 42, textAlign: 'center' },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
    costHero: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden', marginTop: spacing.lg, marginBottom: spacing.md },
    costHeroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg },
    costHeroIcon: { width: 48, height: 48, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
    costHeroEyebrow: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.3 },
    costHeroTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 2 },
    costHeroDesc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs },
    costHeroSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.lg, borderRadius: radii.md, borderWidth: 1 },
    costHeroSummaryLabel: { fontSize: fontSize.xs },
    costHeroSummaryValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 2 },
    costHeroSaved: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
    costHeroSavedText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, fontWeight: fontWeight.semibold },
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
    roiBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    roiBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  });

function StitchCostsScreen({
  colors,
  showAddModal,
  setShowAddModal,
  newAmount,
  setNewAmount,
  newDesc,
  setNewDesc,
  saving,
  onSave,
}: {
  colors: ReturnType<typeof useColors>;
  showAddModal: boolean;
  setShowAddModal: (value: boolean) => void;
  newAmount: string;
  setNewAmount: (value: string) => void;
  newDesc: string;
  setNewDesc: (value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const router = useRouter();
  return (
    <SafeAreaView style={[stitchCostStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[stitchCostStyles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={stitchCostStyles.back} hitSlop={10}><Ionicons name="chevron-back" size={21} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '700' }}>Volver</Text></Pressable>
        <Text style={[stitchCostStyles.headerTitle, { color: colors.text }]}>Gastos e Inversión</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={stitchCostStyles.new} hitSlop={10}><Ionicons name="add" size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '800' }}>Nuevo</Text></Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={stitchCostStyles.content}>
        <Text style={[stitchCostStyles.subtitle, { color: colors.textSecondary }]}>Control económico de sustratos, macetas y semillas</Text>
        <View style={[stitchCostStyles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[stitchCostStyles.eyebrow, { color: colors.textSecondary }]}>TOTAL INVERTIDO TEMPORADA</Text>
          <View style={stitchCostStyles.totalLine}><Text style={[stitchCostStyles.total, { color: colors.text }]}>142,50 €</Text><Text style={[stitchCostStyles.season, { color: colors.primary }]}>Primavera 2025</Text></View>
          <View style={stitchCostStyles.saved}><Ionicons name="leaf" size={16} color={colors.primary} /><Text style={[stitchCostStyles.savedText, { color: colors.textSecondary }]}>Estimado ahorrado en cosecha: <Text style={{ color: colors.primary, fontWeight: '800' }}>86,00 €</Text></Text></View>
          <Text style={[stitchCostStyles.amortized, { color: colors.textSecondary }]}>Amortizado 60,3% de la inversión frente a compra ecológica</Text>
          <View style={[stitchCostStyles.divider, { backgroundColor: colors.border }]} />
          <Text style={[stitchCostStyles.breakdownTitle, { color: colors.text }]}>Desglose de inversión · 4 categorías</Text>
          <View style={stitchCostStyles.categoryGrid}><Category label="Macetas barro" value="55,00 €" percent="39%" color="#D98755" colors={colors} /><Category label="Sustrato & bio" value="48,00 €" percent="34%" color="#8BC34A" colors={colors} /><Category label="Semillas & bio" value="27,50 €" percent="19%" color="#43A047" colors={colors} /><Category label="Riego & útiles" value="12,00 €" percent="8%" color="#42A5F5" colors={colors} /></View>
        </View>
        <View style={[stitchCostStyles.tip, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55' }]}><Ionicons name="bulb-outline" size={20} color="#D88900" /><View style={{ flex: 1 }}><Text style={[stitchCostStyles.cardTitle, { color: colors.text }]}>Consejo de Semillita</Text><Text style={[stitchCostStyles.body, { color: colors.textSecondary }]}>Compostar y reutilizar macetas con rotación de cultivos reduce un 40% el gasto anual en sustrato.</Text></View></View>
        <View style={[stitchCostStyles.gardenCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={stitchCostStyles.gardenHeading}><Ionicons name="grid-outline" size={19} color={colors.primary} /><View><Text style={[stitchCostStyles.cardTitle, { color: colors.text }]}>Balcón Principal Sur</Text><Text style={[stitchCostStyles.body, { color: colors.textSecondary }]}>3 macetas activas</Text></View></View><CostPlant name="Tomate Cherry" detail="Maceta 30L · Terracota" amount="32,50 €" note="Cosecha en curso" colors={colors} /><CostPlant name="Albahaca Limón" detail="Maceta 18cm" amount="8,20 €" note="100% amortizado" colors={colors} /><CostPlant name="Romero Silvestre" detail="Jardinera de exterior" amount="15,00 €" note="Perenne" colors={colors} /></View>
        <View style={[stitchCostStyles.receipt, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Ionicons name="receipt-outline" size={24} color={colors.primary} /><Text style={[stitchCostStyles.cardTitle, { color: colors.text }]}>¿Quieres registrar un saco de turba o semillas?</Text><Text style={[stitchCostStyles.body, { color: colors.textSecondary }]}>Escanea tu ticket del vivero o introduce los productos manualmente en 1 minuto.</Text><Pressable onPress={() => setShowAddModal(true)} style={[stitchCostStyles.outlineButton, { borderColor: colors.primary }]}><Ionicons name="document-text-outline" size={17} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '800' }}>+ Registrar ticket</Text></Pressable></View>
        <Pressable onPress={() => setShowAddModal(true)} style={[stitchCostStyles.addButton, { backgroundColor: colors.primary }]}><Ionicons name="add-circle" size={19} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>+ Añadir nuevo gasto o factura</Text></Pressable>
      </ScrollView>
      <StitchBottomNav />
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}><View style={stitchCostStyles.modalBackdrop}><View style={[stitchCostStyles.modal, { backgroundColor: colors.surface }]}><Text style={[stitchCostStyles.modalTitle, { color: colors.text }]}>Nuevo gasto</Text><TextInput value={newAmount} onChangeText={setNewAmount} keyboardType="decimal-pad" placeholder="Importe en euros" placeholderTextColor={colors.textDisabled} style={[stitchCostStyles.modalInput, { color: colors.text, borderColor: colors.border }]} /><TextInput value={newDesc} onChangeText={setNewDesc} placeholder="Descripción" placeholderTextColor={colors.textDisabled} style={[stitchCostStyles.modalInput, { color: colors.text, borderColor: colors.border }]} /><Pressable disabled={saving} onPress={onSave} style={[stitchCostStyles.addButton, { backgroundColor: colors.primary, opacity: saving ? 0.5 : 1 }]}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{saving ? 'Guardando…' : 'Guardar gasto'}</Text></Pressable><Pressable onPress={() => setShowAddModal(false)} style={stitchCostStyles.cancel}><Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text></Pressable></View></View></Modal>
    </SafeAreaView>
  );
}

function Category({ label, value, percent, color, colors }: { label: string; value: string; percent: string; color: string; colors: ReturnType<typeof useColors> }) {
  return <View style={stitchCostStyles.category}><View style={[stitchCostStyles.colorDot, { backgroundColor: color }]} /><View style={{ flex: 1 }}><Text style={[stitchCostStyles.body, { color: colors.text }]}>{label}</Text><Text style={[stitchCostStyles.small, { color: colors.textSecondary }]}>{percent}</Text></View><Text style={[stitchCostStyles.amount, { color: colors.text }]}>{value}</Text></View>;
}

function CostPlant({ name, detail, amount, note, colors }: { name: string; detail: string; amount: string; note: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[stitchCostStyles.plantRow, { borderTopColor: colors.border }]}><Ionicons name="leaf-outline" size={18} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[stitchCostStyles.cardTitle, { color: colors.text }]}>{name}</Text><Text style={[stitchCostStyles.body, { color: colors.textSecondary }]}>{detail} · {note}</Text></View><Text style={[stitchCostStyles.amount, { color: colors.text }]}>{amount}</Text></View>;
}

const stitchCostStyles = StyleSheet.create({
  container: { flex: 1 }, header: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth }, back: { flexDirection: 'row', alignItems: 'center', minWidth: 80, gap: 1 }, new: { flexDirection: 'row', alignItems: 'center', minWidth: 58, justifyContent: 'flex-end' }, headerTitle: { fontSize: 17, fontWeight: '800' }, content: { padding: 16, gap: 14, paddingBottom: 100 }, subtitle: { fontSize: 13 }, totalCard: { borderWidth: 1, borderRadius: 20, padding: 16 }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }, totalLine: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4 }, total: { fontSize: 32, fontWeight: '900' }, season: { fontSize: 12, fontWeight: '800' }, saved: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }, savedText: { fontSize: 12 }, amortized: { fontSize: 11, marginTop: 5 }, divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 }, breakdownTitle: { fontSize: 13, fontWeight: '800' }, categoryGrid: { gap: 10, marginTop: 10 }, category: { flexDirection: 'row', alignItems: 'center', gap: 8 }, colorDot: { width: 9, height: 9, borderRadius: 5 }, body: { fontSize: 12, lineHeight: 18 }, small: { fontSize: 10 }, amount: { fontSize: 13, fontWeight: '800' }, tip: { borderWidth: 1, borderRadius: 17, padding: 14, flexDirection: 'row', gap: 9 }, cardTitle: { fontSize: 14, fontWeight: '800' }, gardenCard: { borderWidth: 1, borderRadius: 20, padding: 15 }, gardenHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }, plantRow: { minHeight: 59, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 8 }, receipt: { borderWidth: 1, borderRadius: 18, padding: 16, alignItems: 'center', gap: 8 }, outlineButton: { minHeight: 44, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }, addButton: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000044' }, modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 }, modalTitle: { fontSize: 20, fontWeight: '800' }, modalInput: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 15 }, cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
