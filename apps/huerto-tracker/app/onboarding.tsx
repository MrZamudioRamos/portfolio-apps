import { useOnboarding } from '@portfolio/shared';
import { Button, Card, useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
import { CLIMATE_ZONE_CONFIG, PROVINCES, PROVINCE_ZONES } from '../src/data';
import { getNearestProvince } from '../src/utils/weather';
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

const SPAIN_PROVINCES = new Set([
  'A Coruña', 'Lugo', 'Pontevedra', 'Asturias', 'Cantabria', 'Vizcaya', 'Guipúzcoa',
  'Ourense', 'Álava', 'Navarra', 'La Rioja', 'Madrid', 'Toledo', 'Ciudad Real', 'Cuenca',
  'Guadalajara', 'Albacete', 'Ávila', 'Segovia', 'Soria', 'Burgos', 'Palencia',
  'Valladolid', 'Zamora', 'Salamanca', 'León', 'Zaragoza', 'Huesca', 'Teruel', 'Lleida',
  'Cáceres', 'Badajoz', 'Córdoba', 'Jaén', 'Barcelona', 'Tarragona', 'Girona',
  'Valencia', 'Alicante', 'Castellón', 'Murcia', 'Almería', 'Málaga', 'Granada',
  'Baleares', 'Sevilla', 'Cádiz', 'Huelva', 'Ceuta', 'Melilla', 'Las Palmas',
  'Santa Cruz de Tenerife',
]);

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

  const provincePool = hemisphere === 'norte'
    ? PROVINCES.filter((p) => SPAIN_PROVINCES.has(p))
    : selectedCountry
      ? (LATAM_COUNTRIES.find((c) => c.country === selectedCountry)?.regions ?? [])
      : [];

  const filteredProvinces = provincePool.filter((p) =>
    p.toLowerCase().includes(provinceSearch.toLowerCase())
  );

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
        setSelectedCountry(null);
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
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleCreate() {
    if (!gardenName.trim() || !province || !climateZone) return;
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
      setStep(7);
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

      {/* ── STEP 0: Bienvenida ── */}
      {step === 0 && (
        <View style={[s.stepContainer, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={s.heroEmoji}>🌱</Text>
            <Text style={[s.heroTitle, { color: colors.text }]}>{t('onboarding.step1Title')}</Text>
            <Text style={[s.heroDesc, { color: colors.textSecondary }]}>{t('onboarding.step1Desc')}</Text>

            <View style={s.featureList}>
              {[
                { emoji: '🌙', titleKey: 'onboarding.feature1Title', descKey: 'onboarding.feature1Desc' },
                { emoji: '🌤️', titleKey: 'onboarding.feature2Title', descKey: 'onboarding.feature2Desc' },
                { emoji: '🤝', titleKey: 'onboarding.feature3Title', descKey: 'onboarding.feature3Desc' },
              ].map((f) => (
                <View key={f.emoji} style={[s.featureRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={s.featureEmoji}>{f.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[s.featureTitle, { color: colors.text }]}>{t(f.titleKey)}</Text>
                    <Text style={[s.featureDesc, { color: colors.textSecondary }]}>{t(f.descKey)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <Button title={t('onboarding.start')} onPress={() => setStep(1)} size="lg" />
        </View>
      )}

      {/* ── STEP 1: Space type (multi) ── */}
      {step === 1 && (
        <View style={s.stepContainer}>
          <ScrollView contentContainerStyle={s.stepContent} keyboardShouldPersistTaps="handled">
            <Text style={[s.stepTitle, { color: colors.text }]}>{t('onboarding.spaceTitle')}</Text>
            <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>{t('onboarding.spaceDesc')}</Text>
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
                        backgroundColor: active ? colors.primary + '22' : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={s.optionEmoji}>{SPACE_TYPE_CONFIG[k].emoji}</Text>
                    <Text style={[s.optionLabel, { color: active ? colors.primary : colors.text }]}>
                      {t('onboarding.space' + k.charAt(0).toUpperCase() + k.slice(1))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.stepActions}>
            <Pressable onPress={() => setStep(0)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Pressable onPress={() => setStep(2)} style={s.skipButton}>
              <Text style={{ color: colors.textDisabled, fontSize: fontSize.md }}>{t('onboarding.skip')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => setStep(2)}
              disabled={spaceTypes.length === 0}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </View>
      )}

      {/* ── STEP 2: Growing method (multi) ── */}
      {step === 2 && (
        <View style={s.stepContainer}>
          <ScrollView contentContainerStyle={s.stepContent} keyboardShouldPersistTaps="handled">
            <Text style={[s.stepTitle, { color: colors.text }]}>{t('onboarding.methodTitle')}</Text>
            <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>{t('onboarding.methodDesc')}</Text>
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
                        backgroundColor: active ? colors.primary + '22' : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={s.optionEmoji}>{GROWING_METHOD_CONFIG[k].emoji}</Text>
                    <Text style={[s.optionLabel, { color: active ? colors.primary : colors.text }]}>
                      {t('onboarding.method' + k.charAt(0).toUpperCase() + k.slice(1))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.stepActions}>
            <Pressable onPress={() => setStep(1)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Pressable onPress={() => setStep(3)} style={s.skipButton}>
              <Text style={{ color: colors.textDisabled, fontSize: fontSize.md }}>{t('onboarding.skip')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => setStep(3)}
              disabled={growingMethods.length === 0}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </View>
      )}

      {/* ── STEP 3: Sunlight (single) ── */}
      {step === 3 && (
        <View style={s.stepContainer}>
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { color: colors.text }]}>{t('onboarding.sunTitle')}</Text>
            <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>{t('onboarding.sunDesc')}</Text>

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
                        backgroundColor: active ? colors.primary + '22' : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={s.optionEmoji}>{SUNLIGHT_CONFIG[k].emoji}</Text>
                    <Text style={[s.rowOptionLabel, { color: active ? colors.primary : colors.text }]}>
                      {t('onboarding.sun' + k.charAt(0).toUpperCase() + k.slice(1))}
                    </Text>
                    {active && <Text style={{ color: colors.primary, fontSize: 20 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.stepActions}>
            <Pressable onPress={() => setStep(2)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => setStep(4)}
              disabled={!sunlight}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </View>
      )}

      {/* ── STEP 4: Experience (single) ── */}
      {step === 4 && (
        <View style={s.stepContainer}>
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { color: colors.text }]}>{t('onboarding.expTitle')}</Text>
            <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>{t('onboarding.expDesc')}</Text>

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
                        backgroundColor: active ? colors.primary + '22' : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={s.optionEmoji}>{EXPERIENCE_CONFIG[k].emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowOptionLabel, { color: active ? colors.primary : colors.text }]}>
                        {t('onboarding.exp' + k.charAt(0).toUpperCase() + k.slice(1))}
                      </Text>
                      {k === 'beginner' && active && (
                        <Text style={[s.expNote, { color: colors.textSecondary }]}>
                          {t('onboarding.expBeginnerNote')}
                        </Text>
                      )}
                    </View>
                    {active && <Text style={{ color: colors.primary, fontSize: 20 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.stepActions}>
            <Pressable onPress={() => setStep(3)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => setStep(5)}
              disabled={!experience}
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
            <Text style={[s.stepTitle, { color: colors.text }]}>{t('onboarding.step2Title')}</Text>
            <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
              {t('onboarding.step2Desc')}
            </Text>

            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('onboarding.hemisphereLabel')}</Text>
            <View style={[s.gardenTypeRow, { marginBottom: spacing.lg }]}>
              {(['norte', 'sur'] as const).map((h) => {
                const active = hemisphere === h;
                return (
                  <Pressable
                    key={h}
                    onPress={() => { setHemisphere(h); setProvince(''); setSelectedCountry(null); }}
                    style={[
                      s.gardenTypeBtn,
                      {
                        backgroundColor: active ? colors.primary + '22' : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>{h === 'norte' ? '🌍' : '🌎'}</Text>
                    <Text style={[s.gardenTypeName, { color: active ? colors.primary : colors.textSecondary }]}>
                      {t('onboarding.hemisphere' + h.charAt(0).toUpperCase() + h.slice(1))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={locating ? undefined : detectLocation}
              style={[
                s.detectBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: locating ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="locate-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: fontSize.sm, marginLeft: 6, fontWeight: fontWeight.medium }}>
                {locating ? t('onboarding.detecting') : t('onboarding.detectLocation')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowProvincePicker(true)}
              style={[
                s.provinceButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: province ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: province ? colors.text : colors.textDisabled, fontSize: fontSize.md }}>
                {province || t('onboarding.selectProvince')}
              </Text>
              <Text style={{ fontSize: 18 }}>›</Text>
            </Pressable>

            {climateZone && zoneConfig && (
              <Card style={s.zoneCard} padded>
                <Text style={{ fontSize: 28 }}>{zoneConfig.emoji}</Text>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[s.zoneTitle, { color: colors.primary }]}>
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
            <Pressable onPress={() => setStep(4)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => setStep(6)}
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
            <Text style={[s.stepTitle, { color: colors.text }]}>{t('onboarding.step3Title')}</Text>
            <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
              {t('onboarding.step3Desc')}
            </Text>

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
            <Pressable onPress={() => setStep(5)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.create')}
              onPress={handleCreate}
              disabled={!gardenName.trim()}
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
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 80, marginBottom: spacing.xl }}>🎉</Text>
            <Text style={[s.stepTitle, { color: colors.text, textAlign: 'center' }]}>{t('onboarding.step4Title')}</Text>
            <Text style={[s.stepSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
              {t('onboarding.step4Desc')}
            </Text>
          </View>
          <View style={{ gap: spacing.md }}>
            <Button
              title={t('onboarding.addFirstPlant')}
              onPress={() => router.replace('/plant/new')}
              size="lg"
            />
            <Button
              title={t('onboarding.skipToGarden')}
              variant="secondary"
              onPress={() => router.replace('/(tabs)')}
              size="lg"
            />
          </View>
        </View>
      )}

      {/* ── Province picker modal ── */}
      <Modal visible={showProvincePicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={s.modalHeader}>
            {hemisphere === 'sur' && selectedCountry ? (
              <Pressable onPress={() => { setSelectedCountry(null); setProvinceSearch(''); }}>
                <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>← {selectedCountry}</Text>
              </Pressable>
            ) : (
              <Text style={[s.modalTitle, { color: colors.text }]}>{t('onboarding.selectProvince')}</Text>
            )}
            <Pressable onPress={() => { setShowProvincePicker(false); setProvinceSearch(''); }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                {t('onboarding.closeSearch')}
              </Text>
            </Pressable>
          </View>

          {hemisphere === 'sur' && !selectedCountry ? (
            <FlatList
              data={LATAM_COUNTRIES}
              keyExtractor={(item) => item.country}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedCountry(item.country)}
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
