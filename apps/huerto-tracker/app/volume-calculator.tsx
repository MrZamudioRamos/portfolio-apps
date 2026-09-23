import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { goBackOr } from '../src/utils/navigation';
import {
  calculateVolumeMix,
  DEFAULT_VOLUME_MIX_RECIPE,
  sanitizeVolumeInput,
  saveVolumeMixRecipe,
  loadVolumeMixRecipe,
  type VolumeMixPresetId,
  type VolumeMixRecipe,
} from '../src/utils/volumeMix';

type CropPreset = {
  id: VolumeMixPresetId;
  icon: keyof typeof Ionicons.glyphMap;
  volume: number;
};

const PRESETS: CropPreset[] = [
  { id: 'aromatic', icon: 'leaf-outline', volume: 5 },
  { id: 'leafy', icon: 'flower-outline', volume: 8 },
  { id: 'fruiting', icon: 'nutrition-outline', volume: 20 },
];

type RecipeState = {
  gardenId: string | null;
  recipe: VolumeMixRecipe;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  issue: 'load' | 'save' | null;
};

function emptyState(gardenId: string | null, loading = false): RecipeState {
  return {
    gardenId,
    recipe: { ...DEFAULT_VOLUME_MIX_RECIPE },
    loading,
    saving: false,
    saved: false,
    issue: null,
  };
}

export default function VolumeCalculatorScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { activeGarden } = useActiveGarden();
  const gardenId = activeGarden?.id ?? null;
  const activeGardenId = useRef(gardenId);
  activeGardenId.current = gardenId;

  const [state, setState] = useState<RecipeState>(() => emptyState(null));

  useEffect(() => {
    let cancelled = false;
    if (!gardenId) {
      setState(emptyState(null));
      return () => { cancelled = true; };
    }

    setState(emptyState(gardenId, true));
    void loadVolumeMixRecipe(gardenId, AsyncStorage).then((recipe) => {
      if (cancelled) return;
      setState({
        gardenId,
        recipe: recipe ?? { ...DEFAULT_VOLUME_MIX_RECIPE },
        loading: false,
        saving: false,
        saved: false,
        issue: null,
      });
    }).catch(() => {
      if (cancelled) return;
      setState({ ...emptyState(gardenId), issue: 'load' });
    });

    return () => { cancelled = true; };
  }, [gardenId]);

  const current = state.gardenId === gardenId ? state : emptyState(gardenId, Boolean(gardenId));
  const recipe = current.recipe;
  const preset = PRESETS.find((item) => item.id === recipe.presetId) ?? PRESETS[2];
  const result = useMemo(() => calculateVolumeMix(recipe.volumeText), [recipe.volumeText]);
  const loading = current.loading || Boolean(gardenId && state.gardenId !== gardenId);
  const saveDisabled = !gardenId || loading || current.saving || !result;

  function updateRecipe(patch: Partial<VolumeMixRecipe>) {
    setState((previous) => {
      const base = previous.gardenId === gardenId ? previous : emptyState(gardenId);
      return {
        ...base,
        recipe: { ...base.recipe, ...patch },
        saved: false,
        issue: null,
      };
    });
  }

  function choosePreset(item: CropPreset) {
    updateRecipe({ presetId: item.id, volumeText: String(item.volume) });
  }

  async function saveRecipe() {
    if (saveDisabled || !gardenId || !result || current.saving) return;
    const gardenBeingSaved = gardenId;
    const recipeBeingSaved = { ...recipe };
    setState((previous) => previous.gardenId === gardenBeingSaved
      ? { ...previous, saving: true, saved: false, issue: null }
      : previous);

    try {
      await saveVolumeMixRecipe(gardenBeingSaved, recipeBeingSaved, AsyncStorage);
      if (activeGardenId.current !== gardenBeingSaved) return;
      setState((previous) => previous.gardenId === gardenBeingSaved
        ? { ...previous, saving: false, saved: true, issue: null }
        : previous);
    } catch {
      if (activeGardenId.current !== gardenBeingSaved) return;
      setState((previous) => previous.gardenId === gardenBeingSaved
        ? { ...previous, saving: false, saved: false, issue: 'save' }
        : previous);
    }
  }

  function formatLiters(value: number) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }

  const presetName = (id: VolumeMixPresetId) => t('volumeCalculator.presets.' + id + '.name');
  const presetHint = (id: VolumeMixPresetId) => t('volumeCalculator.presets.' + id + '.hint');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('volumeCalculator.back')}
          onPress={() => goBackOr(router)}
          style={styles.headerAction}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[styles.headerBack, { color: colors.text }]}>{t('volumeCalculator.back')}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: colors.text }]}>{t('volumeCalculator.title')}</Text>
        <View style={{ width: 92 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="calculator-outline" size={27} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{t('volumeCalculator.eyebrow')}</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{t('volumeCalculator.heroTitle')}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{t('volumeCalculator.intro')}</Text>
          </View>
        </View>

        <Text style={[styles.section, { color: colors.textSecondary }]}>{t('volumeCalculator.presetLabel')}</Text>
        <View style={styles.presetGrid}>
          {PRESETS.map((item) => {
            const active = item.id === recipe.presetId;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, disabled: loading }}
                disabled={loading}
                onPress={() => choosePreset(item)}
                style={[styles.preset, { backgroundColor: active ? colors.primary + '14' : colors.surface, borderColor: active ? colors.primary : colors.border, opacity: loading ? 0.55 : 1 }]}
              >
                <Ionicons name={item.icon} size={22} color={active ? colors.primary : colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.presetTitle, { color: active ? colors.primary : colors.text }]}>{presetName(item.id)}</Text>
                  <Text style={[styles.presetHint, { color: colors.textSecondary }]}>{presetHint(item.id)}</Text>
                </View>
                <Text style={[styles.presetVolume, { color: colors.textSecondary }]}>{item.volume} L</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.section, { color: colors.textSecondary }]}>{t('volumeCalculator.volumeLabel')}</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: result ? colors.border : colors.error, opacity: loading ? 0.55 : 1 }]}>
          <Ionicons name="cube-outline" size={20} color={colors.primary} />
          <TextInput
            value={recipe.volumeText}
            onChangeText={(value) => updateRecipe({ volumeText: sanitizeVolumeInput(value) })}
            editable={!loading}
            keyboardType="decimal-pad"
            accessibilityLabel={t('volumeCalculator.volumeLabel')}
            style={[styles.input, { color: colors.text }]}
          />
          <Text style={[styles.unit, { color: colors.textSecondary }]}>{t('volumeCalculator.liters')}</Text>
        </View>
        {!result && <Text accessibilityRole="alert" style={{ color: colors.error }}>{t('volumeCalculator.invalidVolume')}</Text>}

        <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={[styles.resultEyebrow, { color: colors.textSecondary }]}>{t('volumeCalculator.mixTitle')}</Text>
              <Text style={[styles.resultTitle, { color: colors.text }]}>{presetName(preset.id)}</Text>
            </View>
            <Ionicons name="leaf-outline" size={25} color={colors.primary} />
          </View>
          {result && (
            <View style={styles.resultGrid}>
              <View style={[styles.resultItem, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.resultNumber, { color: colors.primary }]}>{formatLiters(result.substrateLiters)} L</Text>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>{t('volumeCalculator.substrate')}</Text>
              </View>
              <View style={[styles.resultItem, { backgroundColor: colors.accent + '2A' }]}>
                <Text style={[styles.resultNumber, { color: colors.warning }]}>{formatLiters(result.perliteLiters)} L</Text>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>{t('volumeCalculator.perlite')}</Text>
              </View>
            </View>
          )}
          <Text style={[styles.body, { color: colors.textSecondary }]}>{t('volumeCalculator.mixNote')}</Text>
        </View>

        <View style={[styles.rule, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.body, { color: colors.text }]}>{t('volumeCalculator.airNote')}</Text>
        </View>

        {loading && <Text accessibilityRole="text" style={[styles.status, { color: colors.textSecondary }]}>{t('volumeCalculator.loading')}</Text>}
        {!gardenId && <Text style={[styles.status, { color: colors.textSecondary }]}>{t('volumeCalculator.noGarden')}</Text>}
        {gardenId && <Text style={[styles.status, { color: colors.textSecondary }]}>{t('volumeCalculator.deviceOnly')}</Text>}
        {current.issue === 'load' && <Text accessibilityRole="alert" style={[styles.status, { color: colors.error }]}>{t('volumeCalculator.loadError')}</Text>}
        {current.issue === 'save' && <Text accessibilityRole="alert" style={[styles.status, { color: colors.error }]}>{t('volumeCalculator.saveError')}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saveDisabled, busy: current.saving }}
          disabled={saveDisabled}
          onPress={() => { void saveRecipe(); }}
          style={[styles.primary, { backgroundColor: colors.primary, opacity: saveDisabled ? 0.5 : 1 }]}
        >
          <Ionicons name={current.saving ? 'hourglass-outline' : current.saved ? 'checkmark-circle-outline' : 'save-outline'} size={19} color="#fff" />
          <Text style={styles.primaryText}>{t(current.saved ? 'volumeCalculator.saved' : 'volumeCalculator.save')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerAction: { minHeight: 44, minWidth: 92, flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerBack: { fontSize: 13, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  content: { padding: 18, paddingBottom: 34, gap: 14 },
  hero: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12 },
  heroIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { fontSize: 21, fontWeight: '900', marginTop: 3 },
  body: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  section: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, marginTop: 8 },
  presetGrid: { gap: 8 },
  preset: { minHeight: 68, padding: 11, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  presetTitle: { fontSize: 13, fontWeight: '900' },
  presetHint: { flex: 1, fontSize: 11, marginTop: 2 },
  presetVolume: { fontSize: 12, fontWeight: '800' },
  inputRow: { minHeight: 54, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, fontSize: 18, fontWeight: '900', paddingVertical: 0 },
  unit: { fontSize: 13, fontWeight: '700' },
  resultCard: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  resultTitle: { fontSize: 17, fontWeight: '900', marginTop: 3 },
  resultGrid: { flexDirection: 'row', gap: 8 },
  resultItem: { flex: 1, padding: 12, borderRadius: 12 },
  resultNumber: { fontSize: 21, fontWeight: '900' },
  resultLabel: { fontSize: 11, marginTop: 3 },
  rule: { borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  status: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  primary: { minHeight: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
