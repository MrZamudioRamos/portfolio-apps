import { useOnboarding } from '@portfolio/shared';
import { useColors, useTheme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SemillitaBug } from '../src/components/SemillitaBug';

const features = [
  {
    icon: 'water' as const,
    iconColor: '#087FC4',
    iconBackground: '#DDF3FF',
    title: 'Diagnóstico antes de regar',
    body: 'Prueba infalible de 2 cm en sustrato',
  },
  {
    icon: 'thermometer' as const,
    iconColor: '#4A9A00',
    iconBackground: '#D9FF9B',
    title: 'Aprende según tu clima en España',
    body: 'Mediterráneo, Continental, Cantábrico',
  },
  {
    icon: 'sunny' as const,
    iconColor: '#F28C00',
    iconBackground: '#FFF4B8',
    title: 'Mapeo de sol y sombras',
    body: 'Orientación sur, este o semisombra',
  },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const { fontWeight } = useTheme();
  const router = useRouter();
  const { completed } = useOnboarding('huerto');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.page}>
          <View style={[styles.dotField, { pointerEvents: 'none' }]}>
            {Array.from({ length: 36 }, (_, index) => (
              <View key={index} style={[styles.dot, { left: (index % 6) * 22, top: Math.floor(index / 6) * 22 }]} />
            ))}
          </View>

          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={[styles.brand, { fontWeight: fontWeight.bold }]}>SEMILLA · TU PRIMER HUERTO</Text>
          </View>

            <View style={styles.heroVisual}>
            <View style={styles.heroRing} />
            <View style={styles.mascotStage}>
              <SemillitaBug pose="wave" size={112} />
            </View>
          </View>

          <View style={styles.copyBlock}>
            <Text accessibilityRole="header" style={[styles.headline, { fontWeight: fontWeight.bold }]}>
              Cultiva sin miedo,{ '\n' }
              <Text style={styles.headlineAccent}>siente la tierra</Text>
            </Text>
            <Text style={styles.subtitle}>
              Tu huerto urbano en casa, paso a paso y sin{ '\n' }ahogar tus plantas
            </Text>
          </View>

          <View style={styles.featureList}>
            {features.map((feature) => (
              <View key={feature.title} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: feature.iconBackground }]}>
                  <Ionicons name={feature.icon} size={21} color={feature.iconColor} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={[styles.featureTitle, { fontWeight: fontWeight.bold }]}>{feature.title}</Text>
                  <Text style={styles.featureBody}>{feature.body}</Text>
                </View>
                <Ionicons name="checkmark-circle-outline" size={21} color="#B7C7B7" />
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Empezar mi huerto"
              onPress={() => router.replace(completed ? '/(tabs)' : '/onboarding')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={[styles.primaryButtonText, { fontWeight: fontWeight.bold }]}>
                Empezar mi huerto
              </Text>
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ya tengo cuenta. Iniciar sesión"
              onPress={() => router.push('/auth')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={[styles.secondaryButtonText, { fontWeight: fontWeight.bold }]}>Ya tengo cuenta · Iniciar sesión</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Ionicons name="business-outline" size={16} color="#4E7651" />
            <Text style={styles.footerText}>Adaptado a terrazas, balcones y ventanas en España</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    backgroundColor: '#EDFFE9',
  },
  dotField: {
    position: 'absolute',
    top: 18,
    left: 16,
    width: 132,
    height: 132,
    opacity: 0.24,
  },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#6E9B6D',
  },
  brandRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  brandDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#007A28' },
  brand: { color: '#006D25', fontSize: 13, letterSpacing: 0.7 },
  heroVisual: {
    height: 228,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  heroRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#86F27F',
    backgroundColor: 'rgba(185, 255, 115, 0.2)',
  },
  mascotStage: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBlock: { alignItems: 'center', marginBottom: 22 },
  headline: {
    color: '#102313',
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  headlineAccent: {
    color: '#00842C',
    textDecorationLine: 'underline',
    textDecorationColor: '#A2F36E',
    textDecorationStyle: 'solid',
  },
  subtitle: { color: '#416148', fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 9 },
  featureList: { gap: 10, marginBottom: 24 },
  featureRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3EDE0',
    shadowColor: '#2B5D31',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  featureIcon: { width: 45, height: 45, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  featureCopy: { flex: 1, minWidth: 0 },
  featureTitle: { color: '#142317', fontSize: 15, lineHeight: 19 },
  featureBody: { color: '#58705A', fontSize: 12, lineHeight: 16, marginTop: 1 },
  actions: { gap: 11 },
  primaryButton: {
    minHeight: 64,
    paddingHorizontal: 22,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#007A25',
    shadowColor: '#00621D',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16 },
  secondaryButton: {
    minHeight: 55,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#CFDCCE',
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  secondaryButtonText: { color: '#007A25', fontSize: 15 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 17 },
  footerText: { color: '#4E7651', fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
