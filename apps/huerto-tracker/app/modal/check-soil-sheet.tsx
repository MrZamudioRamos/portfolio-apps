import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Standalone Stitch action-sheet route; Hoy also reuses this care ritual inline. */
export default function CheckSoilSheet() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(spacing, fontSize, fontWeight, radii), [spacing, fontSize, fontWeight, radii]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.surface }]} edges={['top', 'bottom']}>
      <View style={s.grabber} />
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.kicker, { color: colors.primary }]}>CUIDADO PREVENTIVO</Text>
          <Text style={[s.title, { color: colors.text }]}>Comprobar sustrato</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>Rábano · Maceta 5 L · Balcón Sur</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => router.back()} style={s.close}>
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
        <Pressable accessibilityRole="button" style={[s.option, { backgroundColor: colors.primaryLight + '55', borderColor: colors.primary + '66' }]} onPress={() => router.back()}>
          <View style={[s.optionIcon, { backgroundColor: colors.primary }]}><Ionicons name="checkmark" size={20} color={colors.background} /></View>
          <View style={{ flex: 1 }}><Text style={[s.optionTitle, { color: colors.text }]}>Sigue húmeda</Text><Text style={[s.optionText, { color: colors.textSecondary }]}>Perfecto. Hoy no riegues y protege las raíces.</Text></View>
          <Ionicons name="chevron-forward" size={19} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" style={[s.option, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '66' }]} onPress={() => router.back()}>
          <View style={[s.optionIcon, { backgroundColor: colors.warning }]}><Ionicons name="water-outline" size={20} color={colors.background} /></View>
          <View style={{ flex: 1 }}><Text style={[s.optionTitle, { color: colors.text }]}>Está seca</Text><Text style={[s.optionText, { color: colors.textSecondary }]}>Registra un riego suave y con drenaje.</Text></View>
          <Ionicons name="chevron-forward" size={19} color={colors.warning} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.cancel}><Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancelar</Text></Pressable>
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
  optionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  optionText: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 2 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  cancelText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
