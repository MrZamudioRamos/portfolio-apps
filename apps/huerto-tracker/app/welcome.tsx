import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.heroEmoji}>🌱</Text>
        <Text style={[s.title, { color: colors.text }]}>Huerto Tracker</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          Lleva el registro de tu huerto, planifica siembras y cosecha más y mejor.
        </Text>
      </View>

      {/* Features */}
      <View style={s.features}>
        {FEATURES.map((f) => (
          <View key={f.emoji} style={s.featureRow}>
            <Text style={s.featureEmoji}>{f.emoji}</Text>
            <View style={s.featureText}>
              <Text style={[s.featureTitle, { color: colors.text }]}>{f.title}</Text>
              <Text style={[s.featureDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={s.ctas}>
        <Pressable
          onPress={() => router.replace('/auth' as any)}
          style={({ pressed }) => [
            s.btnPrimary,
            { backgroundColor: colors.primary, ...shadows.md, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={s.btnPrimaryText}>Crear cuenta gratuita</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/onboarding')}
          style={({ pressed }) => [
            s.btnSecondary,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[s.btnSecondaryText, { color: colors.textSecondary }]}>
            Explorar sin cuenta
          </Text>
        </Pressable>

        <Text style={[s.disclaimer, { color: colors.textDisabled }]}>
          La cuenta gratuita incluye hasta 10 plantas y sincronización en la nube.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const FEATURES = [
  { emoji: '📅', title: 'Calendario de siembra', desc: 'Siembra en el momento óptimo para tu zona climática.' },
  { emoji: '📓', title: 'Diario del huerto', desc: 'Registra riegos, podas y cosechas con fotos.' },
  { emoji: '🔔', title: 'Recordatorios', desc: 'Nunca olvides regar o abonar tus plantas.' },
  { emoji: '☁️', title: 'Sincronización', desc: 'Tus datos seguros en la nube, en todos tus dispositivos.' },
];

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    hero: { alignItems: 'center', paddingTop: spacing['3xl'], paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'] },
    heroEmoji: { fontSize: 72, marginBottom: spacing.lg },
    title: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, textAlign: 'center', marginBottom: spacing.md },
    subtitle: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
    features: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.lg },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    featureEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
    featureText: { flex: 1 },
    featureTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    featureDesc: { fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 },
    ctas: { padding: spacing.xl, gap: spacing.md },
    btnPrimary: {
      height: 52,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimaryText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    btnSecondary: {
      height: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnSecondaryText: { fontSize: fontSize.md },
    disclaimer: { fontSize: fontSize.xs, textAlign: 'center', lineHeight: 16 },
  });
