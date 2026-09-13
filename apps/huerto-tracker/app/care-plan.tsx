import { Card, useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { cancelReminder, requestPermissions, scheduleDateAlert } from '@portfolio/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ActionButton';
import { GlassView, isLiquidGlassAvailable } from '../src/utils/glassEffect';
import { CROPS_BY_ID } from '../src/data/crops';
import { useCustomCrops } from '../src/hooks/useCustomCrops';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { usePro } from '../src/hooks/usePro';
import type { Plant } from '../src/models/plant';
import type { DiaryEntry } from '../src/models/diary-entry';
import { recordCare } from '../src/utils/careWrites';
import { buildCarePlan, type CareTask, type CareTaskKind } from '../src/utils/carePlan';

const AUTOPILOT_KEY = '@huerto/care_autopilot/';
const COMPLETED_KEY = '@huerto/care_completed/';
const PREVIEW_LIMIT = 3;
const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

const TASK_ICONS: Record<CareTaskKind, keyof typeof Ionicons.glyphMap> = {
  water: 'water-outline',
  pest: 'bug-outline',
  transplant: 'leaf-outline',
  harvest: 'basket-outline',
  treatment: 'shield-checkmark-outline',
  check: 'eye-outline',
};

export default function CarePlanScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isPro } = usePro();
  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const { customCropsById } = useCustomCrops();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHowTo, setShowHowTo] = useState(true);

  useEffect(() => {
    if (!activeGarden?.id) return;
    Promise.all([
      AsyncStorage.getItem(AUTOPILOT_KEY + activeGarden.id),
      AsyncStorage.getItem(COMPLETED_KEY + activeGarden.id),
    ]).then(([autopilotRaw, completedRaw]) => {
      setAutopilotEnabled(autopilotRaw === '1');
      if (completedRaw) {
        try { setCompleted(new Set(JSON.parse(completedRaw) as string[])); } catch { /* use empty state */ }
      }
    });
  }, [activeGarden?.id]);

  const gardenPlants = useMemo(
    () => plants.items.filter((plant) => plant.gardenId === activeGarden?.id && plant.status !== 'finished'),
    [plants.items, activeGarden?.id],
  );
  const allTasks = useMemo(
    () => buildCarePlan(gardenPlants, { ...CROPS_BY_ID, ...customCropsById }, entries.items),
    [gardenPlants, customCropsById, entries.items],
  );
  const openTasks = useMemo(() => allTasks.filter((task) => !completed.has(task.id)), [allTasks, completed]);
  const visibleTasks = isPro ? openTasks : openTasks.slice(0, PREVIEW_LIMIT);
  const todayCount = openTasks.filter((task) => task.priority === 'today').length;

  async function toggleTask(task: CareTask) {
    if (!activeGarden?.id) return;
    const next = new Set(completed);
    if (next.has(task.id)) {
      next.delete(task.id);
    } else {
      if (task.kind === 'water') {
        try {
          const written = await recordCare(task.plantId, 'watering');
          if (!written) return;
        } catch {
          Alert.alert(t('common.error'), t('carePlan.recordError'));
          return;
        }
      }
      next.add(task.id);
    }
    setCompleted(next);
    await AsyncStorage.setItem(COMPLETED_KEY + activeGarden.id, JSON.stringify([...next]));
  }

  async function toggleAutopilot() {
    if (!activeGarden?.id) return;
    if (!isPro) {
      router.push('/paywall?source=care_autopilot' as any);
      return;
    }
    if (autopilotEnabled) {
      const raw = await AsyncStorage.getItem(AUTOPILOT_KEY + activeGarden.id + ':ids');
      let ids: string[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) ids = parsed.filter((id): id is string => typeof id === 'string');
        } catch {
          // Ignore stale notification state while disabling autopilot.
        }
      }
      await Promise.all(ids.map((id) => cancelReminder(id).catch(() => undefined)));
      await AsyncStorage.multiRemove([AUTOPILOT_KEY + activeGarden.id, AUTOPILOT_KEY + activeGarden.id + ':ids']);
      setAutopilotEnabled(false);
      return;
    }

    setSaving(true);
    const granted = await requestPermissions();
    if (!granted) {
      setSaving(false);
      Alert.alert(t('carePlan.permissionTitle'), t('carePlan.permissionDesc'));
      return;
    }

    const grouped = new Map<string, CareTask[]>();
    for (const task of openTasks.slice(0, 30)) {
      const list = grouped.get(task.dueDate) ?? [];
      list.push(task);
      grouped.set(task.dueDate, list);
    }
    const ids: string[] = [];
    for (const [date, dayTasks] of grouped) {
      const fireAt = new Date(date + 'T09:00:00');
      if (fireAt <= new Date()) fireAt.setDate(fireAt.getDate() + 1);
      const labels = dayTasks.slice(0, 3).map((task) => task.plantName).join(', ');
      const id = await scheduleDateAlert({
        date: fireAt,
        title: t('carePlan.notificationTitle', { count: dayTasks.length }),
        body: t('carePlan.notificationBody', { tasks: labels }),
      });
      if (id) ids.push(id);
    }
    await AsyncStorage.setItem(AUTOPILOT_KEY + activeGarden.id, '1');
    await AsyncStorage.setItem(AUTOPILOT_KEY + activeGarden.id + ':ids', JSON.stringify(ids));
    setAutopilotEnabled(true);
    setSaving(false);
  }

  const formatDate = (date: string) => new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date + 'T12:00:00'));

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={12} style={s.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('carePlan.title')}</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
          <View style={s.heroContent}>
            <Text style={s.heroEmoji}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroTitle, { color: colors.text }]}>{t('carePlan.heading')}</Text>
              <Text style={[s.heroDesc, { color: colors.textSecondary }]}>{t('carePlan.description')}</Text>
            </View>
          </View>
          <View style={[s.summaryRow, { borderTopColor: colors.border }]}>
            <View style={s.summaryItem}>
              <Text style={[s.summaryNumber, { color: colors.primary }]}>{todayCount}</Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{t('carePlan.today')}</Text>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNumber, { color: colors.text }]}>{openTasks.length}</Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{t('carePlan.nextDays')}</Text>
            </View>
            <Pressable onPress={toggleAutopilot} disabled={saving} style={[s.autopilotButton, { backgroundColor: autopilotEnabled ? colors.primary + '18' : colors.primary, borderColor: colors.primary }]}>
              <Ionicons name={autopilotEnabled ? 'notifications-off-outline' : 'notifications-outline'} size={17} color={autopilotEnabled ? colors.primary : colors.background} />
              <Text style={[s.autopilotText, { color: autopilotEnabled ? colors.primary : colors.background }]}>{saving ? '…' : autopilotEnabled ? t('carePlan.stopAutopilot') : t('carePlan.activateAutopilot')}</Text>
            </Pressable>
          </View>
        </View>

        <Card padded style={s.howCard}>
          <Pressable onPress={() => setShowHowTo((value) => !value)} style={s.howHeader} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>{t('carePlan.howTitle')}</Text>
              <Text style={[s.cardDesc, { color: colors.textSecondary }]}>{t('carePlan.howDesc')}</Text>
            </View>
            <Ionicons name={showHowTo ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
          </Pressable>
          {showHowTo && (
            <View style={s.howSteps}>
              {[
                ['1', 'carePlan.howStep1Title', 'carePlan.howStep1Desc'],
                ['2', 'carePlan.howStep2Title', 'carePlan.howStep2Desc'],
                ['3', 'carePlan.howStep3Title', 'carePlan.howStep3Desc'],
              ].map(([number, titleKey, descKey]) => (
                <View key={number} style={s.howStep}>
                  <View style={[s.howNumber, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: colors.background, fontWeight: fontWeight.bold }}>{number}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.howStepTitle, { color: colors.text }]}>{t(titleKey)}</Text>
                    <Text style={[s.howStepDesc, { color: colors.textSecondary }]}>{t(descKey)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {!gardenPlants.length ? (
          <Card padded style={s.card}>
            <Text style={[s.cardTitle, { color: colors.text }]}>{t('carePlan.emptyTitle')}</Text>
            <Text style={[s.cardDesc, { color: colors.textSecondary }]}>{t('carePlan.emptyDesc')}</Text>
            <Button title={t('carePlan.addPlant')} variant="secondary" onPress={() => router.push('/plant/new')} style={{ marginTop: spacing.md }} />
          </Card>
        ) : (
          <>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('carePlan.queueTitle')}</Text>
              <Text style={[s.sectionSub, { color: colors.textSecondary }]}>{t('carePlan.queueDesc')}</Text>
            </View>
            <View style={{ gap: spacing.sm }}>
              {visibleTasks.map((task) => (
                <Pressable key={task.id} onPress={() => toggleTask(task)} accessibilityRole="checkbox" accessibilityState={{ checked: completed.has(task.id) }} style={[s.taskRow, { backgroundColor: colors.surface, borderColor: task.priority === 'today' ? colors.primary + '80' : colors.border }]}>
                  <View style={[s.taskIcon, { backgroundColor: task.priority === 'today' ? colors.primary + '18' : colors.surfaceAlt }]}>
                    <Ionicons name={TASK_ICONS[task.kind]} size={20} color={task.priority === 'today' ? colors.primary : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[s.taskTitle, { color: colors.text }]}>{t(task.titleKey, { name: task.plantName })}</Text>
                    <Text style={[s.taskReason, { color: colors.textSecondary }]}>{t(task.reasonKey)}</Text>
                    <Text style={[s.taskHow, { color: colors.textSecondary }]}>{t(task.howKey)}</Text>
                    <Text style={[s.taskDate, { color: task.priority === 'today' ? colors.primary : colors.textSecondary }]}>{task.priority === 'today' ? t('carePlan.today') : formatDate(task.dueDate)}</Text>
                  </View>
                  <Ionicons name="ellipse-outline" size={23} color={colors.primary} />
                </Pressable>
              ))}
            </View>

            {!isPro && openTasks.length > PREVIEW_LIMIT && (
              <Card padded style={{ ...s.unlockCard, backgroundColor: colors.primary + '12', borderColor: colors.primary + '55' }}>
                <Text style={[s.unlockTitle, { color: colors.text }]}>{t('carePlan.freePreviewTitle')}</Text>
                <Text style={[s.unlockDesc, { color: colors.textSecondary }]}>{t('carePlan.freePreviewDesc', { count: openTasks.length - PREVIEW_LIMIT })}</Text>
                <Button title={t('carePlan.unlock')} onPress={() => router.push('/paywall?source=care_autopilot' as any)} size="sm" style={{ marginTop: spacing.md }} />
              </Card>
            )}
            {isPro && openTasks.length === 0 && (
              <Card padded style={s.card}>
                <Text style={[s.cardTitle, { color: colors.text }]}>{t('carePlan.allDoneTitle')}</Text>
                <Text style={[s.cardDesc, { color: colors.textSecondary }]}>{t('carePlan.allDoneDesc')}</Text>
              </Card>
            )}
          </>
        )}

        <Pressable onPress={() => router.push('/absence' as any)} style={[s.absenceLink, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={{ fontSize: 22 }}>🧳</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.taskTitle, { color: colors.text }]}>{t('carePlan.absenceTitle')}</Text>
            <Text style={[s.taskReason, { color: colors.textSecondary }]}>{t('carePlan.absenceDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, spacing: Record<string, number>, fontSize: Record<string, number>, fontWeight: any, radii: Record<string, number>) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1 },
  backButton: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  headerSpacer: { width: 44 },
  scroll: { padding: spacing.xl, gap: spacing.lg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  heroContent: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  heroEmoji: { fontSize: 34 },
  heroTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  heroDesc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  summaryItem: { alignItems: 'center', minWidth: 48 },
  summaryNumber: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 30 },
  autopilotButton: { flex: 1, minHeight: 44, borderRadius: radii.full, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  autopilotText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  card: { borderColor: colors.border },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  cardDesc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs },
  howCard: { borderColor: colors.border },
  howHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  howSteps: { gap: spacing.md, marginTop: spacing.lg },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  howNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  howStepTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  howStepDesc: { fontSize: fontSize.xs, lineHeight: 17 },
  sectionHeader: { gap: 3 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  sectionSub: { fontSize: fontSize.sm, lineHeight: 19 },
  taskRow: { minHeight: 90, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  taskIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  taskReason: { fontSize: fontSize.xs, lineHeight: 17 },
  taskHow: { fontSize: fontSize.xs, lineHeight: 17 },
  taskDate: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 2 },
  unlockCard: { borderWidth: 1, borderRadius: radii.lg },
  unlockTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  unlockDesc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs },
  absenceLink: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
