import { useColors, useTheme, Card, Button, ScreenHeader, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { CROPS, CATEGORY_CONFIG, CROP_DIFFICULTY, CROP_CONTAINER_MIN, type CropCategory, type CropDifficulty } from '../src/data/crops';
import { CROP_IMAGES } from '../src/data/cropImages';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import type { ClimateZone } from '../src/models/garden';

const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const CATEGORY_COLORS: Record<string, string> = {
  frutas: '#E53935',
  hojas: '#43A047',
  raices: '#FF7043',
  legumbres: '#8D6E63',
  cruciferas: '#66BB6A',
  cucurbitaceas: '#26A69A',
  aromaticas: '#7CB342',
  bulbos: '#AB47BC',
  medicinales: '#FFA726',
};
const SUN_EMOJI: Record<string, string> = { full: '☀️', partial: '⛅', shade: '🌑' };
const WATER_EMOJI: Record<string, string> = { high: '💧💧💧', medium: '💧💧', low: '💧' };

const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Map normalized crop id + Spanish name → crop id, to resolve companion strings to catalog entries.
const CROP_ID_BY_NAME: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const c of CROPS) {
    m[norm(c.id)] = c.id;
    m[norm(c.name)] = c.id;
  }
  return m;
})();

export default function CatalogScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { activeGarden } = useActiveGarden();
  const zone = (activeGarden?.climateZone ?? 'mediterranea') as ClimateZone;

  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const focusCrop = typeof focus === 'string' && CROPS.some((c) => c.id === focus) ? focus : undefined;

  const [search, setSearch] = useState(() => (focusCrop ? t(`crops.${focusCrop}.name`, { defaultValue: focusCrop }) : ''));
  const [catFilter, setCatFilter] = useState<CropCategory | null>(null);
  const [diffFilter, setDiffFilter] = useState<CropDifficulty | null>(null);
  const [containerOnly, setContainerOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(focusCrop ?? null);
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
      if (diffFilter && (CROP_DIFFICULTY[c.id] ?? 'medium') !== diffFilter) return false;
      if (containerOnly) {
        const min = CROP_CONTAINER_MIN[c.id];
        if (min === null || min === undefined) return false;
      }
      if (!q) return true;
      const name = t(`crops.${c.id}.name`, { defaultValue: c.name }).toLowerCase();
      return name.includes(q) || c.name.toLowerCase().includes(q);
    });
  }, [search, catFilter, diffFilter, containerOnly, t]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  const goToCrop = (id: string) => {
    setCatFilter(null);
    setExpanded(id);
    setSearch(t(`crops.${id}.name`, { defaultValue: id }));
  };

  const renderAssoc = (items: string[], color: string, bg: string, border: string) =>
    items.map((c, i) => {
      const id = CROP_ID_BY_NAME[norm(c)];
      const label = id ? t(`crops.${id}.name`, { defaultValue: c }) : c;
      if (!id) {
        return (
          <View key={i} style={[s.assocChip, { backgroundColor: bg, borderColor: border }]}>
            <Text style={[s.assocTxt, { color }]}>{label}</Text>
          </View>
        );
      }
      return (
        <Pressable
          key={i}
          onPress={() => goToCrop(id)}
          style={({ pressed }) => [s.assocChip, { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[s.assocTxt, { color }]}>{label} ›</Text>
        </Pressable>
      );
    });

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <ScreenHeader
        title={t('catalog.title')}
        subtitle={t('catalog.subtitle', { count: CROPS.length })}
        onBack={() => router.back()}
        variant="left"
      />

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
        {/* Category chips */}
        <View style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.xs }}>
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
                      backgroundColor: active ? colors.text : colors.surfaceAlt,
                      borderColor: active ? colors.text : colors.border,
                    }]}
                  >
                    <Text style={[s.chipText, { color: active ? colors.background : colors.textSecondary }]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Difficulty chips */}
        <View style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.md }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}
          >
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {([null, 'easy', 'medium', 'hard'] as (CropDifficulty | null)[]).map((d) => {
                const active = diffFilter === d;
                const label = d === null
                  ? t('catalog.filterAll')
                  : t(`catalog.difficulty.${d}`);
                const dotColor = d === 'easy' ? '#4CAF50' : d === 'medium' ? '#FF9800' : d === 'hard' ? '#F44336' : undefined;
                return (
                  <Pressable
                    key={d ?? 'all-diff'}
                    onPress={() => setDiffFilter(d)}
                    style={[s.chip, {
                      backgroundColor: active ? colors.text : colors.surfaceAlt,
                      borderColor: active ? colors.text : colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }]}
                  >
                    {dotColor && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: active ? colors.background : dotColor }} />}
                    <Text style={[s.chipText, { color: active ? colors.background : colors.textSecondary }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setContainerOnly(v => !v)}
                style={[s.chip, {
                  backgroundColor: containerOnly ? colors.text : colors.surfaceAlt,
                  borderColor: containerOnly ? colors.text : colors.border,
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                }]}
              >
                <Text style={{ fontSize: 12 }}>🪴</Text>
                <Text style={[s.chipText, { color: containerOnly ? colors.background : colors.textSecondary }]}>
                  {t('catalog.containerFilter')}
                </Text>
              </Pressable>
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
          const catColor = CATEGORY_COLORS[crop.category] ?? colors.primary;
          const imgUrl = CROP_IMAGES[crop.id];
          const showImg = !!imgUrl && !imgErr[crop.id];
          const sowMs = crop.sowingMonths[zone] ?? [];
          const harMs = crop.harvestMonths[zone] ?? [];
          const diff = CROP_DIFFICULTY[crop.id] ?? 'medium';
          const diffColor = diff === 'easy' ? '#4CAF50' : diff === 'hard' ? '#F44336' : '#FF9800';
          const containerMin = CROP_CONTAINER_MIN[crop.id];
          const isPotFriendly = containerMin !== null && containerMin !== undefined;

          return (
            <Pressable
              key={crop.id}
              onPress={() => setExpanded(isOpen ? null : crop.id)}
              style={{ marginBottom: spacing.md }}
            >
              <Card
                padded
                style={StyleSheet.flatten([
                  s.card,
                  { borderColor: isOpen ? catColor : colors.border, borderWidth: isOpen ? 1.5 : 1 },
                ]) as ViewStyle}
              >
                {/* Compact row */}
                <View style={s.cropRow}>
                  <View style={[s.catAccent, { backgroundColor: catColor }]} />
                  {showImg ? (
                    <Image
                      source={{ uri: imgUrl }}
                      style={[s.thumb, { borderRadius: radii.md }]}
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
                      <Text style={{ fontSize: 28 }}>{crop.emoji}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[s.cropName, { color: colors.text }]}>{name}</Text>
                    <View style={[s.catBadge, { backgroundColor: catColor + '20' }]}>
                      <Text style={[s.catBadgeText, { color: catColor }]}>
                        {catCfg.emoji} {t(`cropCategory.${crop.category}`, { defaultValue: catCfg.label })}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: diffColor }} />
                      <Text style={[s.metaLine, { color: diffColor, marginTop: 0, fontWeight: fontWeight.semibold }]}>
                        {t(`catalog.difficulty.${diff}`)}
                      </Text>
                    </View>
                    <Text style={[s.metaLine, { color: colors.textSecondary }]}>
                      {SUN_EMOJI[crop.sunNeeds]} · {WATER_EMOJI[crop.waterNeeds]} · 🗓 {crop.daysToHarvest[0]}–{crop.daysToHarvest[1]}d{isPotFriendly ? ` · 🪴${containerMin}L` : ''}
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

                    {/* Hero image */}
                    {showImg && (
                      <Image
                        source={{ uri: imgUrl }}
                        style={[s.heroImg, { borderRadius: radii.md }]}
                        resizeMode="cover"
                        onError={() => setImgErr((p) => ({ ...p, [crop.id]: true }))}
                      />
                    )}

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
                      {isPotFriendly ? (
                        <View style={[s.detailChip, { backgroundColor: '#79554818' }]}>
                          <Text style={[s.detailTxt, { color: '#795548' }]}>
                            🪴 {t('catalog.containerMin', { liters: containerMin })}
                          </Text>
                        </View>
                      ) : (
                        <View style={[s.detailChip, { backgroundColor: colors.surfaceAlt }]}>
                          <Text style={[s.detailTxt, { color: colors.textDisabled }]}>
                            {t('catalog.containerNo')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Good neighbors */}
                    {crop.companions.length > 0 && (
                      <>
                        <Text style={[s.label, { color: colors.textSecondary }]}>{t('catalog.companions')}</Text>
                        <View style={s.assocRow}>
                          {renderAssoc(crop.companions, '#4CAF50', '#4CAF5015', '#4CAF5044')}
                        </View>
                      </>
                    )}

                    {/* Incompatible */}
                    {crop.incompatible.length > 0 && (
                      <>
                        <Text style={[s.label, { color: colors.textSecondary }]}>{t('catalog.incompatible')}</Text>
                        <View style={s.assocRow}>
                          {renderAssoc(crop.incompatible, '#F44336', '#F4433615', '#F4433644')}
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
    thumb: { width: 68, height: 68, overflow: 'hidden' },
    heroImg: { width: '100%', height: 220, marginBottom: 4 },
    catAccent: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: spacing.md },
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
    dot: { width: '85%', height: 14, borderRadius: 3, marginTop: 2 },
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
