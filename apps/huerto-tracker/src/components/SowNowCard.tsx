import { Ionicons } from '@expo/vector-icons';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CROP_DIFFICULTY } from '../data/crops';
import { CROP_IMAGES } from '../data/cropImages';
import type { ClimateZone } from '../models/garden';
import { useUserProfile } from '../hooks/useUserProfile';
import { getSowingNow } from '../utils/sowingNow';
import { ScalePress } from './ScalePress';

const DIFF_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

interface Props {
  climateZone: ClimateZone;
  /** Prioritize easy crops first (beginner mode). Default true. */
  beginnerFirst?: boolean;
  /** Max crops to show. Default 8. */
  max?: number;
}

/**
 * "Siembra ahora" — coach surface that tells the user what to plant THIS month
 * in THEIR climate zone, easy crops first. One tap to add. Hidden when nothing
 * is sowable this month (avoids an empty/sad card).
 */
export function SowNowCard({ climateZone, beginnerFirst = true, max = 8 }: Props) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [imgErr, setImgErr] = useState<Record<string, boolean>>({});
  const { profile } = useUserProfile();

  const month = new Date().getMonth() + 1;

  const crops = useMemo(() => {
    const { now } = getSowingNow(climateZone, month, profile?.sunlight);
    const sorted = beginnerFirst
      ? [...now].sort(
          (a, b) =>
            DIFF_ORDER[CROP_DIFFICULTY[a.id] ?? 'medium'] -
            DIFF_ORDER[CROP_DIFFICULTY[b.id] ?? 'medium']
        )
      : now;
    return sorted.slice(0, max);
  }, [climateZone, month, beginnerFirst, max, profile?.sunlight]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (crops.length === 0) return null;

  const monthName = new Intl.DateTimeFormat(i18n.language === 'val' ? 'ca-ES' : i18n.language, { month: 'long' }).format(new Date());

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.title, { color: colors.text }]}>{t('sowNow.title')}</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {t('sowNow.subtitle', { month: monthName })}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/catalog' as any)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('sowNow.seeAll')}
        >
          <Text style={[s.seeAll, { color: colors.primary }]}>{t('sowNow.seeAll')}</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {crops.map((crop) => {
          const diff = CROP_DIFFICULTY[crop.id] ?? 'medium';
          const name = t(`crops.${crop.id}.name`, { defaultValue: crop.name });
          const img = CROP_IMAGES[crop.id];
          return (
            <ScalePress
              key={crop.id}
              onPress={() =>
                router.push({ pathname: '/plant/new', params: { cropId: crop.id } } as any)
              }
              style={[s.crop, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            >
              <View style={[s.imgBox, { backgroundColor: colors.background }]}>
                {img && !imgErr[crop.id] ? (
                  <Image
                    source={{ uri: img }}
                    style={s.img}
                    resizeMode="cover"
                    onError={() => setImgErr((p) => ({ ...p, [crop.id]: true }))}
                  />
                ) : (
                  <Text style={s.emoji}>{crop.emoji}</Text>
                )}
                {diff === 'easy' && (
                  <View style={[s.easyBadge, { backgroundColor: colors.success }]}>
                    <Text style={s.easyText}>{t('sowNow.easy')}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.cropName, { color: colors.text }]} numberOfLines={1}>
                {name}
              </Text>
              <View style={s.addRow}>
                <Ionicons name="add-circle" size={13} color={colors.primary} />
                <Text style={[s.addText, { color: colors.primary }]}>{t('sowNow.plant')}</Text>
              </View>
            </ScalePress>
          );
        })}
      </ScrollView>
    </View>
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
    card: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.xl,
      borderRadius: radii.xl,
      borderWidth: 1,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    title: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    subtitle: { fontSize: fontSize.sm, marginTop: 2 },
    seeAll: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
    crop: {
      width: 96,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.sm,
      gap: 4,
    },
    imgBox: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    img: { width: '100%', height: '100%' },
    emoji: { fontSize: 40 },
    easyBadge: {
      position: 'absolute',
      top: 4,
      left: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radii.full,
    },
    easyText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    cropName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    addText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  });
