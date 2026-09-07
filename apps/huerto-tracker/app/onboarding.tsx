import { useOnboarding } from '@portfolio/shared';
import { Button, Card, useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

type Step = 0 | 1 | 2 | 3 | 4;
type LocationMethod = 'auto' | 'manual';
const SPACES: Array<[FirstCropSpace, string]> = [['balcony', '🪟'], ['terrace', '☀️'], ['patio', '🌿'], ['garden', '🪴'], ['indoor', '🏠']];
const SPACE_MAP: Record<FirstCropSpace, { space: SpaceType; method: GrowingMethod; gardenType: Garden['gardenType'] }> = {
  balcony: { space: 'balcony', method: 'outdoorContainers', gardenType: 'balcon' }, terrace: { space: 'balcony', method: 'outdoorContainers', gardenType: 'balcon' },
  patio: { space: 'backyard', method: 'ground', gardenType: 'huerto' }, garden: { space: 'farm', method: 'ground', gardenType: 'huerto' },
  indoor: { space: 'indoor', method: 'indoorContainers', gardenType: 'maceta' },
};

export default function OnboardingScreen() {
  const colors = useColors(); const { spacing, fontSize, fontWeight, radii } = useTheme(); const { t } = useTranslation(); const router = useRouter();
  const { complete } = useOnboarding('huerto'); const gardens = useCollection<Garden>('gardens'); const { switchGarden } = useActiveGarden(); const { save } = useUserProfile();
  const [step, setStep] = useState<Step>(0); const [space, setSpace] = useState<FirstCropSpace | null>(null); const [sunlight, setSunlight] = useState<SunlightLevel | null>(null); const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [province, setProvince] = useState(''); const [method, setMethod] = useState<LocationMethod | null>(null); const [search, setSearch] = useState(''); const [locating, setLocating] = useState(false); const [saving, setSaving] = useState(false);
  const climateZone = province ? PROVINCE_ZONES[province] : undefined;
  const candidates = useMemo(() => PROVINCES.filter((p) => p.toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0, 12), [search]);
  React.useEffect(() => { if (step > 0) track(EVENTS.onboardingStepViewed, { step, source: 'onboarding' }); }, [step]);
  const next = () => { const answer = step === 1 ? space : step === 2 ? sunlight : experience; if (answer) track(EVENTS.onboardingStepCompleted, { step, answer }); setStep((step + 1) as Step); };
  const locate = async () => { setLocating(true); try { const permission = await Location.requestForegroundPermissionsAsync(); if (permission.status !== 'granted') return; const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }); const nearest = getNearestProvince(position.coords.latitude, position.coords.longitude); if (nearest) { setProvince(nearest); setMethod('auto'); track(EVENTS.provinceDetected, { province: nearest, method: 'auto' }); } } finally { setLocating(false); } };
  const finish = async () => { if (!space || !sunlight || !experience || !province || !climateZone || !method) return; setSaving(true); try { const mapped = SPACE_MAP[space]; await save({ spaceTypes: [mapped.space], growingMethods: [mapped.method], sunlight, experience }); const existing = gardens.items[0]; const garden = existing ?? await gardens.create({ name: t('onboarding.firstGardenName'), climateZone, province, gardenType: mapped.gardenType, color: '#76C77A', notes: '', hemisphere: 'norte' }); await switchGarden(garden.id); track(EVENTS.gardenCreated, { gardenType: mapped.gardenType, source: 'onboarding' }); track(EVENTS.onboardingStepCompleted, { step: 'location', answer: province }); await complete(); track(EVENTS.onboardingCompleted, { space, sunlight, experience, location_method: method, climate_zone_known: true }); await AsyncStorage.setItem('@huerto/onboarding_completed_at', String(Date.now())); router.replace('/first-crop' as any); } finally { setSaving(false); } };
  const choice = (id: string, selected: boolean, select: () => void, label: string, icon?: string) => <Pressable key={id} onPress={select} style={[s.choice, { backgroundColor: selected ? colors.primary + '18' : colors.surface, borderColor: selected ? colors.primary : colors.border }]}>{icon ? <Text style={{ fontSize: 24 }}>{icon}</Text> : null}<Text style={{ color: colors.text, fontSize: fontSize.md }}>{label}</Text></Pressable>;
  const s = styles(radii.lg);
  return <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}><View style={{ padding: spacing.xl, gap: spacing.md }}>{step > 0 ? <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('onboarding.stepOf', { current: step, total: 4 })}</Text> : null}{step === 0 ? <View style={{ alignItems: 'center', gap: spacing.xl, paddingTop: spacing.xl }}><Mascot pose="wave" size={120}/><Text style={{ color: colors.text, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, textAlign: 'center' }}>{t('onboarding.welcomeTitle')}</Text><Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('onboarding.welcomeSubtitle')}</Text><Button title={t('onboarding.start')} onPress={() => setStep(1)} size="lg"/></View> : null}{step === 1 ? <><CoachHeader title={t('onboarding.spaceTitle')} subtitle={t('onboarding.spaceDesc')} pose="point"/>{SPACES.map(([id, icon]) => choice(id, space === id, () => setSpace(id), t(`onboarding.space.${id}`), icon))}</> : null}{step === 2 ? <><CoachHeader title={t('onboarding.sunTitle')} subtitle={t('onboarding.sunDesc')} pose="idle"/>{(['full','partial','shade'] as SunlightLevel[]).map((id) => choice(id, sunlight === id, () => setSunlight(id), t(`onboarding.sun${id[0].toUpperCase()}${id.slice(1)}`)))}</> : null}{step === 3 ? <><CoachHeader title={t('onboarding.expTitle')} subtitle={t('onboarding.expDesc')} pose="idle"/>{(['beginner','some','expert'] as ExperienceLevel[]).map((id) => choice(id, experience === id, () => setExperience(id), t(`onboarding.exp${id[0].toUpperCase()}${id.slice(1)}`)))}</> : null}{step === 4 ? <ScrollView contentContainerStyle={{ gap: spacing.md }}><CoachHeader title={t('onboarding.locationTitle')} subtitle={t('onboarding.locationPrivacy')} pose="point"/><Button title={locating ? t('onboarding.detecting') : t('onboarding.detectLocation')} onPress={locate} disabled={locating} variant="secondary"/><TextInput value={search} onChangeText={setSearch} placeholder={t('onboarding.searchProvince')} placeholderTextColor={colors.textDisabled} style={{ padding: spacing.md, color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md }}/>{candidates.map((item) => <Pressable key={item} onPress={() => { setProvince(item); setMethod('manual'); track(EVENTS.provinceSelected, { province: item, method: 'manual' }); }} style={{ padding: spacing.md, backgroundColor: province === item ? colors.primary + '18' : colors.surface, borderRadius: radii.md }}><Text style={{ color: colors.text }}>{item}</Text></Pressable>)}{province ? <Card padded><Text style={{ color: colors.text }}>{t('onboarding.selectedProvince', { province })}</Text></Card> : null}</ScrollView> : null}</View>{step > 0 ? <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.xl }}><Button title={t('onboarding.back')} onPress={() => setStep((step - 1) as Step)} variant="secondary" style={{ flex: 1 }}/>{step < 4 ? <Button title={t('onboarding.continue')} onPress={next} disabled={(step === 1 && !space) || (step === 2 && !sunlight) || (step === 3 && !experience)} style={{ flex: 1 }}/> : <Button title={t('onboarding.viewRecommendations')} onPress={finish} disabled={!province || !method} loading={saving} style={{ flex: 1 }}/>}</View> : null}</SafeAreaView>;
}
const styles = (radius: number) => StyleSheet.create({ container: { flex: 1, justifyContent: 'space-between' }, choice: { borderWidth: 1, borderRadius: radius, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 } });
