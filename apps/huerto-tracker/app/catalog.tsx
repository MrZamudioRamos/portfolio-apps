import { useColors, useTheme, Card, Button, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS, CATEGORY_CONFIG, type CropCategory } from '../src/data/crops';
import { CROP_IMAGES } from '../src/data/cropImages';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import type { ClimateZone } from '../src/models/garden';

const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const SUN_EMOJI: Record<string, string> = { full: '☀️', partial: '⛅', shade: '🌑' };
const WATER_EMOJI: Record<string, string> = { high: '💧💧💧', medium: '💧💧', low: '💧' };

export default function CatalogScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { activeGarden } = useActiveGarden();
  const zone = (activeGarden?.climateZone ?? 'mediterranea') as ClimateZone;

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<CropCategory | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState<Record<string, boolean>>({});

  const FILTERS = useMemo(() => [
    { key: null as CropCategory | null, label: t('catalog.filterAll') },
    ...Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => ({
      key: k as CropCategory,
      label: `${cfg.emoji} ${t(`cropCategory.${k}`, { defaultValue: cfg.label })}`,
    })),
  ], [t]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CROPS.filter((c) => {
      if (catFilter && c.category !== catFilter) return false;
      if (!q) return true;
      const name = t(`crops.${c.id}.name`, { defaultValue: c.name }).toLowerCase();
      return name.includes(q) || c.name.toLowerCase().includes(q);
    });
  }, [search, catFilter, t]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('catalog.title')}</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>
            {t('catalog.subtitle', { count: CROPS.length })}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchBox, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        margin: spacing.lg,
        marginBottom: spacing.sm,
      }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('catalog.search')}
          placeholderTextColor={colors.textDisabled}
          style={[s.searchInput, { color: colors.text }]}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 80 }}
      >
        {/* Category chips — negative margin negates content padding */}
        <View style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.md }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
          >
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {FILTERS.map((f) => {
                const active = catFilter === f.key;
                return (
                  <Pressable
                    key={f.key ?? 'all'}
                    onPress={() => setCatFilter(f.key)}
                    style={[s.chip, {
                      backgroundColor: active ? colors.primary + '22' : colors.surfaceAlt,
                      borderColor: active ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[s.chipText, { color: active ? colors.primary : colors.textSecondary }]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {filtered.length === 0 && (
          <Text style={[s.emptyText, { color: colors.textDisabled }]}>{t('catalog.empty')}</Text>
        )}

        {filtered.map((crop) => {
          const isOpen = expanded === crop.id;
          const name = t(`crops.${crop.id}.name`, { defaultValue: crop.name });
          const tips = t(`crops.${crop.id}.tips`, { defaultValue: crop.tips });
          const catCfg = CATEGORY_CONFIG[crop.category];
          const imgUrl = CROP_IMAGES[crop.id];
          const showImg = !!imgUrl && !imgErr[crop.id];
          const sowMs = crop.sowingMonths[zone] ?? [];
          const harMs = crop.harvestMonths[zone] ?? [];

          return (
            <Pressable
              key={crop.id}
              onPress={() => setExpanded(isOpen ? null : crop.id)}
              style={{ marginBottom: spacing.sm }}
            >
              <Card
                padded
                style={StyleSheet.flatten([
                  s.card,
                  { borderColor: isOpen ? colors.primary : colors.border, borderWidth: isOpen ? 1.5 : 1 },
                ]) as ViewStyle}
              >
                {/* Compact row */}
                <View style={s.cropRow}>
                  {showImg ? (
                    <Image
                      source={{ uri: imgUrl }}
                      style={[s.thumb, { borderRadius: radii.md, borderColor: colors.border }]}
                      resizeMode="cover"
                      onError={() => setImgErr((p) => ({ ...p, [crop.id]: true }))}
                    />
                  ) : (
                    <View style={[s.thumb, {
                      borderRadius: radii.md,
                      backgroundColor: colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }]}>
                      <Text style={{ fontSize: 26 }}>{crop.emoji}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[s.cropName, { color: colors.text }]}>{name}</Text>
                    <View style={[s.catBadge, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[s.catBadgeText, { color: colors.primary }]}>
                        {catCfg.emoji} {t(`cropCategory.${crop.category}`, { defaultValue: catCfg.label })}
                      </Text>
                    </View>
                    <Text style={[s.metaLine, { color: colors.textSecondary }]}>
                      {SUN_EMOJI[crop.sunNeeds]} · {WATER_EMOJI[crop.waterNeeds]} · 🗓 {crop.daysToHarvest[0]}–{crop.daysToHarvest[1]}d
                    </Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                    style={{ marginLeft: spacing.sm }}
                  />
                </View>

                {isOpen && (
                  <>
                    <View style={[s.divider, { backgroundColor: colors.border }]} />

                    {/* Sowing calendar heatmap */}
                    <Text style={[s.label, { color: colors.textSecondary }]}>{t('catalog.sowing')}</Text>
                    <View style={s.monthRow}>
                      {MONTHS.map((m, i) => (
                        <View key={i} style={s.monthCell}>
                          <Text style={[s.monthLbl, { color: colors.textDisabled }]}>{m}</Text>
                          <View style={[s.dot, {
                            backgroundColor: sowMs.includes(i + 1) ? '#4CAF50' : colors.surfaceAlt,
                          }]} />
                        </View>
                      ))}
                    </View>

                    <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                      {t('catalog.harvest')}
                    </Text>
                    <View style={s.monthRow}>
                      {MONTHS.map((m, i) => (
                        <View key={i} style={s.monthCell}>
                          <Text style={[s.monthLbl, { color: colors.textDisabled }]}>{m}</Text>
                          <View style={[s.dot, {
                            backgroundColor: harMs.includes(i + 1) ? '#FF9800' : colors.surfaceAlt,
                          }]} />
                        </View>
                      ))}
                    </View>

                    {/* Details */}
                    <View style={[s.detailRow, { marginTop: spacing.md }]}>
                      <View style={[s.detailChip, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[s.detailTxt, { color: colors.textSecondary }]}>
                          {SUN_EMOJI[crop.sunNeeds]} {t(`catalog.sun.${crop.sunNeeds}`)}
                        </Text>
                      </View>
                      <View style={[s.detailChip, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[s.detailTxt, { color: colors.textSecondary }]}>
                          {t(`catalog.water.${crop.waterNeeds}`)}
                        </Text>
                      </View>
                      <View style={[s.detailChip, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[s.detailTxt, { color: colors.textSecondary }]}>📏 {crop.spacing} cm</Text>
                      </View>
                    </View>

                    {/* Good neighbors */}
                    {crop.companions.length > 0 && (
                      <>
                        <Text style={[s.label, { color: colors.textSecondary }]}>{t('catalog.companions')}</Text>
                        <View style={s.assocRow}>
                          {crop.companions.map((c, i) => (
                            <View key={i} style={[s.assocChip, { backgroundColor: '#4CAF5015', borderColor: '#4CAF5044' }]}>
                              <Text style={[s.assocTxt, { color: '#4CAF50' }]}>{c}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {/* Incompatible */}
                    {crop.incompatible.length > 0 && (
                      <>
                        <Text style={[s.label, { color: colors.textSecondary }]}>{t('catalog.incompatible')}</Text>
                        <View style={s.assocRow}>
                          {crop.incompatible.map((c, i) => (
                            <View key={i} style={[s.assocChip, { backgroundColor: '#F4433615', borderColor: '#F4433644' }]}>
                              <Text style={[s.assocTxt, { color: '#F44336' }]}>{c}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {/* Tips */}
                    <Text style={[s.label, { color: colors.textSecondary }]}>{t('catalog.tips')}</Text>
                    <Text style={[s.body, { color: colors.text }]}>{tips}</Text>

                    {/* CTA */}
                    <Button
                      title={t('catalog.addToGarden')}
                      onPress={() => router.push(`/plant/new?cropId=${crop.id}` as any)}
                      style={{ marginTop: spacing.md }}
                    />
                  </>
                )}
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
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
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    headerSub: { fontSize: fontSize.xs, marginTop: 1 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    searchInput: { flex: 1, fontSize: fontSize.md },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    chipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    emptyText: { textAlign: 'center', marginTop: spacing['2xl'], fontSize: fontSize.md },
    card: { gap: spacing.sm },
    cropRow: { flexDirection: 'row', alignItems: 'center' },
    thumb: { width: 58, height: 58, borderWidth: 1 },
    cropName: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    catBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      marginTop: 3,
    },
    catBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
    metaLine: { fontSize: fontSize.xs, marginTop: 4 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
    label: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.sm,
    },
    monthRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    monthCell: { alignItems: 'center', flex: 1 },
    monthLbl: { fontSize: 8 },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
    detailRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    detailChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.md },
    detailTxt: { fontSize: fontSize.xs },
    assocRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    assocChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    assocTxt: { fontSize: 11, fontWeight: fontWeight.medium },
    body: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 2 },
  });
