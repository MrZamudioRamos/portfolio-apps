import { useOnboarding } from '@portfolio/shared';
import { Button, Card, useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  FlatList,
  Image,
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
import { CLIMATE_ZONE_CONFIG, PROVINCE_ZONES } from '../src/data';
import { CROP_DIFFICULTY } from '../src/data/crops';
import { CROP_IMAGES } from '../src/data/cropImages';
import { getNearestProvince } from '../src/utils/weather';
import { getSowingNow } from '../src/utils/sowingNow';
import type { Garden } from '../src/models';
import {
  GARDEN_TYPE_CONFIG,
  type GardenType,
  type Hemisphere,
} from '../src/models/garden';
import {
  SPACE_TYPE_CONFIG,
  GROWING_METHOD_CONFIG,
  SUNLIGHT_CONFIG,
  EXPERIENCE_CONFIG,
  type SpaceType,
  type GrowingMethod,
  type SunlightLevel,
  type ExperienceLevel,
} from '../src/models/user-profile';
import { useUserProfile } from '../src/hooks/useUserProfile';
import { track, EVENTS } from '../src/analytics';
import { persistPickedImage } from '../src/utils/persistImage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoachBubble } from '../src/components/CoachBubble';
import { CoachHeader } from '../src/components/CoachHeader';
import { ScalePress } from '../src/components/ScalePress';
import { Mascot } from '../src/components/Mascot';

const NORTE_COUNTRIES: { country: string; emoji: string; regions: string[] }[] = [
  {
    country: 'España', emoji: '🇪🇸',
    regions: [
      'A Coruña', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz',
      'Baleares', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón',
      'Ceuta', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara',
      'Guipúzcoa', 'Huelva', 'Huesca', 'Jaén', 'La Rioja', 'Las Palmas', 'León',
      'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Melilla', 'Murcia', 'Navarra', 'Ourense',
      'Palencia', 'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia',
      'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid',
      'Vizcaya', 'Zamora', 'Zaragoza', 'Álava',
    ],
  },
  {
    country: 'Portugal', emoji: '🇵🇹',
    regions: ['Alentejo', 'Algarve', 'Azores', 'Centro (Portugal)', 'Lisboa', 'Norte (Portugal)'],
  },
  {
    country: 'Francia', emoji: '🇫🇷',
    regions: [
      'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Corse',
      'Grand Est', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine',
      'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
    ],
  },
  {
    country: 'Italia', emoji: '🇮🇹',
    regions: [
      'Campania', 'Emilia-Romagna', 'Lazio', 'Lombardia', 'Piemonte',
      'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Veneto',
    ],
  },
  {
    country: 'Alemania', emoji: '🇩🇪',
    regions: [
      'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Hamburg',
      'Hessen', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Sachsen',
    ],
  },
  {
    country: 'Países Bajos', emoji: '🇳🇱',
    regions: ['Gelderland', 'Noord-Brabant', 'Noord-Holland', 'Utrecht', 'Zuid-Holland'],
  },
  {
    country: 'Bélgica', emoji: '🇧🇪',
    regions: ['Bruselas', 'Flandes', 'Valonia'],
  },
  {
    country: 'Grecia', emoji: '🇬🇷',
    regions: ['Ática', 'Creta', 'Islas del Egeo', 'Macedonia Central', 'Peloponeso', 'Tesalia'],
  },
];

const LATAM_COUNTRIES: { country: string; emoji: string; regions: string[] }[] = [
  {
    country: 'Argentina', emoji: '🇦🇷',
    regions: ['Buenos Aires', 'Córdoba (AR)', 'Mendoza', 'Santa Fe', 'Entre Ríos', 'Tucumán', 'Misiones', 'Formosa', 'Chaco', 'Corrientes', 'Salta', 'Jujuy', 'Patagonia (AR)', 'Neuquén', 'Río Negro'],
  },
  {
    country: 'Chile', emoji: '🇨🇱',
    regions: ["Región Metropolitana (Santiago)", "Valparaíso (CL)", "O'Higgins", 'Maule', 'Biobío', 'Araucanía', 'Los Lagos (CL)', 'Patagonia (CL)', 'Atacama', 'Antofagasta', 'Arica y Parinacota'],
  },
  {
    country: 'Uruguay', emoji: '🇺🇾',
    regions: ['Montevideo', 'Canelones', 'Interior (Uruguay)'],
  },
  {
    country: 'México', emoji: '🇲🇽',
    regions: ['Ciudad de México'],
  },
  {
    country: 'Colombia', emoji: '🇨🇴',
    regions: ['Bogotá'],
  },
  {
    country: 'Perú', emoji: '🇵🇪',
    regions: ['Lima'],
  },
  {
    country: 'Brasil', emoji: '🇧🇷',
    regions: ['São Paulo'],
  },
];

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
const TOTAL_STEPS: Step[] = [0, 1, 2, 3, 4, 5, 6, 7];

export default function OnboardingScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { complete } = useOnboarding('huerto');
  const gardens = useCollection<Garden>('gardens');
  const { save: saveProfile } = useUserProfile();

  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(0);
  const [skippedProfile, setSkippedProfile] = useState(false);

  // Profile state (GrowIt-inspired)
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [growingMethods, setGrowingMethods] = useState<GrowingMethod[]>([]);
  const [sunlight, setSunlight] = useState<SunlightLevel | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);

  // Garden state
  const [province, setProvince] = useState('');
  const [provinceSearch, setProvinceSearch] = useState('');
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [gardenName, setGardenName] = useState('');
  const [gardenType, setGardenType] = useState<GardenType>('huerto');
  const [hemisphere, setHemisphere] = useState<Hemisphere>('norte');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const climateZone = province ? PROVINCE_ZONES[province] : null;
  const zoneConfig = climateZone ? CLIMATE_ZONE_CONFIG[climateZone] : null;

  const provincePool = selectedCountry
    ? (hemisphere === 'norte'
        ? (NORTE_COUNTRIES.find((c) => c.country === selectedCountry)?.regions ?? [])
        : (LATAM_COUNTRIES.find((c) => c.country === selectedCountry)?.regions ?? []))
    : [];

  const filteredProvinces = provincePool.filter((p) =>
    p.toLowerCase().includes(provinceSearch.toLowerCase())
  );

  const firstCropPicks = useMemo(() => {
    if (!climateZone) return [];
    const month = new Date().getMonth() + 1;
    const { now } = getSowingNow(climateZone, month, sunlight ?? undefined);
    const DIFF: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
    if (experience === 'beginner') {
      const easy = now.filter((c) => CROP_DIFFICULTY[c.id] === 'easy');
      const medium = now.filter((c) => CROP_DIFFICULTY[c.id] === 'medium');
      const pool = easy.length >= 3 ? easy : [...easy, ...medium];
      return pool.sort((a, b) => {
        const da = CROP_DIFFICULTY[a.id] === 'easy' ? 0 : 1;
        const db = CROP_DIFFICULTY[b.id] === 'easy' ? 0 : 1;
        return da !== db ? da - db : a.daysToHarvest[0] - b.daysToHarvest[0];
      }).slice(0, 3);
    }
    return [...now]
      .sort((a, b) => {
        const da = DIFF[CROP_DIFFICULTY[a.id] ?? 'medium'];
        const db = DIFF[CROP_DIFFICULTY[b.id] ?? 'medium'];
        return da !== db ? da - db : a.daysToHarvest[0] - b.daysToHarvest[0];
      })
      .slice(0, 3);
  }, [climateZone, sunlight, experience]);

  const stepAnim = useRef({
    opacity: new Animated.Value(1),
    translateX: new Animated.Value(0),
  }).current;

  function goTo(nextStep: Step) {
    const outX = nextStep > step ? -28 : 28;
    const inX = nextStep > step ? 28 : -28;
    Animated.parallel([
      Animated.timing(stepAnim.opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(stepAnim.translateX, { toValue: outX, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      stepAnim.translateX.setValue(inX);
      Animated.parallel([
        Animated.timing(stepAnim.opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(stepAnim.translateX, { toValue: 0, useNativeDriver: true, tension: 70, friction: 10 }),
      ]).start();
    });
  }

  const cardAnims = useRef(
    [0, 1, 2].map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  useEffect(() => {
    if (step !== 7) return;
    cardAnims.forEach((anim) => {
      anim.opacity.setValue(0);
      anim.translateY.setValue(20);
    });
    Animated.stagger(
      90,
      cardAnims.map((anim) =>
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.spring(anim.translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        ])
      )
    ).start();
  }, [step]);

  function toggleSpace(s: SpaceType) {
    setSpaceTypes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }
  function toggleMethod(m: GrowingMethod) {
    setGrowingMethods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  async function detectLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const nearest = getNearestProvince(pos.coords.latitude, pos.coords.longitude);
      if (nearest) {
        setHemisphere('norte');
        setProvince(nearest);
        setSelectedCountry('España');
      }
    } catch {
      // silent — user can still pick manually
    } finally {
      setLocating(false);
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(await persistPickedImage(result.assets[0].uri));
  }

  async function handleCreate() {
    if (!gardenName.trim() || !province || !climateZone) return;
    if (gardens.items.length > 0) {
      if (sunlight && experience) {
        await saveProfile({ spaceTypes, growingMethods, sunlight, experience });
      }
      await complete();
      router.replace('/(tabs)');
      return;
    }
    setSaving(true);
    try {
      await gardens.create({
        name: gardenName.trim(),
        climateZone,
        province,
        gardenType,
        hemisphere,
        ...(photoUri ? { photoUri } : {}),
      });
      if (sunlight && experience) {
        await saveProfile({
          spaceTypes,
          growingMethods,
          sunlight,
          experience,
        });
      }
      await complete();
      track(EVENTS.onboardingCompleted, { experience, gardenType });
      track(EVENTS.firstCropSuggested, { count: firstCropPicks.length, cropIds: firstCropPicks.map((c) => c.id).join(',') });
      goTo(7);
    } catch (e) {
      console.error('[onboarding] handleCreate failed:', e);
    } finally {
      setSaving(false);
    }
  }

  const s = styles(colors, spacing, fontSize, fontWeight, radii);

  const SPACE_KEYS: SpaceType[] = ['backyard', 'balcony', 'indoor', 'farm', 'other'];
  const METHOD_KEYS: GrowingMethod[] = ['ground', 'raisedBeds', 'indoorContainers', 'outdoorContainers'];
  const SUN_KEYS: SunlightLevel[] = ['full', 'partial', 'shade'];
  const EXP_KEYS: ExperienceLevel[] = ['beginner', 'some', 'expert'];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Step dots */}
      {step > 0 && step < 7 && (
        <View style={s.dots}>
          {TOTAL_STEPS.slice(1, 7).map((i) => (
            <View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor: i <= step ? colors.primary : colors.border,
                  width: i === step ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
      )}

      <Animated.View style={{ flex: 1, opacity: stepAnim.opacity, transform: [{ translateX: stepAnim.translateX }] }}>

      {/* ── STEP 0: Bienvenida ── */}
      {step === 0 && (
        <View style={[s.stepContainer, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing['2xl'] ?? spacing.xl * 1.5 }}>
            {/* Semillita */}
            <Mascot pose="wave" size={96} />
            {/* Big B&W headline */}
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontSize: 52, fontWeight: '800', color: colors.text, letterSpacing: -2, lineHeight: 56 }}>
                {'Tu huerto\ndigital.'}
              </Text>
              <Text style={{ fontSize: fontSize.lg, color: colors.textSecondary, lineHeight: 26 }}>
                {t('onboarding.step1Desc')}
              </Text>
            </View>

            {/* Minimal feature list */}
            <View style={{ gap: spacing.lg }}>
              {[
                { emoji: '🌙', key: 'onboarding.feature1Title' },
                { emoji: '🌤️', key: 'onboarding.feature2Title' },
                { emoji: '🤝', key: 'onboarding.feature3Title' },
              ].map((f) => (
                <View key={f.emoji} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Text style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{f.emoji}</Text>
                  <Text style={{ fontSize: fontSize.md, color: colors.text, fontWeight: '500', flex: 1 }}>{t(f.key)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}>
            <Pressable
              onPress={() => goTo(1)}
              style={{ backgroundColor: colors.text, borderRadius: radii.full, paddingVertical: 18, alignItems: 'center' }}
            >
              <Text style={{ color: colors.background, fontSize: fontSize.lg, fontWeight: '700' }}>
                {t('onboarding.start')}
              </Text>
            </Pressable>
            <Pressable onPress={() => { setSkippedProfile(true); goTo(5); }} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('onboarding.skipProfile')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── STEP 1: Sunlight (single) ── */}
      {step === 1 && (
        <View style={s.stepContainer}>
          <View style={s.stepContent}>
            <CoachHeader title={t('onboarding.sunTitle')} subtitle={t('onboarding.sunDesc')} pose="idle" />

            <View style={{ gap: spacing.md }}>
              {SUN_KEYS.map((k) => {
                const active = sunlight === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setSunlight(k)}
                    style={[
                      s.rowOption,
                      {
                        backgroundColor: active ? colors.text : colors.surface,
                        borderColor: active ? colors.text : colors.border,
                      },
                    ]}
                  >
                    <Text style={s.optionEmoji}>{SUNLIGHT_CONFIG[k].emoji}</Text>
                    <Text style={[s.rowOptionLabel, { color: active ? colors.background : colors.text }]}>
                      {t('onboarding.sun' + k.charAt(0).toUpperCase() + k.slice(1))}
                    </Text>
                    {active && <Text style={{ color: colors.background, fontSize: 20 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.stepActions}>
            <Pressable onPress={() => goTo(0)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Pressable onPress={() => goTo(2)} style={s.skipButton}>
              <Text style={{ color: colors.textDisabled, fontSize: fontSize.md }}>{t('onboarding.skip')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => goTo(2)}
              disabled={!sunlight}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </View>
      )}

      {/* ── STEP 2: Experience (single) ── */}
      {step === 2 && (
        <View style={s.stepContainer}>
          <View style={s.stepContent}>
            <CoachHeader title={t('onboarding.expTitle')} subtitle={t('onboarding.expDesc')} pose="idle" />

            <View style={{ gap: spacing.md }}>
              {EXP_KEYS.map((k) => {
                const active = experience === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setExperience(k)}
                    style={[
                      s.rowOption,
                      {
                        backgroundColor: active ? colors.text : colors.surface,
                        borderColor: active ? colors.text : colors.border,
                      },
                    ]}
                  >
                    <Text style={s.optionEmoji}>{EXPERIENCE_CONFIG[k].emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowOptionLabel, { color: active ? colors.background : colors.text }]}>
                        {t('onboarding.exp' + k.charAt(0).toUpperCase() + k.slice(1))}
                      </Text>
                      {k === 'beginner' && active && (
                        <Text style={[s.expNote, { color: active ? colors.background + 'cc' : colors.textSecondary }]}>
                          {t('onboarding.expBeginnerNote')}
                        </Text>
                      )}
                    </View>
                    {active && <Text style={{ color: colors.background, fontSize: 20 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.stepActions}>
            <Pressable onPress={() => goTo(1)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Pressable onPress={() => goTo(3)} style={s.skipButton}>
              <Text style={{ color: colors.textDisabled, fontSize: fontSize.md }}>{t('onboarding.skip')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => goTo(3)}
              disabled={!experience}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </View>
      )}

      {/* ── STEP 3: Space type (multi) ── */}
      {step === 3 && (
        <View style={s.stepContainer}>
          <ScrollView contentContainerStyle={s.stepContent} keyboardShouldPersistTaps="handled">
            <CoachHeader title={t('onboarding.spaceTitle')} subtitle={t('onboarding.spaceDesc')} pose="idle" />
            <Text style={[s.multiHint, { color: colors.textDisabled }]}>{t('onboarding.spaceMultiHint')}</Text>

            <View style={s.optionGrid}>
              {SPACE_KEYS.map((k) => {
                const active = spaceTypes.includes(k);
                return (
                  <Pressable
                    key={k}
                    onPress={() => toggleSpace(k)}
                    style={[
                      s.optionCard,
                      {
                        backgroundColor: active ? colors.text : colors.surface,
                        borderColor: active ? colors.text : colors.border,
                      },
                    ]}
                  >
                    <Text style={s.optionEmoji}>{SPACE_TYPE_CONFIG[k].emoji}</Text>
                    <Text style={[s.optionLabel, { color: active ? colors.background : colors.text }]}>
                      {t('onboarding.space' + k.charAt(0).toUpperCase() + k.slice(1))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.stepActions}>
            <Pressable onPress={() => goTo(2)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Pressable onPress={() => goTo(4)} style={s.skipButton}>
              <Text style={{ color: colors.textDisabled, fontSize: fontSize.md }}>{t('onboarding.skip')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => goTo(4)}
              disabled={spaceTypes.length === 0}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </View>
      )}

      {/* ── STEP 4: Growing method (multi) ── */}
      {step === 4 && (
        <View style={s.stepContainer}>
          <ScrollView contentContainerStyle={s.stepContent} keyboardShouldPersistTaps="handled">
            <CoachHeader title={t('onboarding.methodTitle')} subtitle={t('onboarding.methodDesc')} pose="idle" />
            <Text style={[s.multiHint, { color: colors.textDisabled }]}>{t('onboarding.spaceMultiHint')}</Text>

            <View style={s.optionGrid}>
              {METHOD_KEYS.map((k) => {
                const active = growingMethods.includes(k);
                return (
                  <Pressable
                    key={k}
                    onPress={() => toggleMethod(k)}
                    style={[
                      s.optionCard,
                      {
                        backgroundColor: active ? colors.text : colors.surface,
                        borderColor: active ? colors.text : colors.border,
                      },
                    ]}
                  >
                    <Text style={s.optionEmoji}>{GROWING_METHOD_CONFIG[k].emoji}</Text>
                    <Text style={[s.optionLabel, { color: active ? colors.background : colors.text }]}>
                      {t('onboarding.method' + k.charAt(0).toUpperCase() + k.slice(1))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.stepActions}>
            <Pressable onPress={() => goTo(3)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Pressable onPress={() => goTo(5)} style={s.skipButton}>
              <Text style={{ color: colors.textDisabled, fontSize: fontSize.md }}>{t('onboarding.skip')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => goTo(5)}
              disabled={growingMethods.length === 0}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </View>
      )}

      {/* ── STEP 5: Provincia ── */}
      {step === 5 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.stepContainer}
        >
          <View style={s.stepContent}>
            <CoachHeader title={t('onboarding.step2Title')} subtitle={t('onboarding.step2Desc')} pose="idle" />

            <Pressable
              onPress={locating ? undefined : detectLocation}
              style={[
                s.detectBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: locating ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="locate-outline" size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: fontSize.sm, marginLeft: 6, fontWeight: fontWeight.medium }}>
                {locating ? t('onboarding.detecting') : t('onboarding.detectLocation')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowProvincePicker(true)}
              style={[
                s.provinceButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: province ? colors.text : colors.border,
                },
              ]}
            >
              <Text style={{ color: province ? colors.text : colors.textDisabled, fontSize: fontSize.md }}>
                {province
                  ? `${selectedCountry} › ${province}`
                  : selectedCountry
                    ? `${selectedCountry} › ...`
                    : t('onboarding.selectProvince')}
              </Text>
              <Text style={{ fontSize: 18 }}>›</Text>
            </Pressable>

            {climateZone && zoneConfig && (
              <Card style={s.zoneCard} padded>
                <Text style={{ fontSize: 28 }}>{zoneConfig.emoji}</Text>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[s.zoneTitle, { color: colors.text }]}>
                    {t('onboarding.zone', { label: zoneConfig.label })}
                  </Text>
                  <Text style={[s.zoneDesc, { color: colors.textSecondary }]}>
                    {t('zoneDescription.' + climateZone)}
                  </Text>
                </View>
              </Card>
            )}
          </View>

          <View style={s.stepActions}>
            <Pressable onPress={() => goTo(skippedProfile ? 0 : 4)} style={s.backButton}>{/* step 4 = method in new order */}
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => goTo(6)}
              disabled={!province}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── STEP 6: Crear huerto ── */}
      {step === 6 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.stepContainer}
        >
          <View style={s.stepContent}>
            <CoachHeader title={t('onboarding.step3Title')} subtitle={t('onboarding.step3Desc')} pose="idle" />

            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('onboarding.gardenTypeLabel')}</Text>
            <View style={s.gardenTypeRow}>
              {(Object.entries(GARDEN_TYPE_CONFIG) as [GardenType, typeof GARDEN_TYPE_CONFIG[GardenType]][]).map(([key, cfg]) => {
                const active = gardenType === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setGardenType(key)}
                    style={[
                      s.gardenTypeBtn,
                      {
                        backgroundColor: active ? colors.primary + '22' : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>{cfg.emoji}</Text>
                    <Text style={[s.gardenTypeName, { color: active ? colors.primary : colors.textSecondary }]}>
                      {t('gardenType.' + key)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={pickPhoto} style={s.photoPicker}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={s.photoImage} />
              ) : (
                <View style={[s.photoPlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 32 }}>📷</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>
                    {t('plantNew.addPhoto')}
                  </Text>
                </View>
              )}
            </Pressable>

            <TextInput
              value={gardenName}
              onChangeText={setGardenName}
              placeholder={t('onboarding.gardenNamePlaceholder')}
              placeholderTextColor={colors.textDisabled}
              style={[
                s.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: gardenName ? colors.primary : colors.border,
                  color: colors.text,
                },
              ]}
              maxLength={40}
              autoFocus
              returnKeyType="done"
            />
          </View>

          <View style={s.stepActions}>
            <Pressable onPress={() => goTo(5)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.create')}
              onPress={handleCreate}
              disabled={!gardenName.trim() || !climateZone}
              loading={saving}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── STEP 7: Éxito ── */}
      {step === 7 && (
        <View style={[s.stepContainer, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <CoachBubble
              text={t('onboarding.coachCelebrate', { name: gardenName.trim() || t('home.defaultGardenName') })}
              pose="celebrate"
            />
            {firstCropPicks.length > 0 && (
              <View style={{ marginTop: spacing.xl }}>
                <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md, textAlign: 'center' }}>
                  {t('onboarding.firstCropTitle')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.xl }}
                >
                  {firstCropPicks.map((crop, index) => {
                    const name = t(`crops.${crop.id}.name`, { defaultValue: crop.name });
                    const img = CROP_IMAGES[crop.id];
                    const diff = CROP_DIFFICULTY[crop.id] ?? 'medium';
                    const anim = cardAnims[index];
                    return (
                      <Animated.View
                        key={crop.id}
                        style={{ opacity: anim.opacity, transform: [{ translateY: anim.translateY }] }}
                      >
                        <ScalePress
                          onPress={() => {
                            track(EVENTS.firstCropPicked, { cropId: crop.id });
                            router.replace({ pathname: '/plant/new', params: { cropId: crop.id, fromOnboarding: '1' } } as any);
                          }}
                          style={{ width: 100, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, gap: 4, alignItems: 'center' }}
                        >
                          <View style={{ width: 72, height: 72, borderRadius: radii.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {img ? (
                              <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                              <Text style={{ fontSize: 36 }}>{crop.emoji}</Text>
                            )}
                            {diff === 'easy' && (
                              <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.full }}>
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{t('sowNow.easy')}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center' }} numberOfLines={1} ellipsizeMode="tail">
                            {name}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                            {t('onboarding.readyIn', { days: crop.daysToHarvest[0] })}
                          </Text>
                        </ScalePress>
                      </Animated.View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
          <View style={{ gap: spacing.md }}>
            {firstCropPicks.length === 0 && (
              <Button
                title={t('onboarding.addFirstPlant')}
                onPress={() => router.replace({ pathname: '/plant/new', params: { fromOnboarding: '1' } } as any)}
                size="lg"
              />
            )}
            <Button
              title={t('onboarding.skipToGarden')}
              variant="secondary"
              onPress={async () => {
                await AsyncStorage.setItem('@huerto/just_from_onboarding', '1');
                router.replace('/(tabs)');
              }}
              size="lg"
            />
          </View>
        </View>
      )}

      </Animated.View>

      {/* ── Province picker modal ── */}
      <Modal visible={showProvincePicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={s.modalHeader}>
            {selectedCountry ? (
              <Pressable onPress={() => { setSelectedCountry(null); setProvinceSearch(''); }}>
                <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>← {selectedCountry}</Text>
              </Pressable>
            ) : (
              <Text style={[s.modalTitle, { color: colors.text }]}>{t('onboarding.selectCountry')}</Text>
            )}
            <Pressable onPress={() => { setShowProvincePicker(false); setProvinceSearch(''); }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                {t('onboarding.closeSearch')}
              </Text>
            </Pressable>
          </View>

          {!selectedCountry ? (
            <FlatList
              data={[...NORTE_COUNTRIES, ...LATAM_COUNTRIES]}
              keyExtractor={(item) => item.country}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    const isNorte = NORTE_COUNTRIES.some((c) => c.country === item.country);
                    setHemisphere(isNorte ? 'norte' : 'sur');
                    setSelectedCountry(item.country);
                    setProvince('');
                  }}
                  style={[s.provinceRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Text style={{ fontSize: 28, marginRight: spacing.md }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
                      {item.country}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                      {item.regions.length} {t('onboarding.regions')}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textDisabled, fontSize: 20 }}>›</Text>
                </Pressable>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          ) : (
            <>
              <View style={[s.searchContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
                <TextInput
                  value={provinceSearch}
                  onChangeText={setProvinceSearch}
                  placeholder={t('onboarding.provinceSearch')}
                  placeholderTextColor={colors.textDisabled}
                  style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}
                  autoFocus
                />
              </View>

              <FlatList
                data={filteredProvinces}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const zone = PROVINCE_ZONES[item];
                  const zc = CLIMATE_ZONE_CONFIG[zone];
                  const isSelected = item === province;
                  return (
                    <Pressable
                      onPress={() => {
                        setProvince(item);
                        setShowProvincePicker(false);
                        setProvinceSearch('');
                      }}
                      style={[
                        s.provinceRow,
                        {
                          backgroundColor: isSelected ? colors.surfaceAlt : colors.surface,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
                          {item}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                          {zc.emoji} {zc.label}
                        </Text>
                      </View>
                      {isSelected && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
                    </Pressable>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 40 }}
              />
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      paddingTop: spacing.lg,
    },
    dot: { height: 8, borderRadius: 4 },
    stepContainer: { flex: 1, padding: spacing.xl, justifyContent: 'space-between' },
    stepContent: { flexGrow: 1, justifyContent: 'center' },
    stepActions: { flexDirection: 'row', alignItems: 'center' },
    heroEmoji: { fontSize: 80, marginBottom: spacing.xl },
    heroTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, textAlign: 'center', marginBottom: spacing.md },
    heroDesc: { fontSize: fontSize.lg, textAlign: 'center', lineHeight: 26 },
    stepTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    stepSubtitle: { fontSize: fontSize.md, lineHeight: 22, marginBottom: spacing.lg },
    multiHint: { fontSize: fontSize.xs, marginBottom: spacing.lg, fontStyle: 'italic' },
    optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
    optionCard: {
      width: '47%',
      aspectRatio: 1.1,
      borderWidth: 1.5,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.md,
    },
    optionEmoji: { fontSize: 36 },
    optionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center' },
    rowOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderWidth: 1.5,
      borderRadius: radii.lg,
    },
    rowOptionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, flex: 1 },
    expNote: { fontSize: fontSize.xs, marginTop: 4, lineHeight: 16 },
    skipButton: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
    detectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.full,
      borderWidth: 1,
      alignSelf: 'flex-start',
      marginBottom: spacing.md,
    },
    provinceButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 1.5,
      marginBottom: spacing.lg,
    },
    zoneCard: { flexDirection: 'row', alignItems: 'center' },
    zoneTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    zoneDesc: { fontSize: fontSize.sm, marginTop: 2 },
    backButton: { paddingVertical: spacing.md, paddingRight: spacing.md },
    inputLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
    gardenTypeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    gardenTypeBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 4,
    },
    gardenTypeName: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
    photoPicker: { alignItems: 'center', marginBottom: spacing.xl },
    photoPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoImage: { width: 100, height: 100, borderRadius: 50 },
    input: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      padding: spacing.lg,
      fontSize: fontSize.md,
    },
    featureList: { gap: spacing.md, marginTop: spacing['2xl'] },
    featureRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radii.lg, borderWidth: 1 },
    featureEmoji: { fontSize: 28 },
    featureTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    featureDesc: { fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    provinceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
  });
