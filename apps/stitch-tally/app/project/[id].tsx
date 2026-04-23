import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { usePurchases } from '@portfolio/billing';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  hapticComplete,
  hapticDecrement,
  hapticMilestone,
  hapticReset,
  hapticTap,
} from '../../src/haptics';
import { CRAFT_CONFIG, type Project } from '../../src/models/project';

// ── Arc progress ring ────────────────────────────────────────────────────────
function ArcRing({ progress, color, size }: { progress: number; color: string; size: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(progress, 0), 1));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={color + '25'} strokeWidth={stroke} fill="transparent" />
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="transparent"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Celebration overlay ──────────────────────────────────────────────────────
function CelebrationOverlay({ visible, total, yarnColor, onDismiss }: {
  visible: boolean; total: number; yarnColor: string; onDismiss: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale  = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
        Animated.spring(scale,   { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]).start();
      const t = setTimeout(onDismiss, 3000);
      return () => clearTimeout(t);
    } else {
      opacity.setValue(0);
      scale.setValue(0.5);
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <Pressable onPress={onDismiss} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.celebBg, { opacity }]}>
        <Animated.View style={[styles.celebCard, { transform: [{ scale }] }]}>
          <Text style={styles.celebEmoji}>🎉</Text>
          <Text style={[styles.celebTitle, { color: yarnColor }]}>{total} rows!</Text>
          <Text style={styles.celebSub}>Project complete ✨</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  celebBg: { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  celebCard: { backgroundColor: '#fff', borderRadius: 28, padding: 40, alignItems: 'center', gap: 8, width: 260 },
  celebEmoji: { fontSize: 64 },
  celebTitle: { fontSize: 52, fontWeight: '800' },
  celebSub: { fontSize: 18, color: '#666' },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function CounterScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { isPro } = usePurchases();

  useEffect(() => {
    activateKeepAwakeAsync();
    return () => { deactivateKeepAwake(); };
  }, []);

  const projects = useCollection<Project>('stitch_projects');
  const project = projects.getById(id!);

  const [currentRow, setCurrentRow] = useState(project?.currentRow ?? 0);
  const [stitchCount, setStitchCount] = useState(project?.stitchCount ?? 0);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [celebrating, setCelebrating] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const sessionStartRow = useRef(project?.currentRow ?? 0);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      setCurrentRow(project.currentRow);
      setStitchCount(project.stitchCount);
      setNoteText(project.notes[project.currentRow] ?? '');
      sessionStartRow.current = project.currentRow;
    }
  }, [project?.id]);

  const saveProject = useCallback((row: number, stitch: number) => {
    if (!project) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const now = new Date().toISOString();
      const rowsInSession = row - sessionStartRow.current;
      const sessions = rowsInSession > 0
        ? [...project.sessions, { date: now.split('T')[0], rowsCompleted: rowsInSession }]
        : project.sessions;
      projects.update(project.id, { currentRow: row, stitchCount: stitch, lastUsedAt: now, sessions });
    }, 500);
  }, [project, projects]);

  function animateTap() {
    scaleAnim.setValue(0.88);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 350, friction: 8 }).start();
  }

  function flashScreen() {
    flashAnim.setValue(0.18);
    Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
  }

  async function increment() {
    const newRow = currentRow + 1;
    const total = project?.totalRows ?? null;
    const isComplete = total !== null && newRow >= total;
    const isMilestone = newRow % 10 === 0;
    const newStitch = project?.autoResetStitch ? 0 : stitchCount;

    setCurrentRow(newRow);
    setStitchCount(newStitch);
    animateTap();
    setNoteText(project?.notes[newRow] ?? '');

    if (isComplete && !celebrating) {
      setCelebrating(true);
      flashScreen();
      await hapticComplete();
    } else if (isMilestone) {
      flashScreen();
      await hapticMilestone();
    } else {
      await hapticTap();
    }
    saveProject(newRow, newStitch);
  }

  async function decrement() {
    if (currentRow === 0) return;
    const newRow = currentRow - 1;
    setCurrentRow(newRow);
    setNoteText(project?.notes[newRow] ?? '');
    await hapticDecrement();
    saveProject(newRow, stitchCount);
  }

  async function incrementStitch() {
    const n = stitchCount + 1;
    setStitchCount(n);
    await hapticTap();
    saveProject(currentRow, n);
  }

  async function resetStitch() {
    setStitchCount(0);
    await hapticDecrement();
    saveProject(currentRow, 0);
  }

  function confirmReset() {
    Alert.alert(t('counter.reset_confirm'), '', [
      { text: t('counter.reset_no'), style: 'cancel' },
      {
        text: t('counter.reset_yes'), style: 'destructive',
        onPress: async () => {
          setCurrentRow(0); setStitchCount(0); setCelebrating(false);
          await hapticReset();
          saveProject(0, 0);
        },
      },
    ]);
  }

  function saveNote() {
    if (!project) return;
    const updated = { ...project.notes };
    if (noteText.trim()) updated[currentRow] = noteText.trim();
    else delete updated[currentRow];
    projects.update(project.id, { notes: updated });
    setShowNotes(false);
  }

  const total = project?.totalRows ?? null;
  const progress = total ? currentRow / total : null;
  const hasNote = !!(project?.notes[currentRow]);
  const yarnColor = project?.yarnColor ?? colors.primary;

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii, yarnColor),
    [colors, spacing, fontSize, fontWeight, radii, yarnColor]
  );

  if (!project) return null;
  const craft = CRAFT_CONFIG[project.craftType];

  return (
    <SafeAreaView style={s.container}>
      {/* Yarn-color tint washes over the whole screen */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: yarnColor, opacity: 0.06 }]} pointerEvents="none" />

      {/* Milestone flash */}
      <Animated.View pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: yarnColor, opacity: flashAnim }]} />

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={14} style={s.backBtn}>
          <Text style={[s.backArrow, { color: yarnColor }]}>←</Text>
        </Pressable>
        <View style={s.projectMeta}>
          <Text style={s.craftEmoji}>{craft.emoji}</Text>
          <View>
            <Text style={[s.projectName, { color: colors.text }]} numberOfLines={1}>{project.name}</Text>
            {total && (
              <Text style={[s.goalText, { color: colors.textSecondary }]}>
                {t('projects.of')} {total} {t('projects.rows')}
              </Text>
            )}
          </View>
        </View>
        <View style={s.topActions}>
          {isPro && (
            <Pressable onPress={() => setShowNotes(true)} hitSlop={12}
              style={[s.iconBtn, hasNote && { backgroundColor: yarnColor + '22' }]}>
              <Text style={{ fontSize: 18 }}>{hasNote ? '📝' : '✏️'}</Text>
            </Pressable>
          )}
          <Pressable onPress={confirmReset} hitSlop={12} style={s.iconBtn}>
            <Text style={[s.iconBtnText, { color: colors.textSecondary }]}>↺</Text>
          </Pressable>
        </View>
      </View>

      {/* ── TAP ZONE — whole center is the button ── */}
      <Pressable onPress={increment} style={s.tapArea}
        android_ripple={{ color: yarnColor + '18', borderless: true }}>
        <View style={s.ringWrapper}>
          {progress !== null && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <ArcRing progress={progress} color={yarnColor} size={300} />
            </View>
          )}

          {/* Soft glow disc behind the number */}
          <View style={[s.glowDisc, { backgroundColor: yarnColor + '12' }]} />

          <View style={s.numberBlock}>
            <Text style={[s.rowLabel, { color: yarnColor + 'AA' }]}>
              {t('counter.row').toUpperCase()}
            </Text>
            <Animated.Text style={[s.rowNumber, { color: yarnColor, transform: [{ scale: scaleAnim }] }]}>
              {currentRow}
            </Animated.Text>
            {total && (
              <Text style={[s.rowOf, { color: colors.textDisabled }]}>/ {total}</Text>
            )}
          </View>
        </View>

        <Text style={[s.tapHint, { color: colors.textDisabled }]}>tap anywhere to count</Text>
      </Pressable>

      {/* ── Bottom bar ── */}
      <View style={[s.bottomBar, { borderTopColor: colors.border }]}>
        {/* −1 row */}
        <Pressable onPress={decrement} disabled={currentRow === 0}
          style={({ pressed }) => [
            s.decrementBtn,
            { borderColor: colors.border, backgroundColor: colors.surface },
            (pressed || currentRow === 0) && { opacity: 0.35 },
          ]}>
          <Text style={[s.decrementText, { color: colors.text }]}>−1</Text>
          <Text style={[s.decrementSub, { color: colors.textSecondary }]}>{t('counter.row')}</Text>
        </Pressable>

        {/* Stitch counter */}
        <View style={[s.stitchPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.stitchLabel, { color: colors.textSecondary }]}>
            {t('counter.stitch').toUpperCase()}
          </Text>
          <Text style={[s.stitchNum, { color: colors.text }]}>{stitchCount}</Text>
          <View style={s.stitchRow}>
            <Pressable onPress={resetStitch} hitSlop={8}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
              <Text style={[s.stitchAction, { color: colors.textSecondary }]}>↺</Text>
            </Pressable>
            <View style={[s.stitchDivider, { backgroundColor: colors.border }]} />
            <Pressable onPress={incrementStitch} hitSlop={8}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
              <Text style={[s.stitchAction, { color: yarnColor }]}>+1</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Celebration overlay ── */}
      <CelebrationOverlay
        visible={celebrating}
        total={total ?? currentRow}
        yarnColor={yarnColor}
        onDismiss={() => setCelebrating(false)}
      />

      {/* ── Row notes modal (Pro) ── */}
      <Modal visible={showNotes} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {t('counter.notes_label')} — {t('counter.row')} {currentRow}
            </Text>
            <Pressable onPress={saveNote}>
              <Text style={[s.modalSave, { color: yarnColor }]}>{t('common.save')}</Text>
            </Pressable>
          </View>
          <TextInput
            style={[s.notesInput, { color: colors.text }]}
            placeholder={t('counter.notes_placeholder', { row: currentRow })}
            placeholderTextColor={colors.textDisabled}
            value={noteText}
            onChangeText={setNoteText}
            multiline autoFocus
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>,
  yarnColor: string,
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    backBtn: { marginRight: spacing.sm },
    backArrow: { fontSize: 28, fontWeight: '300' },
    projectMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    craftEmoji: { fontSize: 22 },
    projectName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    goalText: { fontSize: fontSize.xs, marginTop: 1 },
    topActions: { flexDirection: 'row', gap: spacing.sm },
    iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    iconBtnText: { fontSize: 20 },

    // Tap zone
    tapArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    ringWrapper: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
    glowDisc: {
      position: 'absolute',
      width: 230,
      height: 230,
      borderRadius: 115,
    },
    numberBlock: { alignItems: 'center', gap: 4 },
    rowLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, letterSpacing: 3 },
    rowNumber: { fontSize: 108, fontWeight: '800', lineHeight: 116, letterSpacing: -4 },
    rowOf: { fontSize: fontSize.lg },
    tapHint: { fontSize: fontSize.xs, letterSpacing: 1 },

    // Bottom
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    decrementBtn: {
      flex: 1,
      height: 64,
      borderRadius: radii.xl ?? 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    decrementText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    decrementSub: { fontSize: fontSize.xs },
    stitchPill: {
      width: 120,
      height: 64,
      borderRadius: radii.xl ?? 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    stitchLabel: { fontSize: 9, fontWeight: fontWeight.semibold, letterSpacing: 1.5 },
    stitchNum: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, lineHeight: 26 },
    stitchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    stitchDivider: { width: 1, height: 12 },
    stitchAction: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

    // Modal
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    modalSave: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    notesInput: {
      flex: 1, padding: spacing.lg, fontSize: fontSize.md,
      lineHeight: 24, textAlignVertical: 'top',
    },
  });
