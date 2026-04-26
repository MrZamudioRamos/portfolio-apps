import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { usePurchases } from '@portfolio/billing';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS, CROPS_BY_ID, CATEGORY_CONFIG } from '../src/data/crops';
import { getCompatibilityStatus } from '../src/data/companions';
import type { CropInfo } from '../src/data/crops';

type Mode = 'browse' | 'check';

const FREE_PREVIEW_COUNT = 4;

export default function CompanionsScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { isPro } = usePurchases();

  const [mode, setMode] = useState<Mode>('browse');
  const [search, setSearch] = useState('');
  const [selectedA, setSelectedA] = useState<CropInfo | null>(null);
  const [selectedB, setSelectedB] = useState<CropInfo | null>(null);
  const [pickingSlot, setPickingSlot] = useState<'A' | 'B' | null>(null);

  const filtered = useMemo(
    () =>
      CROPS.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const { t } = useTranslation();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  // ── Browse mode ──────────────────────────────────────────────────────────────

  function renderBrowseItem(crop: CropInfo, index: number) {
    const locked = !isPro && index >= FREE_PREVIEW_COUNT;
    const companions = crop.companions.map((id) => CROPS_BY_ID[id]).filter(Boolean);
    const incompatible = crop.incompatible.map((id) => CROPS_BY_ID[id]).filter(Boolean);

    return (
      <View key={crop.id} style={{ position: 'relative' }}>
        <Card padded style={{ ...s.browseCard, ...(locked ? s.lockedCard : {}) }}>
          <View style={s.browseHeader}>
            <Text style={s.browseEmoji}>{crop.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.browseName, { color: locked ? colors.textDisabled : colors.text }]}>
                {crop.name}
              </Text>
              <Text style={[s.browseCategory, { color: colors.primary }]}>
                {CATEGORY_CONFIG[crop.category]?.label}
              </Text>
            </View>
          </View>

          {!locked && (
            <>
              {companions.length > 0 && (
                <View style={s.chipSection}>
                  <Text style={[s.chipSectionLabel, { color: '#2E7D32' }]}>🤝 {t('companions.goodNeighbors')}</Text>
                  <View style={s.chipRow}>
                    {companions.map((c) => (
                      <View key={c.id} style={[s.chip, { backgroundColor: '#4CAF5018', borderColor: '#4CAF50' }]}>
                        <Text style={s.chipText}>{c.emoji} {c.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {incompatible.length > 0 && (
                <View style={s.chipSection}>
                  <Text style={[s.chipSectionLabel, { color: '#C62828' }]}>❌ {t('companions.badNeighbors')}</Text>
                  <View style={s.chipRow}>
                    {incompatible.map((c) => (
                      <View key={c.id} style={[s.chip, { backgroundColor: '#EF535018', borderColor: '#EF5350' }]}>
                        <Text style={s.chipText}>{c.emoji} {c.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {companions.length === 0 && incompatible.length === 0 && (
                <Text style={[s.neutralText, { color: colors.textDisabled }]}>
                  {t('companions.noAssociations')}
                </Text>
              )}
            </>
          )}
        </Card>

        {locked && (
          <Pressable
            onPress={() => router.push('/paywall')}
            style={[s.lockOverlay, { backgroundColor: colors.background + 'E8' }]}
          >
            <View style={[s.lockBadge, { backgroundColor: colors.primary, ...shadows.md }]}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={s.lockText}>{t('companions.proUnlock')}</Text>
            </View>
          </Pressable>
        )}
      </View>
    );
  }

  // ── Check mode ───────────────────────────────────────────────────────────────

  const compatibility = useMemo(() => {
    if (!selectedA || !selectedB) return null;
    return getCompatibilityStatus(selectedA.id, selectedB.id);
  }, [selectedA, selectedB]);

  const COMPAT_CONFIG = {
    companion:    { emoji: '🤝', label: t('companions.goodMatch'), color: '#4CAF50', bg: '#4CAF5018' },
    incompatible: { emoji: '❌', label: t('companions.badMatch'), color: '#EF5350', bg: '#EF535018' },
    neutral:      { emoji: '➖', label: t('companions.neutral'), color: '#757575', bg: colors.surfaceAlt },
  };

  function CropPicker({ slot, crop }: { slot: 'A' | 'B'; crop: CropInfo | null }) {
    const isPickingThis = pickingSlot === slot;
    return (
      <Pressable
        onPress={() => setPickingSlot(isPickingThis ? null : slot)}
        style={[
          s.cropPickerBtn,
          {
            backgroundColor: isPickingThis ? colors.primary + '18' : colors.surface,
            borderColor: isPickingThis ? colors.primary : colors.border,
          },
        ]}
      >
        {crop ? (
          <>
            <Text style={{ fontSize: 28 }}>{crop.emoji}</Text>
            <Text style={[s.pickerName, { color: colors.text }]} numberOfLines={1}>{crop.name}</Text>
            <Pressable onPress={() => slot === 'A' ? setSelectedA(null) : setSelectedB(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textDisabled} />
            </Pressable>
          </>
        ) : (
          <>
            <View style={[s.pickerPlaceholderIcon, { borderColor: colors.border }]}>
              <Ionicons name="add" size={20} color={colors.textSecondary} />
            </View>
            <Text style={[s.pickerPlaceholderText, { color: colors.textSecondary }]}>
              {slot === 'A' ? t('companions.firstCrop') : t('companions.secondCrop')}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('companions.title')}</Text>
          {!isPro && (
            <Text style={[s.headerSub, { color: colors.textSecondary }]}>
              {t('companions.proSub')}
            </Text>
          )}
        </View>
        {!isPro && (
          <Pressable
            onPress={() => router.push('/paywall')}
            style={[s.proBadge, { backgroundColor: colors.primary }]}
          >
            <Text style={s.proBadgeText}>⭐ Pro</Text>
          </Pressable>
        )}
      </View>

      {/* Mode tabs */}
      <View style={[s.tabs, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        {(['browse', 'check'] as Mode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => { setMode(m); setSearch(''); setPickingSlot(null); }}
            style={[s.tab, mode === m && { backgroundColor: colors.surface, ...shadows.sm }]}
          >
            <Text style={[s.tabText, { color: mode === m ? colors.primary : colors.textSecondary }]}>
              {m === 'browse' ? `📋 ${t('companions.browse')}` : `🔍 ${t('companions.check')}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Browse mode ── */}
      {mode === 'browse' && (
        <>
          <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('companions.searchCrop')}
              placeholderTextColor={colors.textDisabled}
              style={[s.searchInput, { color: colors.text }]}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textDisabled} />
              </Pressable>
            )}
          </View>

          <ScrollView
            contentContainerStyle={s.browseList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.map((crop, i) => renderBrowseItem(crop, i))}
            {!isPro && filtered.length > FREE_PREVIEW_COUNT && (
              <Pressable
                onPress={() => router.push('/paywall')}
                style={[s.unlockBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}
              >
                <Text style={[s.unlockBannerText, { color: colors.primary }]}>
                  ⭐ {t('companions.unlockRemaining', { count: filtered.length - FREE_PREVIEW_COUNT })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </Pressable>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {/* ── Check mode ── */}
      {mode === 'check' && (
        <ScrollView
          contentContainerStyle={s.checkContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pickers */}
          <View style={s.pickersRow}>
            <CropPicker slot="A" crop={selectedA} />
            <View style={s.vsCircle}>
              <Text style={[s.vsText, { color: colors.textSecondary }]}>VS</Text>
            </View>
            <CropPicker slot="B" crop={selectedB} />
          </View>

          {/* Result */}
          {selectedA && selectedB && compatibility && (
            <View
              style={[
                s.resultCard,
                { backgroundColor: COMPAT_CONFIG[compatibility].bg, borderColor: COMPAT_CONFIG[compatibility].color },
              ]}
            >
              <Text style={s.resultEmoji}>{COMPAT_CONFIG[compatibility].emoji}</Text>
              <Text style={[s.resultLabel, { color: COMPAT_CONFIG[compatibility].color }]}>
                {COMPAT_CONFIG[compatibility].label}
              </Text>
              <Text style={[s.resultDesc, { color: colors.text }]}>
                {selectedA.name} + {selectedB.name}
              </Text>
              {compatibility === 'companion' && (
                <Text style={[s.resultNote, { color: colors.textSecondary }]}>
                  {t('companions.companionNote', { spacing: Math.min(selectedA.spacing, selectedB.spacing) })}
                </Text>
              )}
              {compatibility === 'incompatible' && (
                <Text style={[s.resultNote, { color: colors.textSecondary }]}>
                  {t('companions.incompatibleNote')}
                </Text>
              )}
            </View>
          )}

          {/* Crop list for picker */}
          {pickingSlot && (
            <>
              <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.lg }]}>
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={pickingSlot === 'A' ? t('companions.searchFirst') : t('companions.searchSecond')}
                  placeholderTextColor={colors.textDisabled}
                  style={[s.searchInput, { color: colors.text }]}
                  autoFocus
                />
              </View>
              <View style={s.cropPickList}>
                {filtered.map((crop) => {
                  const otherSelected = pickingSlot === 'A' ? selectedB : selectedA;
                  const status = otherSelected ? getCompatibilityStatus(crop.id, otherSelected.id) : null;
                  const statusColor =
                    status === 'companion' ? '#4CAF50' :
                    status === 'incompatible' ? '#EF5350' : null;
                  return (
                    <Pressable
                      key={crop.id}
                      onPress={() => {
                        if (pickingSlot === 'A') setSelectedA(crop);
                        else setSelectedB(crop);
                        setPickingSlot(null);
                        setSearch('');
                      }}
                      style={[
                        s.cropPickRow,
                        { borderBottomColor: colors.border },
                        statusColor && { backgroundColor: statusColor + '10' },
                      ]}
                    >
                      <Text style={{ fontSize: 22, width: 32 }}>{crop.emoji}</Text>
                      <Text style={[s.cropPickName, { color: colors.text, flex: 1 }]}>{crop.name}</Text>
                      {statusColor && (
                        <Ionicons
                          name={status === 'companion' ? 'checkmark-circle' : 'close-circle'}
                          size={18}
                          color={statusColor}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {!selectedA && !selectedB && !pickingSlot && (
            <View style={s.checkEmpty}>
              <Text style={s.checkEmptyEmoji}>🌿</Text>
              <Text style={[s.checkEmptyText, { color: colors.textSecondary }]}>
                {t('companions.checkEmpty')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    headerSub: { fontSize: fontSize.xs, marginTop: 1 },
    proBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.full,
    },
    proBadgeText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    tabs: {
      flexDirection: 'row',
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: 3,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      alignItems: 'center',
    },
    tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: fontSize.md },
    browseList: { paddingHorizontal: spacing.xl, gap: spacing.md },
    browseCard: { gap: spacing.md },
    lockedCard: { opacity: 0.4 },
    browseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    browseEmoji: { fontSize: 32 },
    browseName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    browseCategory: { fontSize: fontSize.xs, marginTop: 1 },
    chipSection: { gap: spacing.xs },
    chipSectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    chipText: { fontSize: fontSize.xs },
    neutralText: { fontSize: fontSize.xs, fontStyle: 'italic' },
    lockOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.lg,
    },
    lockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
    },
    lockText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    unlockBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      marginTop: spacing.sm,
    },
    unlockBannerText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    // Check mode
    checkContent: { padding: spacing.xl, gap: spacing.lg },
    pickersRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cropPickerBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      gap: spacing.xs,
      minHeight: 100,
      justifyContent: 'center',
    },
    pickerName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center' },
    pickerPlaceholderIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerPlaceholderText: { fontSize: fontSize.xs, textAlign: 'center' },
    vsCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vsText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    resultCard: {
      borderRadius: radii.lg,
      borderWidth: 2,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    resultEmoji: { fontSize: 48 },
    resultLabel: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    resultDesc: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    resultNote: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginTop: spacing.xs },
    cropPickList: { gap: 0 },
    cropPickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cropPickName: { fontSize: fontSize.md },
    checkEmpty: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.md },
    checkEmptyEmoji: { fontSize: 56 },
    checkEmptyText: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
  });
