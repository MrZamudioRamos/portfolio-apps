import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from '../src/utils/glassEffect';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { usePro } from '../src/hooks/usePro';
import { CROPS_BY_ID } from '../src/data/crops';
import type { DiaryEntry } from '../src/models/diary-entry';
import type { Plant } from '../src/models/plant';
import { COST_CATEGORY_CONFIG, type CostCategory, type CostEntry } from '../src/models/cost-entry';

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
  const { activeGarden } = useActiveGarden();

  const plants = useCollection<Plant>('plants');
  const diaryEntries = useCollection<DiaryEntry>('diary_entries');
  const costEntries = useCollection<CostEntry>('cost_entries');

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
  const [saving, setSaving] = useState(false);

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

  const yearDiary = useMemo(
    () => diaryEntries.items.filter((e) => e.date.startsWith(yearStr) && (!gardenId || e.gardenId === gardenId)),
    [diaryEntries.items, yearStr, gardenId]
  );

  const yearCosts = useMemo(
    () => costEntries.items.filter((e) => e.date.startsWith(yearStr) && (!gardenId || e.gardenId === gardenId)),
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
    const totalKg = harvests.reduce((sum, e) => sum + (parseFloat((e.data as any)?.weight ?? '0') || 0), 0);
    const byPlant: Record<string, number> = {};
    for (const h of harvests) {
      if (h.plantId) byPlant[h.plantId] = (byPlant[h.plantId] ?? 0) + (parseFloat((h.data as any)?.weight ?? '0') || 0);
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
  const netProfit = harvestValue - totalCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : null;

  async function addCost() {
    const amount = parseFloat(newAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0 || !gardenId) return;
    setSaving(true);
    await costEntries.create({
      gardenId,
      category: newCategory,
      amount,
      description: newDesc.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
    });
    setNewAmount('');
    setNewDesc('');
    setNewCategory('seeds');
    setSaving(false);
    setShowAddModal(false);
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
            onPress={() => router.push('/paywall')}
            style={{ backgroundColor: colors.primary, paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'], borderRadius: radii.lg }}
          >
            <Text style={{ color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('costs.proBtn')}</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

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
          <Card padded style={[s.kpiCard, { borderWidth: 1.5, borderColor: roiColor + '55' }]}>
            <Text style={[s.kpiValue, { color: roiColor }]}>
              {roi === null ? '—' : `${roi >= 0 ? '+' : ''}${Math.round(roi)}%`}
            </Text>
            <Text style={[s.kpiLabel, { color: colors.textSecondary }]}>ROI</Text>
          </Card>
        </View>

        {/* Net profit banner */}
        {totalCost > 0 && (
          <View style={[s.netBanner, { backgroundColor: (netProfit >= 0 ? '#4CAF50' : '#EF5350') + '15', borderColor: (netProfit >= 0 ? '#4CAF50' : '#EF5350') + '40' }]}>
            <Ionicons name={netProfit >= 0 ? 'trending-up' : 'trending-down'} size={18} color={netProfit >= 0 ? '#4CAF50' : '#EF5350'} />
            <Text style={[s.netText, { color: netProfit >= 0 ? '#4CAF50' : '#EF5350' }]}>
              {netProfit >= 0 ? t('costs.netProfit') : t('costs.netLoss')} {fmt(Math.abs(netProfit), locale)}
            </Text>
          </View>
        )}

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

        {/* Recent cost entries list */}
        {yearCosts.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('costs.recentLabel')}</Text>
            <Card padded style={s.card}>
              {[...yearCosts]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 10)
                .map((e, i, arr) => {
                  const cfg = COST_CATEGORY_CONFIG[e.category];
                  return (
                    <View key={e.id}>
                      {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                      <View style={s.costRow}>
                        <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <Text style={[s.costLabel, { color: colors.text }]}>
                            {e.description || t(`costs.cat.${e.category}`)}
                          </Text>
                          <Text style={[s.costSub, { color: colors.textSecondary }]}>{e.date}</Text>
                        </View>
                        <Text style={[s.costAmt, { color: '#EF5350' }]}>-{fmt(e.amount, locale)}</Text>
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
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setShowAddModal(false)} />
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
                ? <ActivityIndicator color="#fff" />
                : <Text style={[s.saveBtnText, { color: '#fff' }]}>{t('costs.save')}</Text>
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
  });
