import { useColors, useTheme, Card } from '@portfolio/ui';
import { Button } from '../src/components/ActionButton';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROP_DIFFICULTY, type CropCategory } from '../src/data/crops';
import { Mascot } from '../src/components/Mascot';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { useUserProfile } from '../src/hooks/useUserProfile';
import { EVENTS, track, trackImpression } from '../src/analytics';
import { getFirstCropRecommendations, type RecommendationReason } from '../src/utils/firstCropRecommendation';

const reasonKey: Record<RecommendationReason, string> = {
  sunlight: 'firstCrop.reasons.sunlight',
  container: 'firstCrop.reasons.container',
  seasonNow: 'firstCrop.reasons.seasonNow',
  seasonSoon: 'firstCrop.reasons.seasonSoon',
  easy: 'firstCrop.reasons.easy',
  quick: 'firstCrop.reasons.quick',
  preference: 'firstCrop.reasons.preference',
};

const PREFERENCE_CATEGORIES: Array<{ id: CropCategory; labelKey: string }> = [
  { id: 'frutas', labelKey: 'firstCrop.intentFrutas' },
  { id: 'hojas', labelKey: 'firstCrop.intentHojas' },
  { id: 'raices', labelKey: 'firstCrop.intentRaices' },
  { id: 'legumbres', labelKey: 'firstCrop.intentLegumbres' },
  { id: 'aromaticas', labelKey: 'firstCrop.intentAromaticas' },
];

export default function FirstCropScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, loading: profileLoading } = useUserProfile();
  const { activeGarden, gardensLoading } = useActiveGarden();
  const loading = profileLoading || gardensLoading;
  const [preferredCategories, setPreferredCategories] = useState<CropCategory[]>([]);
  const recommendations = useMemo(() => {
    if (!activeGarden || !profile) return [];
    return getFirstCropRecommendations({
      climateZone: activeGarden.climateZone,
      month: new Date().getMonth() + 1,
      sunlight: profile.sunlight,
      experience: profile.experience,
      space: profile.spaceTypes.includes('indoor') ? 'indoor' : profile.spaceTypes.includes('balcony') ? 'balcony' : profile.spaceTypes.includes('farm') ? 'garden' : 'patio',
      preferredCategories,
    });
  }, [activeGarden, profile, preferredCategories]);

  const choosing = useRef(false);
  useFocusEffect(React.useCallback(() => { choosing.current = false; }, []));
  useFocusEffect(React.useCallback(() => {
    if (recommendations.length) {
      trackImpression('recommendations:' + activeGarden?.id + ':' + JSON.stringify(profile) + ':' + preferredCategories.join(',') + ':' + recommendations.map(item => item.crop.id).join(','), EVENTS.firstCropRecommendationsShown, {
        count: recommendations.length,
        top_crop_id: recommendations[0].crop.id,
        context_complete: Boolean(activeGarden && profile),
        preferred_categories: preferredCategories,
      });
    }
  }, [recommendations, activeGarden, profile, preferredCategories]));

  const choose = (index: number) => {
    const recommendation = recommendations[index];
    if (!recommendation || choosing.current) return;
    choosing.current = true;
    track(EVENTS.firstCropPicked, {
      crop_id: recommendation.crop.id,
      rank: index + 1,
      match_score: recommendation.score,
      preferred_categories: preferredCategories,
    });
    router.push({ pathname: '/plant/new', params: { cropId: recommendation.crop.id, fromOnboarding: '1', recommendationAction: recommendation.action } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Mascot pose="point" size={88} />
          <Text style={{ color: colors.text, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, textAlign: 'center' }}>{t('firstCrop.title')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center' }}>{t('firstCrop.subtitle')}</Text>
        </View>
        <Card padded style={{ borderColor: colors.border }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{activeGarden ? t('firstCrop.context', { province: activeGarden.province, sunlight: t('onboarding.sun' + (profile?.sunlight ?? 'shade')[0].toUpperCase() + (profile?.sunlight ?? 'shade').slice(1)) }) : t('firstCrop.gardenReady')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs }}>{t('firstCrop.startSmall')}</Text>
        </Card>
        <Card padded style={{ borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('firstCrop.intentTitle')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs }}>{t('firstCrop.intentDesc')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: preferredCategories.length === 0 }}
              onPress={() => setPreferredCategories([])}
              style={{ borderWidth: 1, borderColor: preferredCategories.length === 0 ? colors.primary : colors.border, backgroundColor: preferredCategories.length === 0 ? colors.primary + '12' : colors.surface, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
            >
              <Text style={{ color: preferredCategories.length === 0 ? colors.primary : colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{t('firstCrop.intentAny')}</Text>
            </Pressable>
            {PREFERENCE_CATEGORIES.map(({ id, labelKey }) => {
              const selected = preferredCategories.includes(id);
              return (
                <Pressable
                  key={id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setPreferredCategories((current) => selected ? current.filter((category) => category !== id) : [...current, id])}
                  style={{ borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '12' : colors.surface, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
                >
                  <Text style={{ color: selected ? colors.primary : colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{t(labelKey)}</Text>
                </Pressable>
              );
            })}
          </View>
          {preferredCategories.length > 0 && <Pressable accessibilityRole="button" onPress={() => setPreferredCategories([])} style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start', marginTop: spacing.xs }}><Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{t('firstCrop.intentClear')}</Text></Pressable>}
        </Card>
        {recommendations.map((recommendation, index) => {
          const { crop } = recommendation;
          return (
            <Card key={crop.id} padded style={{ borderColor: index === 0 ? colors.primary : colors.border, borderWidth: index === 0 ? 2 : 1 }}>
              {index === 0 && <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{t('firstCrop.topPick')}</Text>}
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginTop: spacing.xs }}>
                <Text style={{ fontSize: 42 }}>{crop.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{t(`crops.${crop.id}.name`, { defaultValue: crop.name })}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('firstCrop.harvestRange', { min: crop.daysToHarvest[0], max: crop.daysToHarvest[1] })}</Text>
                </View>
              </View>
              <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
                {recommendation.reasons.map((reason) => <Text key={reason} style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>• {t(reasonKey[reason], { liters: recommendation.containerLiters })}</Text>)}
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t(`firstCrop.difficulty.${CROP_DIFFICULTY[crop.id] ?? 'medium'}`)}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t(`firstCrop.care.${crop.waterNeeds}`)}</Text>
              </View>
              <Button title={t(recommendation.action === 'sow' ? 'firstCrop.choose' : 'firstCrop.prepare')} onPress={() => choose(index)} variant={index === 0 ? 'primary' : 'outline'} size="lg" style={{ marginTop: spacing.md }} />
            </Card>
          );
        })}
        {loading && <ActivityIndicator color={colors.primary} />}
        {!loading && !recommendations.length && <Card padded><Text style={{ color: colors.text, lineHeight: 22 }}>{t('firstCrop.empty')}</Text><Button title={t('firstCrop.adjust')} variant="secondary" size="lg" onPress={() => router.replace('/onboarding')} style={{ marginTop: spacing.md }} /></Card>}
        {recommendations.length > 0 && <Button title={t('firstCrop.adjust')} variant="ghost" onPress={() => router.replace('/onboarding')} style={{ minHeight: 44 }} />}
        <Pressable accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => router.replace('/(tabs)')}><Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('firstCrop.later')}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
