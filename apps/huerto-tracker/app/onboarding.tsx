import { useOnboarding } from '@portfolio/shared';
import { useColors, useTheme } from '@portfolio/ui';
import { Button } from '../src/components/ActionButton';
import { createStore, useCollection } from '@portfolio/storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Garden } from '../src/models/garden';
import { PROVINCES, PROVINCE_ZONES } from '../src/data/zones';
import { getNearestProvince } from '../src/utils/weather';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { useUserProfile } from '../src/hooks/useUserProfile';
import { EVENTS, track } from '../src/analytics';
import { CoachHeader } from '../src/components/CoachHeader';
import type { ExperienceLevel, GrowingMethod, SpaceType, SunlightLevel } from '../src/models/user-profile';
import type { FirstCropSpace } from '../src/utils/firstCropRecommendation';

type Step = 1 | 2 | 3 | 4;
type LocationMethod = 'auto' | 'manual';
const SPACES: Array<[FirstCropSpace, string]> = [['balcony', '🪟'], ['terrace', '☀️'], ['patio', '🌿'], ['garden', '🪴'], ['indoor', '🏠']];
const SPACE_MAP: Record<FirstCropSpace, { space: SpaceType; method: GrowingMethod; gardenType: Garden['gardenType'] }> = {
  balcony: { space: 'balcony', method: 'outdoorContainers', gardenType: 'balcon' },
  terrace: { space: 'balcony', method: 'outdoorContainers', gardenType: 'balcon' },
  patio: { space: 'backyard', method: 'ground', gardenType: 'huerto' },
  garden: { space: 'farm', method: 'ground', gardenType: 'huerto' },
  indoor: { space: 'indoor', method: 'indoorContainers', gardenType: 'maceta' },
};
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();

export default function OnboardingScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { complete } = useOnboarding('huerto');
  const gardens = useCollection<Garden>('gardens');
  const { activeGarden, switchGarden } = useActiveGarden();
  const { profile, save, loading: profileLoading } = useUserProfile();
  const [step, setStep] = useState<Step>(1);
  const [space, setSpace] = useState<FirstCropSpace | null>(null);
  const [sunlight, setSunlight] = useState<SunlightLevel | 'unknown' | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [province, setProvince] = useState('');
  const [method, setMethod] = useState<LocationMethod | null>(null);
  const [search, setSearch] = useState('');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const climateZone = PROVINCE_ZONES[province];
  const candidates = useMemo(() => PROVINCES.filter((p) => normalize(p).includes(normalize(search))), [search]);

  React.useEffect(() => { track(EVENTS.onboardingStepViewed, { step, source: 'onboarding' }); }, [step]);
  const next = () => {
    const answer = step === 1 ? space : step === 2 ? sunlight : experience;
    if (!answer || step === 4) return;
    track(EVENTS.onboardingStepCompleted, { step, answer });
    setError(null);
    setStep((step + 1) as Step);
  };
  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { setError('onboarding.locationUnavailable'); return; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const nearest = getNearestProvince(position.coords.latitude, position.coords.longitude);
      if (!nearest) { setError('onboarding.locationUnavailable'); return; }
      setProvince(nearest);
      setMethod('auto');
      track(EVENTS.provinceDetected, { province: nearest, method: 'auto' });
    } catch { setError('onboarding.locationUnavailable'); }
    finally { setLocating(false); }
  };
  const finish = async () => {
    if (submitting.current || !space || !sunlight || !experience || !province || !climateZone || !method) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      const mapped = SPACE_MAP[space];
      // Preserve coaching preferences; use the existing conservative light value.
      await save({ spaceTypes: [mapped.space], growingMethods: [mapped.method], sunlight: sunlight === 'unknown' ? 'shade' : sunlight, experience, coachingFloor: profile?.coachingFloor, coachingOverride: profile?.coachingOverride });
      const store = createStore<Garden>('gardens');
      const storedGardens = (await store.getAll()).filter(item => !item.deletedAt);
      const activeId = await AsyncStorage.getItem('@portfolio/active_garden_id');
      let garden = storedGardens.find(item => item.id === activeId) ?? storedGardens[0];
      if (garden) {
        await store.update(garden.id, { province, climateZone });
      } else {
        garden = await store.create({ name: t('onboarding.firstGardenName'), climateZone, province, gardenType: mapped.gardenType, color: '#76C77A', notes: '', hemisphere: 'norte' });
        track(EVENTS.gardenCreated, { gardenType: mapped.gardenType, source: 'onboarding' });
      }
      await switchGarden(garden.id);
      if (!await AsyncStorage.getItem('@huerto/onboarding_completed_at')) {
        await AsyncStorage.setItem('@huerto/onboarding_completed_at', String(Date.now()));
      }
      await complete();
      track(EVENTS.onboardingStepCompleted, { step: 'location', answer: province });
      track(EVENTS.onboardingCompleted, { space, sunlight, experience, location_method: method, climate_zone_known: true });
      router.replace('/first-crop');
    } catch { setError('onboarding.saveError'); }
    finally { submitting.current = false; setSaving(false); }
  };
  const choice = (id: string, selected: boolean, select: () => void, label: string, icon?: string, description?: string) => (
    <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={description ? label + '. ' + description : label} onPress={select}
      style={({ pressed }) => ({ minHeight: 56, borderWidth: selected ? 2 : 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: selected ? colors.surfaceAlt : colors.surface, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.75 : 1 })}>
      {icon && <Text style={{ fontSize: 24 }} accessible={false}>{icon}</Text>}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: selected ? fontWeight.bold : fontWeight.medium }}>{label}</Text>
        {description && <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{description}</Text>}
      </View>
      <Text style={{ color: colors.primary, fontSize: 20 }} accessible={false}>{selected ? '●' : '○'}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ padding: spacing.xl, gap: spacing.sm }}>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>{t('onboarding.stepOf', { current: step, total: 4 })}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {[1, 2, 3, 4].map((n) => <View key={n} style={{ flex: 1, height: 4, borderRadius: radii.full, backgroundColor: n <= step ? colors.primary : colors.border }} />)}
          </View>
        </View>
        <ScrollView key={step} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm }}>
          {step === 1 && <><CoachHeader title={t('onboarding.spaceTitle')} subtitle={t('onboarding.spaceDesc')} pose="point" />{SPACES.map(([id, icon]) => choice(id, space === id, () => setSpace(id), t('onboarding.space.' + id), icon))}</>}
          {step === 2 && <><CoachHeader title={t('onboarding.sunTitle')} subtitle={t('onboarding.sunDesc')} />{(['full', 'partial', 'shade', 'unknown'] as const).map((id) => choice(id, sunlight === id, () => setSunlight(id), t('onboarding.sun' + id[0].toUpperCase() + id.slice(1)), undefined, id === 'unknown' ? t('onboarding.sunUnknownDesc') : undefined))}</>}
          {step === 3 && <><CoachHeader title={t('onboarding.expTitle')} subtitle={t('onboarding.expDesc')} />{(['beginner', 'some', 'expert'] as const).map((id) => choice(id, experience === id, () => setExperience(id), t('onboarding.exp' + id[0].toUpperCase() + id.slice(1))))}</>}
          {step === 4 && <>
            <CoachHeader title={t('onboarding.locationTitle')} subtitle={t('onboarding.locationPrivacy')} />
            <Button title={locating ? t('onboarding.detecting') : t('onboarding.detectLocation')} onPress={locate} disabled={locating || saving} variant="secondary" size="lg" />
            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>{t('onboarding.manualLocation')}</Text>
            <TextInput accessibilityLabel={t('onboarding.searchProvince')} value={search} onChangeText={setSearch} placeholder={t('onboarding.searchProvince')} placeholderTextColor={colors.textSecondary} style={{ minHeight: 48, padding: spacing.md, color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md }} />
            {candidates.map((item) => choice(item, province === item, () => { setProvince(item); setMethod('manual'); setError(null); track(EVENTS.provinceSelected, { province: item, method: 'manual' }); }, item))}
            {!candidates.length && <Text style={{ color: colors.textSecondary }}>{t('onboarding.noProvinces')}</Text>}
          </>}
        </ScrollView>
        <View style={{ padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
          {step === 4 && province !== '' && <Text accessibilityLiveRegion="polite" style={{ color: colors.text, fontWeight: fontWeight.bold }}>{t('onboarding.selectedProvince', { province })}</Text>}
          {error && <Text accessibilityRole="alert" style={{ color: colors.error }}>{t(error)}</Text>}
          <Button title={t(step === 4 ? 'onboarding.viewRecommendations' : 'onboarding.continue')} onPress={step === 4 ? finish : next} loading={saving} disabled={locating || profileLoading || gardens.loading || (step === 1 && !space) || (step === 2 && !sunlight) || (step === 3 && !experience) || (step === 4 && (!province || !method))} size="lg" />
          <Button title={t('onboarding.back')} onPress={() => { setError(null); if (step === 1) router.replace('/welcome'); else setStep((step - 1) as Step); }} disabled={saving || locating} variant="ghost" style={{ minHeight: 44 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}
