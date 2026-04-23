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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  hapticComplete,
  hapticDecrement,
  hapticMilestone,
  hapticReset,
  hapticTap,
} from '../../src/haptics';
import { CRAFT_CONFIG, type Project } from '../../src/models/project';

export default function CounterScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
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
  const [celebrated, setCelebrated] = useState(false);

  // Animation for the row number on tap
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Track session start
  const sessionStartRow = useRef(project?.currentRow ?? 0);

  useEffect(() => {
    if (project) {
      setCurrentRow(project.currentRow);
      setStitchCount(project.stitchCount);
      setNoteText(project.notes[project.currentRow] ?? '');
      sessionStartRow.current = project.currentRow;
    }
  }, [project?.id]);

  // Persist changes debounced
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveProject = useCallback(
    (row: number, stitch: number) => {
      if (!project) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        const now = new Date().toISOString();
        const rowsInSession = row - sessionStartRow.current;
        const sessions =
          rowsInSession > 0
            ? [
                ...project.sessions,
                { date: now.split('T')[0], rowsCompleted: rowsInSession },
              ]
            : project.sessions;
        projects.update(project.id, {
          currentRow: row,
          stitchCount: stitch,
          lastUsedAt: now,
          sessions,
        });
      }, 500);
    },
    [project, projects]
  );

  function animateTap() {
    scaleAnim.setValue(0.92);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }

  function flashScreen() {
    flashAnim.setValue(0.25);
    Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
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

    if (isComplete && !celebrated) {
      setCelebrated(true);
      flashScreen();
      await hapticComplete();
      Alert.alert(
        t('counter.completed_title'),
        t('counter.completed_desc', { total }),
        [{ text: '🎉', style: 'default' }]
      );
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
    const newStitch = stitchCount + 1;
    setStitchCount(newStitch);
    await hapticTap();
    saveProject(currentRow, newStitch);
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
        text: t('counter.reset_yes'),
        style: 'destructive',
        onPress: async () => {
          setCurrentRow(0);
          setStitchCount(0);
          setCelebrated(false);
          await hapticReset();
          saveProject(0, 0);
        },
      },
    ]);
  }

  function saveNote() {
    if (!project) return;
    const updated = { ...project.notes };
    if (noteText.trim()) {
      updated[currentRow] = noteText.trim();
    } else {
      delete updated[currentRow];
    }
    projects.update(project.id, { notes: updated });
    setShowNotes(false);
  }

  const total = project?.totalRows ?? null;
  const progress = total ? Math.min(currentRow / total, 1) : null;
  const hasNote = !!(project?.notes[currentRow]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (!project) return null;

  const craft = CRAFT_CONFIG[project.craftType];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Flash overlay for milestone/complete */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary, opacity: flashAnim }]}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Text style={[s.backText, { color: colors.primary }]}>←</Text>
        </Pressable>
        <View style={s.projectMeta}>
          <Text style={s.craftEmoji}>{craft.emoji}</Text>
          <Text style={[s.projectName, { color: colors.text }]} numberOfLines={1}>
            {project.name}
          </Text>
        </View>
        <View style={s.topActions}>
          {isPro && (
            <Pressable
              onPress={() => setShowNotes(true)}
              hitSlop={12}
              style={[s.noteBtn, hasNote && { backgroundColor: colors.primary + '22' }]}
            >
              <Text style={{ fontSize: 18 }}>{hasNote ? '📝' : '✏️'}</Text>
            </Pressable>
          )}
          <Pressable onPress={confirmReset} hitSlop={12}>
            <Text style={{ fontSize: 18 }}>↺</Text>
          </Pressable>
        </View>
      </View>

      {/* Progress bar */}
      {progress !== null && (
        <View style={[s.progressBg, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
      )}

      {/* ── TAP ANYWHERE — the whole area is the button ── */}
      <Pressable
        onPress={increment}
        style={s.tapArea}
        android_ripple={{ color: colors.primary + '22', borderless: true }}
      >
        <View style={s.counterCenter}>
          <Text style={[s.rowLabel, { color: colors.textSecondary }]}>{t('counter.row')}</Text>
          <Animated.Text
            style={[s.rowNumber, { color: colors.primary, transform: [{ scale: scaleAnim }] }]}
          >
            {currentRow}
          </Animated.Text>
          {total && (
            <Text style={[s.rowTotal, { color: colors.textSecondary }]}>
              {t('projects.of')} {total}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Bottom controls */}
      <View style={[s.bottomBar, { borderTopColor: colors.border }]}>
        {/* Decrement row */}
        <Pressable
          onPress={decrement}
          disabled={currentRow === 0}
          style={({ pressed }) => [
            s.controlBtn,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed || currentRow === 0 ? 0.4 : 1 },
          ]}
        >
          <Text style={[s.controlBtnText, { color: colors.text }]}>−1 {t('counter.row')}</Text>
        </Pressable>

        {/* Stitch counter */}
        <View style={[s.stitchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.stitchLabel, { color: colors.textSecondary }]}>{t('counter.stitch')}</Text>
          <Text style={[s.stitchCount, { color: colors.text }]}>{stitchCount}</Text>
          <View style={s.stitchButtons}>
            <Pressable
              onPress={resetStitch}
              hitSlop={6}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[s.stitchBtnText, { color: colors.textSecondary }]}>↺</Text>
            </Pressable>
            <Pressable
              onPress={incrementStitch}
              hitSlop={6}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[s.stitchBtnText, { color: colors.primary }]}>+1</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Notes modal (Pro) */}
      <Modal visible={showNotes} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {t('counter.notes_label')} — {t('counter.row')} {currentRow}
            </Text>
            <Pressable onPress={saveNote}>
              <Text style={[s.modalSave, { color: colors.primary }]}>{t('common.save')}</Text>
            </Pressable>
          </View>
          <TextInput
            style={[s.notesInput, { color: colors.text, borderColor: colors.border }]}
            placeholder={t('counter.notes_placeholder', { row: currentRow })}
            placeholderTextColor={colors.textDisabled}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            autoFocus
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
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backBtn: { paddingRight: spacing.md },
    backText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    projectMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    craftEmoji: { fontSize: 20 },
    projectName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    noteBtn: { padding: 4, borderRadius: radii.sm },
    progressBg: { height: 3, marginHorizontal: spacing.lg, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    // The entire center area is tappable
    tapArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterCenter: { alignItems: 'center', gap: spacing.sm },
    rowLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, letterSpacing: 2, textTransform: 'uppercase' },
    rowNumber: {
      fontSize: 120,
      fontWeight: fontWeight.bold,
      lineHeight: 130,
      textAlign: 'center',
    },
    rowTotal: { fontSize: fontSize.xl, fontWeight: fontWeight.regular },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    controlBtn: {
      flex: 1,
      height: 52,
      borderRadius: radii.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    stitchBox: {
      width: 110,
      height: 80,
      borderRadius: radii.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    stitchLabel: { fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
    stitchCount: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    stitchButtons: { flexDirection: 'row', gap: spacing.lg },
    stitchBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    modalSave: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    notesInput: {
      flex: 1,
      padding: spacing.lg,
      fontSize: fontSize.md,
      lineHeight: 24,
      textAlignVertical: 'top',
      borderTopWidth: 0,
    },
  });
