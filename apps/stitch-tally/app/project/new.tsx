import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { usePurchases } from '@portfolio/billing';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CRAFT_CONFIG, YARN_COLORS, type CraftType, type Project } from '../../src/models/project';

const FREE_LIMIT = 2;

export default function NewProjectScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { isPro } = usePurchases();

  const projects = useCollection<Project>('stitch_projects');

  const [name, setName] = useState('');
  const [totalRows, setTotalRows] = useState('');
  const [craftType, setCraftType] = useState<CraftType>('crochet');
  const [yarnColor, setYarnColor] = useState<string>(YARN_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const atLimit = !isPro && projects.count >= FREE_LIMIT;

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function handleCreate() {
    if (!name.trim()) return;
    if (atLimit) {
      Alert.alert('', t('new_project.limit_reached'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('projects.upgrade'), onPress: () => router.replace('/paywall') },
      ]);
      return;
    }
    setSaving(true);
    try {
      const parsed = parseInt(totalRows, 10);
      const now = new Date().toISOString();
      await projects.create({
        name: name.trim(),
        craftType,
        totalRows: isNaN(parsed) || parsed <= 0 ? null : parsed,
        currentRow: 0,
        stitchCount: 0,
        autoResetStitch: true,
        yarnColor,
        notes: {},
        sessions: [],
        lastUsedAt: now,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: colors.text }]}>{t('new_project.title')}</Text>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={[s.cancelText, { color: colors.primary }]}>{t('common.cancel')}</Text>
            </Pressable>
          </View>

          {/* Name */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('new_project.name_label')}</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.surface, borderColor: name ? colors.primary : colors.border, color: colors.text }]}
            placeholder={t('new_project.name_placeholder')}
            placeholderTextColor={colors.textDisabled}
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoFocus
            returnKeyType="next"
          />

          {/* Total rows */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('new_project.total_rows_label')}</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.surface, borderColor: totalRows ? colors.primary : colors.border, color: colors.text }]}
            placeholder={t('new_project.total_rows_placeholder')}
            placeholderTextColor={colors.textDisabled}
            value={totalRows}
            onChangeText={setTotalRows}
            keyboardType="number-pad"
            returnKeyType="done"
          />

          {/* Craft type */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('new_project.craft_label')}</Text>
          <View style={s.segmentRow}>
            {(Object.keys(CRAFT_CONFIG) as CraftType[]).map((type) => {
              const cfg = CRAFT_CONFIG[type];
              const active = craftType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setCraftType(type)}
                  style={[
                    s.segment,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={s.segmentEmoji}>{cfg.emoji}</Text>
                  <Text style={[s.segmentText, { color: active ? '#fff' : colors.text }]}>
                    {cfg.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Yarn color */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('new_project.color_label')}</Text>
          <View style={s.colorGrid}>
            {YARN_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setYarnColor(c)}
                style={[
                  s.colorDot,
                  { backgroundColor: c, borderColor: yarnColor === c ? colors.primary : 'transparent' },
                  c === '#FFFFFF' && { borderColor: yarnColor === c ? colors.primary : colors.border },
                ]}
              >
                {yarnColor === c && (
                  <Text style={{ color: c === '#FFFFFF' ? colors.text : '#fff', fontSize: 14 }}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>

          {/* Preview stripe */}
          <View style={[s.preview, { borderColor: colors.border }]}>
            <View style={[s.previewStripe, { backgroundColor: yarnColor }]} />
            <Text style={[s.previewText, { color: colors.text }]}>
              {CRAFT_CONFIG[craftType].emoji} {name || t('new_project.name_placeholder')}
            </Text>
          </View>
        </ScrollView>

        {/* Create button */}
        <View style={[s.footer, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleCreate}
            disabled={!name.trim() || saving}
            style={({ pressed }) => [
              s.createBtn,
              {
                backgroundColor: name.trim() ? colors.primary : colors.surfaceAlt,
                ...shadows.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[s.createBtnText, { color: name.trim() ? '#fff' : colors.textDisabled }]}>
              {saving ? '…' : t('new_project.create_button')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    scroll: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing['3xl'] },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
    title: { flex: 1, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    cancelText: { fontSize: fontSize.md },
    label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: spacing.xs },
    input: {
      height: 48,
      borderRadius: radii.md,
      borderWidth: 1.5,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.md,
      marginBottom: spacing.md,
    },
    segmentRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 48,
      borderRadius: radii.md,
      borderWidth: 1.5,
    },
    segmentEmoji: { fontSize: 20 },
    segmentText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    colorDot: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.lg,
      borderWidth: 1,
      overflow: 'hidden',
      marginTop: spacing.sm,
    },
    previewStripe: { width: 8, height: 56 },
    previewText: { paddingHorizontal: spacing.md, fontSize: fontSize.md, fontWeight: fontWeight.medium },
    footer: {
      padding: spacing.xl,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    createBtn: {
      height: 52,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  });
