import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Stitch's Medidor Solar frame. The real sensor can be connected later without
 * changing this composition; the visible screen is intentionally the approved
 * Stitch result state rather than the former multi-question wizard.
 */
export default function LightMeterScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const [calibrated, setCalibrated] = useState(true);
  const [saved, setSaved] = useState(false);
  const s = useMemo(() => makeStyles(spacing, fontSize, fontWeight, radii), [spacing, fontSize, fontWeight, radii]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mi Huerto" onPress={() => router.back()} style={s.headerButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[s.headerBack, { color: colors.text }]}>Mi Huerto</Text>
        </Pressable>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.text }]}>Medidor Solar</Text>
            <Text style={[s.status, { color: colors.primary }]}>{calibrated ? 'Sensor Activo' : 'Sensor calibrándose'}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Calibrar Sensor"
            onPress={() => setCalibrated(false)}
            style={[s.iconButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            <Ionicons name="options-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={[s.liveCard, { backgroundColor: colors.surface, borderColor: colors.primary + '55' }]}>
          <View style={s.liveTop}>
            <View style={[s.liveIcon, { backgroundColor: colors.accent + '55' }]}>
              <Ionicons name="compass-outline" size={22} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.liveKicker, { color: colors.textSecondary }]}>Orientación</Text>
              <Text style={[s.liveHeading, { color: colors.text }]}>Balcón: SURESTE (135° SE)</Text>
              <Text style={[s.liveNow, { color: colors.primary }]}>En Vivo</Text>
            </View>
          </View>
          <View style={s.luxRow}>
            <Ionicons name="sunny" size={24} color={colors.warning} />
            <Text style={[s.luxNumber, { color: colors.text }]}>42.500</Text>
            <Text style={[s.luxUnit, { color: colors.textSecondary }]}>Lux</Text>
          </View>
          <Text style={[s.sunLevel, { color: colors.text }]}>Sol Directo Intenso</Text>
          <Text style={[s.sunDescription, { color: colors.textSecondary }]}>Luz óptima para hortalizas de fruto (Tomates, Pimientos, Berenjenas)</Text>
          <View style={[s.estimate, { borderTopColor: colors.border }]}>
            <Ionicons name="time-outline" size={17} color={colors.primary} />
            <Text style={[s.estimateText, { color: colors.textSecondary }]}>Estimación solar hoy: <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>6,5 horas de sol directo</Text></Text>
          </View>
        </View>

        <Text style={[s.sectionTitle, { color: colors.text }]}>Ubicación recomendada</Text>
        <View style={[s.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.locationHeading}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={[s.locationTitle, { color: colors.text }]}>Balcón Español</Text>
          </View>
          <View style={[s.zone, { borderTopColor: colors.border }]}>
            <View style={[s.zoneIcon, { backgroundColor: colors.accent + '40' }]}><Ionicons name="sunny-outline" size={18} color={colors.warning} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.zoneTitle, { color: colors.text }]}>Zona Barandilla frontal</Text>
              <Text style={[s.zoneMeta, { color: colors.primary }]}>Sol pleno &gt;6h</Text>
              <Text style={[s.zoneDescription, { color: colors.textSecondary }]}>Lugar perfecto para macetas hondas de barro: ubica aquí tus <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>Tomates Cherry</Text> o <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>Romero</Text> para máxima floración.</Text>
            </View>
          </View>
          <View style={[s.zone, { borderTopColor: colors.border }]}>
            <View style={[s.zoneIcon, { backgroundColor: colors.primaryLight + '55' }]}><Ionicons name="cloud-outline" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.zoneTitle, { color: colors.text }]}>Zona Rincón o Muro lateral</Text>
              <Text style={[s.zoneMeta, { color: colors.textSecondary }]}>Semisombra</Text>
              <Text style={[s.zoneDescription, { color: colors.textSecondary }]}>Luz filtrada. Traslada aquí la <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>Albahaca Limón</Text> o <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>Menta</Text> para evitar quemaduras en las hojas en las horas centrales.</Text>
            </View>
          </View>
        </View>

        <View style={[s.ruleCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent + '88' }]}>
          <Ionicons name="water-outline" size={21} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.ruleTitle, { color: colors.text }]}>Regla de oro ante sol fuerte</Text>
            <Text style={[s.ruleText, { color: colors.textSecondary }]}>Con <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>40.000+ Lux</Text> aumenta la evaporación superficial, pero recuerda la regla de oro: introduce el dedo <Text style={{ color: colors.primary, fontWeight: fontWeight.bold }}>2 cm</Text> antes de regar; las macetas de barro retienen frescor en el fondo.</Text>
          </View>
        </View>

        <View style={[s.zenith, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.zenithLabel, { color: colors.textSecondary }]}>Cénit solar previsto:</Text>
          <Text style={[s.zenithTime, { color: colors.text }]}>14:15h</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Ver trayectoria solar" style={s.trajectoryButton} onPress={() => Alert.alert('Trayectoria solar', 'El sol alcanza su punto más alto a las 14:15. Mantén las plantas de fruto en la barandilla frontal y revisa las sombras a las 16:00.')}>
            <Text style={[s.trajectoryText, { color: colors.primary }]}>Ver trayectoria</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={s.actions}>
          <Pressable accessibilityRole="button" accessibilityState={{ checked: saved }} style={[s.primaryButton, { backgroundColor: colors.primary }]} onPress={() => setSaved(true)}>
            <Ionicons name="bookmark-outline" size={18} color={colors.background} />
            <Text style={[s.primaryButtonText, { color: colors.background }]}>{saved ? 'Medición guardada en Balcón Sur' : 'Guardar medición en Balcón Sur'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[s.outlineButton, { borderColor: colors.border }]} onPress={() => setCalibrated(true)}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={[s.outlineButtonText, { color: colors.primary }]}>Recalibrar sensor</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[s.outlineButton, { borderColor: colors.border }]} onPress={() => Alert.alert('Historial solar', saved ? 'Has guardado una medición hoy: 42.500 Lux · 6,5 horas estimadas.' : 'Todavía no hay mediciones guardadas. Guarda la lectura actual para empezar el historial.') }>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={[s.outlineButtonText, { color: colors.primary }]}>Historial solar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>,
) => StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBack: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  status: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 2 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radii.md },
  liveCard: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, marginBottom: spacing.xl },
  liveTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  liveIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  liveKicker: { fontSize: fontSize.xs },
  liveHeading: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: 2 },
  liveNow: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 3 },
  luxRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: spacing.lg },
  luxNumber: { fontSize: 34, fontWeight: fontWeight.bold, letterSpacing: -0.8 },
  luxUnit: { fontSize: fontSize.md },
  sunLevel: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: 3 },
  sunDescription: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 2 },
  estimate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, marginTop: spacing.md },
  estimateText: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  locationCard: { borderWidth: 1, borderRadius: radii.xl, overflow: 'hidden' },
  locationHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  locationTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  zone: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  zoneIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  zoneTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  zoneMeta: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginTop: 2 },
  zoneDescription: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 5 },
  ruleCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginTop: spacing.lg },
  ruleTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  ruleText: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 4 },
  zenith: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginTop: spacing.lg },
  zenithLabel: { fontSize: fontSize.xs },
  zenithTime: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  trajectoryButton: { marginLeft: 'auto', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  trajectoryText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  primaryButton: { minHeight: 52, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  outlineButton: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  outlineButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
