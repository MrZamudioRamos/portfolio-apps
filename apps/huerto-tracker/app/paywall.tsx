import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRO_FEATURES = [
  { emoji: '🏡', text: 'Huertos ilimitados (ahora sólo 1)' },
  { emoji: '🌱', text: 'Plantas sin límite (plan gratuito: 5)' },
  { emoji: '📅', text: 'Calendario de siembra completo con alertas' },
  { emoji: '🤝', text: 'Guía de asociaciones de cultivos' },
  { emoji: '📊', text: 'Gráficos de cosecha y productividad' },
  { emoji: '📄', text: 'Exportar diario en PDF' },
  { emoji: '🔔', text: 'Recordatorios de riego ilimitados' },
  { emoji: '☁️', text: 'Copia de seguridad en la nube' },
];

const PLANS = [
  { id: 'monthly', label: 'Mensual', price: '2,99 €/mes', sub: 'Cancela cuando quieras', highlight: false },
  { id: 'yearly', label: 'Anual', price: '19,99 €/año', sub: 'Ahorra un 44%', highlight: true },
];

export default function PaywallScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Close button */}
      <Pressable onPress={() => router.back()} style={s.closeBtn} hitSlop={16}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>🌻</Text>
          <Text style={[s.heroTitle, { color: colors.text }]}>
            Haz crecer tu huerto{'\n'}sin límites
          </Text>
          <Text style={[s.heroSub, { color: colors.textSecondary }]}>
            Desbloquea todo lo que necesitas para convertirte en un auténtico huertero.
          </Text>
        </View>

        {/* Features list */}
        <View style={s.featuresCard}>
          {PRO_FEATURES.map((feat, i) => (
            <View key={i} style={[s.featureRow, i < PRO_FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={[s.featureIconBox, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={{ fontSize: 18 }}>{feat.emoji}</Text>
              </View>
              <Text style={[s.featureText, { color: colors.text }]}>{feat.text}</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </View>
          ))}
        </View>

        {/* Pricing plans */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>ELIGE TU PLAN</Text>
        <View style={s.plansRow}>
          {PLANS.map((plan) => (
            <Pressable
              key={plan.id}
              style={[
                s.planCard,
                {
                  backgroundColor: plan.highlight ? colors.primary : colors.surface,
                  borderColor: plan.highlight ? colors.primary : colors.border,
                  ...shadows.md,
                },
              ]}
            >
              {plan.highlight && (
                <View style={[s.popularBadge, { backgroundColor: '#fff' }]}>
                  <Text style={[s.popularText, { color: colors.primary }]}>⭐ Más popular</Text>
                </View>
              )}
              <Text style={[s.planLabel, { color: plan.highlight ? '#fff' : colors.textSecondary }]}>
                {plan.label}
              </Text>
              <Text style={[s.planPrice, { color: plan.highlight ? '#fff' : colors.text }]}>
                {plan.price}
              </Text>
              <Text style={[s.planSub, { color: plan.highlight ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                {plan.sub}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* CTA */}
        <Button
          title="Empezar prueba gratis 7 días"
          onPress={() => Alert.alert('Próximamente', 'La integración con RevenueCat se configurará en el siguiente paso.')}
          size="lg"
          style={{ marginTop: spacing.xl }}
        />
        <Text style={[s.trialNote, { color: colors.textSecondary }]}>
          Cancela en cualquier momento. Sin compromisos.
        </Text>

        {/* Restore */}
        <Pressable
          onPress={() => Alert.alert('Restaurar compras', 'Buscando compras anteriores…')}
          style={s.restoreBtn}
        >
          <Text style={[s.restoreText, { color: colors.textSecondary }]}>Restaurar compras</Text>
        </Pressable>

        {/* Legal */}
        <Text style={[s.legal, { color: colors.textDisabled }]}>
          El pago se cargará en tu cuenta de App Store. La suscripción se renueva automáticamente salvo que se cancele al menos 24 horas antes del final del período actual.
        </Text>
      </ScrollView>
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
    closeBtn: {
      position: 'absolute',
      top: 52,
      right: spacing.xl,
      zIndex: 10,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: spacing.xl },
    hero: { alignItems: 'center', paddingVertical: spacing['2xl'] },
    heroEmoji: { fontSize: 64, marginBottom: spacing.lg },
    heroTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, textAlign: 'center', lineHeight: 34, marginBottom: spacing.md },
    heroSub: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
    featuresCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: spacing.xl,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    featureIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: { flex: 1, fontSize: fontSize.md },
    sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8, marginBottom: spacing.md },
    plansRow: { flexDirection: 'row', gap: spacing.md },
    planCard: {
      flex: 1,
      borderRadius: radii.lg,
      borderWidth: 2,
      padding: spacing.lg,
      alignItems: 'center',
      overflow: 'hidden',
    },
    popularBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      marginBottom: spacing.sm,
    },
    popularText: { fontSize: 11, fontWeight: fontWeight.bold },
    planLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.5, marginBottom: 4 },
    planPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
    planSub: { fontSize: fontSize.xs, marginTop: 4, textAlign: 'center' },
    trialNote: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.md },
    restoreBtn: { alignItems: 'center', padding: spacing.lg, marginTop: spacing.sm },
    restoreText: { fontSize: fontSize.sm },
    legal: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: spacing.lg },
  });
