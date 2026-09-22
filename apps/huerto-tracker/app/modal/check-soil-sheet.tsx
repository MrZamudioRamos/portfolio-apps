import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recordCare } from '../../src/utils/careWrites';
import { useCollection } from '@portfolio/storage';
import type { Plant } from '../../src/models/plant';
import { goBackOr } from '../../src/utils/navigation';

/** Standalone Stitch action-sheet route; Hoy also reuses this care ritual inline. */
export default function CheckSoilSheet() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();
  const plants = useCollection<Plant>('plants');
  const plant = useMemo(() => plants.items.find((item) => item.id === plantId && !item.deletedAt), [plants.items, plantId]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<'moist' | 'dry' | null>(null);
  const s = useMemo(() => makeStyles(spacing, fontSize, fontWeight, radii), [spacing, fontSize, fontWeight, radii]);

  function chooseResult(kind: 'moist' | 'dry') {
    setError(null);
    setResult(kind);
  }

  async function commitResult(kind: 'moist' | 'watering') {
    if (!plantId || saving) return;
    setSaving(true);
    setError(null);
    try {
      await recordCare(
        plantId,
        kind,
        kind === 'moist' ? 'Sigue húmeda; no riego hoy.' : 'Suelo seco; riego registrado.',
        kind === 'watering' ? { liters: '0.4', method: 'hand' } : undefined,
      );
      goBackOr(router);
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'Confirm sowing first'
        ? 'Confirma primero la siembra de esta planta para empezar el cuidado diario.'
        : 'No se pudo guardar la comprobación. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.surface }]} edges={['top', 'bottom']}>
      <View style={s.grabber} />
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.kicker, { color: colors.primary }]}>CUIDADO PREVENTIVO</Text>
          <Text style={[s.title, { color: colors.text }]}>Comprobar sustrato</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>{plant?.name ?? 'Tu planta seleccionada'} · Comprobación de hoy</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => goBackOr(router)} style={s.close}>
          <Ionicons name="close" size={21} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={[s.instruction, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={[s.illustration, { backgroundColor: colors.primaryLight + '66' }]}>
          <Ionicons name="finger-print-outline" size={38} color={colors.primary} />
        </View>
        <Text style={[s.instructionTitle, { color: colors.text }]}>Toca la tierra a 2 cm</Text>
        <Text style={[s.instructionText, { color: colors.textSecondary }]}>Introduce el dedo índice hasta el segundo nudillo. La superficie seca puede engañarte: decide por la humedad que notas dentro.</Text>
      </View>

      <View style={s.options}>
        <Text style={[s.question, { color: colors.text }]}>¿Cómo notas el sustrato?</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: result === 'moist' }} disabled={!plantId || saving} style={[s.option, result === 'moist' && s.optionSelected, { backgroundColor: colors.primaryLight + '55', borderColor: colors.primary + '66', opacity: !plantId || saving ? 0.55 : 1 }]} onPress={() => chooseResult('moist')}>
          <View style={[s.optionIcon, { backgroundColor: colors.primary }]}><Ionicons name="checkmark" size={20} color={colors.background} /></View>
          <View style={{ flex: 1 }}><Text style={[s.optionTitle, { color: colors.text }]}>Sigue húmeda</Text><Text style={[s.optionText, { color: colors.textSecondary }]}>Perfecto. Hoy no riegues y protege las raíces.</Text></View>
          <Ionicons name="chevron-forward" size={19} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: result === 'dry' }} disabled={!plantId || saving} style={[s.option, result === 'dry' && s.optionSelected, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '66', opacity: !plantId || saving ? 0.55 : 1 }]} onPress={() => chooseResult('dry')}>
          <View style={[s.optionIcon, { backgroundColor: colors.warning }]}><Ionicons name="water-outline" size={20} color={colors.background} /></View>
          <View style={{ flex: 1 }}><Text style={[s.optionTitle, { color: colors.text }]}>Está seca</Text><Text style={[s.optionText, { color: colors.textSecondary }]}>Registra un riego suave y con drenaje.</Text></View>
          <Ionicons name="chevron-forward" size={19} color={colors.warning} />
        </Pressable>
      </View>
      {result === 'moist' && <View style={[s.resultCard, { backgroundColor: colors.primaryLight + '55', borderColor: colors.primary + '55' }]}><Ionicons name="checkmark-circle" size={24} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[s.resultTitle, { color: colors.text }]}>¡Perfecto! No regar hoy</Text><Text style={[s.resultText, { color: colors.textSecondary }]}>La tierra conserva humedad suficiente para proteger las raíces.</Text></View><Pressable accessibilityRole="button" disabled={saving} onPress={() => void commitResult('moist')} style={[s.resultButton, { backgroundColor: colors.primary }]}><Text style={s.resultButtonText}>Posponer riego hasta mañana</Text></Pressable></View>}
      {result === 'dry' && <View style={[s.resultCard, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '66' }]}><Ionicons name="water-outline" size={24} color={colors.warning} /><View style={{ flex: 1 }}><Text style={[s.resultTitle, { color: colors.text }]}>Suelo seco</Text><Text style={[s.resultText, { color: colors.textSecondary }]}>Riega despacio al borde y deja que el exceso salga por el drenaje.</Text></View><Pressable accessibilityRole="button" disabled={saving} onPress={() => void commitResult('watering')} style={[s.resultButton, { backgroundColor: colors.warning }]}><Text style={s.resultButtonText}>Registrar riego · 400 ml</Text></Pressable></View>}
      {saving && <ActivityIndicator color={colors.primary} accessibilityLabel="Guardando comprobación" />}
      {error && <Text accessibilityRole="alert" style={[s.error, { color: colors.error }]}>{error}</Text>}
      {!plantId && <Text style={[s.error, { color: colors.textSecondary }]}>Abre esta prueba desde una planta para guardar el resultado.</Text>}
      <Pressable accessibilityRole="button" onPress={() => goBackOr(router)} style={s.cancel}><Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancelar</Text></Pressable>
    </SafeAreaView>
  );
}

const makeStyles = (spacing: Record<string, number>, fontSize: Record<string, number>, fontWeight: Theme['fontWeight'], radii: Record<string, number>) => StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#C7D3C6', marginTop: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.lg },
  kicker: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.7 },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 3 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  instruction: { alignItems: 'center', borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, textAlign: 'center' },
  illustration: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  instructionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
  instructionText: { fontSize: fontSize.sm, lineHeight: 20, textAlign: 'center', marginTop: spacing.xs },
  options: { gap: spacing.sm, marginTop: spacing.xl },
  question: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  option: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md },
  optionSelected: { borderWidth: 2 },
  optionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  optionText: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 2 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  cancelText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  error: { textAlign: 'center', fontSize: fontSize.sm, lineHeight: 19 },
  resultCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
  resultTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  resultText: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 3 },
  resultButton: { minHeight: 46, borderRadius: radii.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', width: '100%' },
  resultButtonText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
