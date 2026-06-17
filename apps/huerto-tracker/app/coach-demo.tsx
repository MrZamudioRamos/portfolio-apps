import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors, useTheme } from '@portfolio/ui';
import { CoachBubble } from '../src/components/CoachBubble';
import type { MascotPose } from '../src/components/Mascot';

// PROTOTYPE — hardcoded ES to judge the feel of the Semillita coach.
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
  const isLast = step === SCRIPT.length - 1;

  const finish = () => router.back();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[s.body, { padding: spacing.xl }]}>
        <CoachBubble
          text={current.text}
          pose={current.pose}
          step={step}
          total={SCRIPT.length}
          onNext={() => (isLast ? finish() : setStep((x) => x + 1))}
          nextLabel={isLast ? 'Empezar' : 'Siguiente'}
          onSkip={isLast ? undefined : finish}
          skipLabel="Saltar"
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, justifyContent: 'flex-end' },
});
