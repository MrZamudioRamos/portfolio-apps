import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROP_IMAGES } from '../../src/data/cropImages';

/** Stitch's completed plant-identification result frame. */
export default function IdentifyPlantScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { cropId } = useLocalSearchParams<{ cropId?: string }>();
  const s = useMemo(() => makeStyles(spacing, fontSize, fontWeight, radii), [spacing, fontSize, fontWeight, radii]);
  const imageUri = CROP_IMAGES.albahaca;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Repetir foto" onPress={() => router.back()} style={s.headerBack}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[s.headerBackText, { color: colors.text }]}>Repetir foto</Text>
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Resultado</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Ayuda y consejos botánicos" style={s.headerAction} onPress={() => Alert.alert('Consejos para identificar', 'Fotografía hojas completas con luz natural, evita reflejos y centra la planta. Semillita usa esta imagen como orientación: confirma siempre el diagnóstico antes de tratarla.')}>
          <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={[s.resultImageFrame, { backgroundColor: colors.surfaceAlt }]}>
          <Image source={{ uri: imageUri }} resizeMode="cover" style={s.resultImage} />
          <View style={[s.confidenceBadge, { backgroundColor: colors.surface }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={[s.confidenceText, { color: colors.primary }]}>Coincidencia 98% de fiabilidad</Text>
          </View>
        </View>

        <View style={[s.identityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.identityKicker, { color: colors.primary }]}>Huerto Fresco</Text>
          <Text style={[s.category, { color: colors.textSecondary }]}>HIERBA AROMÁTICA MEDITERRÁNEA</Text>
          <Text style={[s.plantName, { color: colors.text }]}>Albahaca Limón</Text>
          <Text style={[s.botanical, { color: colors.textSecondary }]}>Ocimum citriodorum · Lamiáceas · Planta anual</Text>
          <View style={[s.levelPill, { backgroundColor: colors.primaryLight + '55' }]}>
            <Ionicons name="happy-outline" size={15} color={colors.primary} />
            <Text style={[s.levelText, { color: colors.primary }]}>Nivel: Principiante (Apta para balcón)</Text>
          </View>
        </View>

        <View style={[s.diagnosisCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.sectionHeading}>
            <Ionicons name="sparkles-outline" size={21} color={colors.primary} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Diagnóstico visual preliminar</Text>
          </View>
          <View style={s.diagnosisRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[s.diagnosisLabel, { color: colors.text }]}>Estado foliar excelente</Text>
              <Text style={[s.diagnosisText, { color: colors.textSecondary }]}>Hojas sanas y vigorosas, sin signos de araña roja ni pulgón. Tono verde homogéneo con aroma cítrico activo.</Text>
            </View>
          </View>
          <View style={s.diagnosisRow}>
            <Ionicons name="water-outline" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[s.diagnosisLabel, { color: colors.text }]}>Sustrato superficial</Text>
              <Text style={[s.diagnosisText, { color: colors.textSecondary }]}>Requiere comprobación táctil a 2 cm antes de aplicar agua. Evita regar si notas tierra húmeda al tacto.</Text>
            </View>
          </View>
          <View style={[s.semillaQuote, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.quoteText, { color: colors.textSecondary }]}>🌱 Semillita dice: <Text style={{ color: colors.text, fontWeight: fontWeight.semibold }}>«¡Tu albahaca va de maravilla! Huele a limón fresco y está lista para alegrar tus platos veraniegos.»</Text></Text>
          </View>
        </View>

        <View style={[s.requirementsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.requirementsTitle, { color: colors.text }]}>Requisitos clave para balcones en España</Text>
          <Requirement icon="partly-sunny-outline" title="Clima mediterráneo" text="Exposición Solar · Sol directo 4-6 horas de sol directo o semisombra luminosa en horas pico de calor estival." colors={colors} styles={s} />
          <Requirement icon="water-outline" title="Pauta de Riego Moderado" text="Regla preventiva de los 2 cm: introduce el dedo y riega solo si sale seco; nunca encharcar la maceta." colors={colors} styles={s} />
          <Requirement icon="flower-outline" title="Maceta recomendada 18 - 22 cm" text="Recipiente de barro o terracota con orificios de drenaje inferior para evitar la pudrición radicular." colors={colors} styles={s} />
        </View>

        <View style={[s.culinary, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="restaurant-outline" size={21} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.culinaryTitle, { color: colors.text }]}>Uso culinario idóneo</Text>
            <Text style={[s.culinaryText, { color: colors.textSecondary }]}>Ideal para ensaladas de tomate ibérico, pescados y pesto ligero.</Text>
          </View>
        </View>

        <View style={s.actions}>
          <Pressable accessibilityRole="button" style={[s.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push({ pathname: '/plant/new', params: { cropId: cropId ?? 'albahaca' } })}>
            <Ionicons name="add-circle-outline" size={20} color={colors.background} />
            <Text style={[s.primaryButtonText, { color: colors.background }]}>Añadir a Mi Huerto como nueva maceta</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[s.secondaryButton, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Ionicons name="search-outline" size={19} color={colors.primary} />
            <Text style={[s.secondaryButtonText, { color: colors.primary }]}>No es mi planta · Ver otras sugerencias</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Requirement({ icon, title, text, colors, styles: s }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string; colors: ReturnType<typeof useColors>; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.requirementRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={{ flex: 1 }}><Text style={[s.requirementTitle, { color: colors.text }]}>{title}</Text><Text style={[s.requirementText, { color: colors.textSecondary }]}>{text}</Text></View>
    </View>
  );
}

const makeStyles = (spacing: Record<string, number>, fontSize: Record<string, number>, fontWeight: Theme['fontWeight'], radii: Record<string, number>) => StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0EAD8' },
  headerBack: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 3 },
  headerBackText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  headerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  resultImageFrame: { height: 200, borderRadius: radii.xl, overflow: 'hidden', position: 'relative' },
  resultImage: { width: '100%', height: '100%' },
  confidenceBadge: { position: 'absolute', left: spacing.md, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radii.full },
  confidenceText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  identityCard: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, marginTop: spacing.md },
  identityKicker: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  category: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.5, marginTop: spacing.md },
  plantName: { fontSize: 26, fontWeight: fontWeight.bold, marginTop: 4 },
  botanical: { fontSize: fontSize.sm, marginTop: 3 },
  levelPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: spacing.sm, minHeight: 32, borderRadius: radii.full, marginTop: spacing.md },
  levelText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  diagnosisCard: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, marginTop: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  diagnosisRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
  diagnosisLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  diagnosisText: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 2 },
  semillaQuote: { padding: spacing.md, borderRadius: radii.md, marginTop: spacing.md },
  quoteText: { fontSize: fontSize.xs, lineHeight: 18 },
  requirementsCard: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, marginTop: spacing.md },
  requirementsTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  requirementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  requirementTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  requirementText: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 2 },
  culinary: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginTop: spacing.md },
  culinaryTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  culinaryText: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 2 },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  primaryButton: { minHeight: 52, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  primaryButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, textAlign: 'center' },
  secondaryButton: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  secondaryButtonText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
});
