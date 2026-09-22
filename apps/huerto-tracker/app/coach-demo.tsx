import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors, useTheme } from '@portfolio/ui';
import { Mascot, type MascotPose } from '../src/components/Mascot';
import { goBackOr } from '../src/utils/navigation';

const SCRIPT: { text: string; pose: MascotPose }[] = [
  { text: '¡Hola! Soy Semillita 🌱 Voy a acompañarte para que tu huerto salga adelante.', pose: 'wave' },
  { text: 'Primero dime dónde cultivas. Con tu zona y el mes, te diré exactamente qué plantar.', pose: 'point' },
  { text: 'Cada planta tendrá su consejo: cuándo regar, cuándo trasplantar y cuándo cosechar.', pose: 'idle' },
  { text: '¿Una duda? Pregúntame lo que quieras cuando la tengas. ¡Vamos a sembrar! 🎉', pose: 'celebrate' },
];

export default function CoachDemoScreen() {
  const colors = useColors();
  const { spacing } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = SCRIPT[step];
  const last = step === SCRIPT.length - 1;
  return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}><View style={[styles.body, { padding: spacing.xl }]}><View style={styles.mascot}><Mascot pose={current.pose} size={150} /></View><View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.text, { color: colors.text }]}>{current.text}</Text><View style={styles.dots}>{SCRIPT.map((_, index) => <View key={index} style={[styles.dot, { backgroundColor: index === step ? colors.primary : colors.border }]} />)}</View><View style={styles.actions}><Pressable onPress={() => goBackOr(router, '/onboarding' as any)}><Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Saltar</Text></Pressable><Pressable onPress={() => last ? goBackOr(router, '/onboarding' as any) : setStep((value) => value + 1)} style={[styles.next, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{last ? 'Empezar' : 'Siguiente'}</Text></Pressable></View></View></View></SafeAreaView>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, body: { flex: 1, justifyContent: 'flex-end' }, mascot: { alignItems: 'center', marginBottom: 20 }, bubble: { borderWidth: 1, borderRadius: 24, padding: 20, gap: 18 }, text: { fontSize: 20, lineHeight: 28, fontWeight: '700', textAlign: 'center' }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 }, dot: { width: 8, height: 8, borderRadius: 4 }, actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, next: { minHeight: 46, borderRadius: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' } });
