import { useOnboarding } from '@portfolio/shared';
import { Button, Card, useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { usePickPhoto } from '../src/hooks/usePickPhoto';
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
import { getTop2Recommendations } from '../src/utils/firstCropRecommendation';
import type { Garden } from '../src/models';
import type { Plant } from '../src/models/plant';
import { GARDEN_TYPE_CONFIG, type GardenType } from '../src/models/garden';
import {
  SUNLIGHT_CONFIG,
  EXPERIENCE_CONFIG,
  type SunlightLevel,
  type ExperienceLevel,
} from '../src/models/user-profile';
import { useUserProfile } from '../src/hooks/useUserProfile';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { requestPermissions } from '@portfolio/notifications';
import { track, EVENTS } from '../src/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoachHeader } from '../src/components/CoachHeader';
import { ScalePress } from '../src/components/ScalePress';
import { Mascot } from '../src/components/Mascot';
import { todayStr } from '../src/utils/dateStr';

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

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL_STEPS: Step[] = [0, 1, 2, 3, 4, 5, 6];

export default function OnboardingScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { complete } = useOnboarding('huerto');
  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const { save: saveProfile } = useUserProfile();
  const { switchGarden } = useActiveGarden();

  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(0);

  // Profile state
  const [sunlight, setSunlight] = useState<SunlightLevel | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);

  // Province / location state
  const [province, setProvince] = useState('');
  const [provinceSearch, setProvinceSearch] = useState('');
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // Garden creation state
  const [gardenName, setGardenName] = useState('');
  const [gardenType, setGardenType] = useState<GardenType>('huerto');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const { pickFromGallery } = usePickPhoto({ aspect: [1, 1] });
  const [saving, setSaving] = useState(false);
  const [showCreating, setShowCreating] = useState(false);
  const [creatingMsgIdx, setCreatingMsgIdx] = useState(0);
  const creatingOpacity = useRef(new Animated.Value(1)).current;

  // Garden ID from creation (used reliably when adding first plant)
  const [createdGardenId, setCreatedGardenId] = useState<string | null>(null);
  const [plantedFirstCrop, setPlantedFirstCrop] = useState(false);

  // Ready state
  const [remindersState, setRemindersState] = useState<'idle' | 'granted'>('idle');

  const CREATING_MESSAGES = [
    { emoji: '🌱', key: 'onboarding.creating.preparing' },
    { emoji: '☀️', key: 'onboarding.creating.climate' },
    { emoji: '🗓️', key: 'onboarding.creating.calendar' },
    { emoji: '🎉', key: 'onboarding.creating.ready' },
  ];

  useEffect(() => {
    if (!showCreating) return;
    setCreatingMsgIdx(0);
    creatingOpacity.setValue(1);
    let idx = 0;
    const timer = setInterval(() => {
      Animated.timing(creatingOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        idx = (idx + 1) % CREATING_MESSAGES.length;
        setCreatingMsgIdx(idx);
        Animated.timing(creatingOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [showCreating]);

  // Hold the "ready" message briefly before transitioning out
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creatingTransitioned = useRef(false);
  useEffect(() => {
    if (showCreating && creatingMsgIdx === CREATING_MESSAGES.length - 1 && !creatingTransitioned.current) {
      creatingTransitioned.current = true;
      readyTimeoutRef.current = setTimeout(() => {
        if (showCreating) {
          setShowCreating(false);
          goTo(5);
        }
      }, 1500);
    }
    if (!showCreating) {
      creatingTransitioned.current = false;
    }
    return () => { if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current); };
  }, [showCreating, creatingMsgIdx]);

  // Analytics: track step views
  useEffect(() => {
    if (step > 0) {
      track(EVENTS.onboardingStepViewed, { step });
    }
  }, [step]);

  const climateZone = province ? PROVINCE_ZONES[province] : null;
  const zoneConfig = climateZone ? CLIMATE_ZONE_CONFIG[climateZone] : null;

  const provincePool = selectedCountry
    ? (NORTE_COUNTRIES.find((c) => c.country === selectedCountry)?.regions
      ?? LATAM_COUNTRIES.find((c) => c.country === selectedCountry)?.regions
      ?? [])
    : [];

  const filteredProvinces = provincePool.filter((p) =>
    p.toLowerCase().includes(provinceSearch.toLowerCase())
  );

  const firstCropPicks = useMemo(() => {
    if (!climateZone) return [];
    const month = new Date().getMonth() + 1;
    return getTop2Recommendations({
      climateZone,
      month,
      sunlight: sunlight ?? undefined,
      experience: experience ?? undefined,
    });
  }, [climateZone, sunlight, experience]);

  // Analytics: track first crop suggestions shown (once)
  useEffect(() => {
    if (step === 5 && firstCropPicks.length > 0 && !firstCropSuggestedRef.current) {
      firstCropSuggestedRef.current = true;
      track(EVENTS.firstCropSuggested, { count: firstCropPicks.length, cropIds: firstCropPicks.map((c) => c.id).join(',') });
    }
  }, [step, firstCropPicks]);

  const stepAnim = useRef({
    opacity: new Animated.Value(1),
    translateX: new Animated.Value(0),
  }).current;

  function goTo(nextStep: Step) {
    if (nextStep === step) return;
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

  async function detectLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const nearest = getNearestProvince(pos.coords.latitude, pos.coords.longitude);
      if (nearest) {
        setProvince(nearest);
        setSelectedCountry('España');
        track(EVENTS.provinceDetected, { province: nearest, method: 'auto' });
      }
    } catch {
      // silent — user can still pick manually
    } finally {
      setLocating(false);
    }
  }

  async function pickPhoto() {
    const result = await pickFromGallery();
    if (result.kind === 'success') setPhotoUri(result.uri);
  }

  const firstCropSuggestedRef = useRef(false);

  async function handleCreate() {
    if (!gardenName.trim() || !province || !climateZone) return;
    setShowCreating(true);
    setSaving(true);
    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 4000));
    try {
      await Promise.all([
        (async () => {
          const isNorte = NORTE_COUNTRIES.some((c) => c.country === selectedCountry);
          const newGarden = await gardens.create({
            name: gardenName.trim(),
            climateZone,
            province,
            gardenType,
            hemisphere: isNorte ? 'norte' : 'sur',
            ...(photoUri ? { photoUri } : {}),
          });
          await switchGarden(newGarden.id);
          setCreatedGardenId(newGarden.id);
          if (sunlight && experience) {
            await saveProfile({ spaceTypes: [], growingMethods: [], sunlight, experience });
          }
          track(EVENTS.gardenCreated, { gardenType });
        })(),
        minDelay,
      ]);
      // Transition handled by readyTimeoutRef when "ready" message appears
    } catch (e) {
      console.error('[onboarding] handleCreate failed:', e);
      setShowCreating(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPlant(cropId: string) {
    if (!createdGardenId) return;
    const cropName = t(`crops.${cropId}.name`, { defaultValue: cropId });
    track(EVENTS.firstCropPicked, { cropId });
    try {
      await plants.create({
        gardenId: createdGardenId,
        cropId,
        name: cropName,
        status: 'seedling',
        sowingDate: todayStr(),
      });
      setPlantedFirstCrop(true);
      goTo(6);
    } catch (e) {
      console.error('[onboarding] handleAddPlant failed:', e);
    }
  }

  const s = styles(colors, spacing, fontSize, fontWeight, radii);

  const SUN_KEYS: SunlightLevel[] = ['full', 'partial', 'shade'];
  const EXP_KEYS: ExperienceLevel[] = ['beginner', 'some'];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Step dots + text */}
      {step > 0 && step < 6 && (
        <View style={s.dots}>
          <Text style={[s.stepLabel, { color: colors.textSecondary }]}>
            {t('onboarding.stepOf', { current: step, total: 6 })}
          </Text>
          <View style={s.dotsRow}>
            {TOTAL_STEPS.slice(1, 6).map((i) => (
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
        </View>
      )}

      <Animated.View style={{ flex: 1, opacity: stepAnim.opacity, transform: [{ translateX: stepAnim.translateX }] }}>

      {/* ── STEP 0: Welcome ── */}
      {step === 0 && (
        <View style={[s.stepContainer, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.xl }}>
            <Mascot pose="wave" size={80} />
            <View style={{ gap: spacing.md }}>
              <Text style={{ fontSize: fontSize['3xl'] ?? 40, fontWeight: '800', color: colors.text, letterSpacing: -1, lineHeight: 44 }}>
                {t('onboarding.welcomeTitle')}
              </Text>
              <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 }}>
                {t('onboarding.welcomeSubtitle')}
              </Text>
            </View>
          </View>

          <View style={{ gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
            <Pressable
              onPress={() => goTo(1)}
              style={{ backgroundColor: colors.text, borderRadius: radii.full, paddingVertical: 18, alignItems: 'center' }}
            >
              <Text style={{ color: colors.background, fontSize: fontSize.lg, fontWeight: '700' }}>
                {t('onboarding.start')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── STEP 1: Sunlight ── */}
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
                    onPress={() => {
                      setSunlight(k);
                      track(EVENTS.sunlightSelected, { level: k });
                    }}
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
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={s.stepActions}>
            <Pressable onPress={() => goTo(0)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
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

      {/* ── STEP 2: Experience ── */}
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
                    onPress={() => {
                      setExperience(k);
                      track(EVENTS.experienceSelected, { level: k });
                    }}
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
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={s.stepActions}>
            <Pressable onPress={() => goTo(1)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
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

      {/* ── STEP 3: Province / Location ── */}
      {step === 3 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.stepContainer}
        >
          <View style={s.stepContent}>
            <CoachHeader title={t('onboarding.locationTitle')} subtitle={t('onboarding.locationDesc')} pose="idle" />

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
                {province ? province : t('onboarding.selectProvince')}
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
                    {t('onboarding.zoneDesc')}
                  </Text>
                </View>
              </Card>
            )}
          </View>

          <View style={s.stepActions}>
            <Pressable onPress={() => goTo(2)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => goTo(4)}
              disabled={!province}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── STEP 4: Create garden ── */}
      {step === 4 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.stepContainer}
        >
          <View style={s.stepContent}>
            <CoachHeader title={t('onboarding.gardenTitle')} subtitle={t('onboarding.gardenDesc')} pose="idle" />

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
            <Pressable onPress={() => goTo(3)} style={s.backButton}>
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

      {/* ── STEP 5: First crop recommendation ── */}
      {step === 5 && (
        <View style={[s.stepContainer, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
              <Mascot pose="celebrate" size={80} />
              <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: spacing.md, textAlign: 'center' }}>
                {t('onboarding.firstCropTitle')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.sm, textAlign: 'center' }}>
                {t('onboarding.firstCropDesc')}
              </Text>
            </View>

            {firstCropPicks.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                {firstCropPicks.map((crop) => {
                  const name = t(`crops.${crop.id}.name`, { defaultValue: crop.name });
                  const img = CROP_IMAGES[crop.id];
                  const diff = CROP_DIFFICULTY[crop.id] ?? 'medium';
                  const reasons: string[] = [];
                  if (zoneConfig) reasons.push(t('onboarding.reasonClimate'));
                  if (sunlight) reasons.push(t('onboarding.reasonSun'));
                  if (diff === 'easy') reasons.push(t('onboarding.reasonEasy'));
                  return (
                    <View
                      key={crop.id}
                      style={{ backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary + '33', padding: spacing.lg }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <View style={{ width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {img ? (
                            <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          ) : (
                            <Text style={{ fontSize: 32 }}>{crop.emoji}</Text>
                          )}
                          {diff === 'easy' && (
                            <View style={{ position: 'absolute', top: 2, left: 2, backgroundColor: colors.success, paddingHorizontal: 4, paddingVertical: 1, borderRadius: radii.full }}>
                              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{t('sowNow.easy')}</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>{name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                            {t('onboarding.readyIn', { days: crop.daysToHarvest[0] })}
                          </Text>
                        </View>
                      </View>
                      {reasons.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                          {reasons.map((r) => (
                            <View key={r} style={{ backgroundColor: colors.primary + '15', borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 3 }}>
                              <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.medium }}>{r}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <ScalePress
                        onPress={() => handleAddPlant(crop.id)}
                        style={{ marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radii.full, paddingVertical: 14, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontSize: fontSize.md, fontWeight: '700' }}>
                          {t('onboarding.plantNow', { name })}
                        </Text>
                      </ScalePress>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Card padded style={{ alignItems: 'center', padding: spacing.xl }}>
                <Text style={{ fontSize: 36, marginBottom: spacing.md }}>🌱</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.md, textAlign: 'center' }}>
                  {t('onboarding.addFirstPlant')}
                </Text>
              </Card>
            )}
          </View>

          <View style={{ gap: spacing.sm, paddingTop: spacing.lg }}>
            {firstCropPicks.length > 0 && (
              <Pressable
                onPress={() => {
                  router.push('/catalog' as any);
                }}
                style={{ alignItems: 'center', paddingVertical: spacing.md }}
              >
                <Text style={{ color: colors.primary, fontSize: fontSize.md }}>{t('onboarding.viewCatalog')}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => goTo(6)} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('onboarding.skipToGarden')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── STEP 6: Ready ── */}
      {step === 6 && (
        <View style={[s.stepContainer, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl }}>
            <Mascot pose="celebrate" size={100} />
            <View style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
                {t('onboarding.readyTitle')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center' }}>
                {t('onboarding.readyDesc', { name: gardenName.trim() || t('home.defaultGardenName') })}
              </Text>
            </View>
            <View style={{ gap: spacing.xs, alignItems: 'center' }}>
              {province ? (
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  {t('onboarding.readySummaryLocation', { province })}
                </Text>
              ) : null}
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                {t('onboarding.readySummaryType', { emoji: GARDEN_TYPE_CONFIG[gardenType].emoji, type: t('gardenType.' + gardenType) })}
              </Text>
              {createdGardenId && (
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  {t('onboarding.readySummaryPlant', { name: t(`crops.${plants.items[0]?.cropId ?? 'tomate'}.name`, { defaultValue: plants.items[0]?.name ?? '...' }) })}
                </Text>
              )}
            </View>
          </View>
          <View style={{ gap: spacing.md }}>
            <Button
              title={t('onboarding.skipToGarden')}
              onPress={async () => {
                await complete();
                track(EVENTS.onboardingCompleted, { experience, gardenType, plantedFirstCrop });
                await AsyncStorage.setItem('@huerto/just_from_onboarding', '1');
                await AsyncStorage.setItem('@huerto/onboarding_completed_at', String(Date.now()));
                router.replace('/(tabs)');
              }}
              size="lg"
            />
            <Button
              title={remindersState === 'granted'
                ? t('onboarding.remindersActivated')
                : t('onboarding.enableReminders')}
              variant="secondary"
              disabled={remindersState === 'granted'}
              onPress={async () => {
                const granted = await requestPermissions();
                if (granted) {
                  track(EVENTS.notificationsEnabled, { screen: 'onboarding' });
                  setRemindersState('granted');
                }
              }}
              size="lg"
            />
          </View>
        </View>
      )}

      </Animated.View>

      {/* ── Creating overlay ── */}
      {showCreating && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: colors.background,
              zIndex: 99,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xl,
            },
          ]}
        >
          <Mascot pose="celebrate" size={110} />
          <Animated.View style={{ opacity: creatingOpacity, alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl }}>
            <Text style={{ fontSize: 52 }}>{CREATING_MESSAGES[creatingMsgIdx].emoji}</Text>
            <Text
              style={{
                fontSize: fontSize.xl,
                fontWeight: fontWeight.bold,
                color: colors.text,
                textAlign: 'center',
              }}
            >
              {t(CREATING_MESSAGES[creatingMsgIdx].key)}
            </Text>
          </Animated.View>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
            {gardenName.trim()}
          </Text>
        </View>
      )}

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
                        track(EVENTS.provinceSelected, { province: item, method: 'manual' });
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
      alignItems: 'center',
      gap: 4,
      paddingTop: spacing.lg,
    },
    stepLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    dot: { height: 8, borderRadius: 4 },
    stepContainer: { flex: 1, padding: spacing.xl, justifyContent: 'space-between' },
    stepContent: { flexGrow: 1, justifyContent: 'center' },
    stepActions: { flexDirection: 'row', alignItems: 'center' },

    optionEmoji: { fontSize: 36 },
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
