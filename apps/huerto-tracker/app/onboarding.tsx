import { useOnboarding } from '@portfolio/shared';
import { useColors, useTheme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
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
import { Mascot } from '../src/components/Mascot';
import type { ExperienceLevel, GrowingMethod, SpaceType, SunlightLevel } from '../src/models/user-profile';
import type { FirstCropSpace } from '../src/utils/firstCropRecommendation';

type Step = 1 | 2 | 3 | 4;
type LocationMethod = 'auto' | 'manual';
const SPACES: Array<[FirstCropSpace, keyof typeof Ionicons.glyphMap, string, string]> = [
  ['balcony', 'home-outline', 'Balcón o terraza', 'Espacio exterior'],
  ['indoor', 'sunny-outline', 'Ventana con sol', 'Alféizar o repisa'],
  ['patio', 'home-outline', 'Interior luminoso', 'Salón o cocina'],
  ['garden', 'leaf-outline', 'Patio pequeño', 'Suelo de losas o patio'],
];
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
  const [space, setSpace] = useState<FirstCropSpace | null>('balcony');
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
  const choice = (id: string, selected: boolean, select: () => void, label: string, icon?: keyof typeof Ionicons.glyphMap, description?: string, compact = false) => (
    <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={description ? label + '. ' + description : label} onPress={select}
      style={({ pressed }) => ({ minHeight: compact ? 92 : description ? 76 : 68, width: compact ? '48%' : undefined, borderWidth: selected ? 2 : 1, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'flex-start' : 'center', justifyContent: compact ? 'space-between' : undefined, gap: compact ? spacing.xs : spacing.md, backgroundColor: selected ? colors.primary + '18' : colors.surface, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.75 : 1 })}>
      {icon && <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary + '25' : colors.surfaceAlt }}><Ionicons name={icon} size={22} color={selected ? colors.primary : colors.textSecondary} accessible={false} /></View>}
      <View style={{ flex: 1, width: compact ? '100%' : undefined, gap: 3 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: selected ? fontWeight.bold : fontWeight.medium }}>{label}</Text>
        {description && <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{description}</Text>}
      </View>
      <View style={{ position: compact ? 'absolute' : 'relative', top: compact ? spacing.sm : undefined, right: compact ? spacing.sm : undefined, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' }} accessible={false}>
        <Text style={{ color: selected ? colors.background : colors.textDisabled, fontSize: selected ? 16 : 17, fontWeight: fontWeight.bold }}>{selected ? '✓' : ''}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('onboarding.back')} onPress={() => { setError(null); if (step === 1) router.replace('/welcome'); else setStep((step - 1) as Step); }} disabled={saving || locating} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full, opacity: pressed ? 0.65 : 1 })}>
            <Ionicons name="chevron-back" size={24} color={colors.text} accessible={false} />
          </Pressable>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View accessibilityLabel={t('onboarding.stepOf', { current: step, total: 4 })} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
              {[1, 2, 3, 4].map((n) => <View key={n} style={{ flex: 1, maxWidth: 56, height: 6, borderRadius: radii.full, backgroundColor: n <= step ? colors.primary : colors.border }} />)}
            </View>
            <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary, textAlign: 'center', fontSize: fontSize.xs }}>{t('onboarding.stepOf', { current: step, total: 4 })}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView key={step} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm }}>
          {step === 1 && <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Mascot pose="wave" size={52} /></View>
              <View style={{ flex: 1, backgroundColor: colors.primary + '12', borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '25' }}>
                <Text style={{ color: colors.primaryDark, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Semillita dice:</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.md, lineHeight: 21, marginTop: 2 }}>“¡Hola! Dime dónde tienes hueco y buscamos plantas felices.”</Text>
              </View>
            </View>
            <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>¿Dónde vas a cultivar?</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 21, marginBottom: spacing.sm }}>Elige el espacio principal para tus primeras macetas:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}>{SPACES.map(([id, icon, label, description]) => choice(id, space === id, () => setSpace(id), label, icon, description, true))}</View>
          </>}
          {step === 2 && <><CoachHeader title={t('onboarding.sunTitle')} subtitle={t('onboarding.sunDesc')} />{([['full', 'sunny'], ['partial', 'partly-sunny-outline'], ['shade', 'moon-outline'], ['unknown', 'help-circle-outline']] as const).map(([id, icon]) => choice(id, sunlight === id, () => setSunlight(id), t('onboarding.sun' + id[0].toUpperCase() + id.slice(1)), icon, id === 'unknown' ? t('onboarding.sunUnknownDesc') : undefined))}</>}
          {step === 3 && <><CoachHeader title={t('onboarding.expTitle')} subtitle={t('onboarding.expDesc')} />{(['beginner', 'some', 'expert'] as const).map((id) => choice(id, experience === id, () => setExperience(id), t('onboarding.exp' + id[0].toUpperCase() + id.slice(1)), undefined, id === 'beginner' ? t('onboarding.expBeginnerNote') : undefined))}</>}
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
          <Button title={step === 4 ? t('onboarding.viewRecommendations') : 'Continuar'} onPress={step === 4 ? finish : next} loading={saving} disabled={locating || profileLoading || gardens.loading || (step === 1 && !space) || (step === 2 && !sunlight) || (step === 3 && !experience) || (step === 4 && (!province || !method))} size="lg" />
        </View>
      </View>
    </SafeAreaView>
  );
}
