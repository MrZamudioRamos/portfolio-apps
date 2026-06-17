import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CopilotProvider, CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
import { useColors } from '@portfolio/ui';
import { ScalePress } from '../src/components/ScalePress';
import { SemillitaTooltip } from '../src/components/SemillitaTooltip';

// SMOKE TEST — verify react-native-copilot installs, builds and runs the
// spotlight in Expo Go on our stack (RN 0.83 / React 19 / svg 15). Throwaway.
const WalkView = walkthroughable(View);

function SmokeInner() {
  const colors = useColors();
  const { start } = useCopilot();

  return (
    <View style={s.body}>
      <CopilotStep text="Esta es tu pantalla Hoy: qué hacer cada día." order={1} name="hoy">
        <WalkView style={[s.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>Card Hoy</Text>
        </WalkView>
      </CopilotStep>

      <CopilotStep text="Aquí ves qué sembrar este mes en tu zona." order={2} name="sembrar">
        <WalkView style={[s.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>Sembrar ahora</Text>
        </WalkView>
      </CopilotStep>

      <CopilotStep text="Pulsa + para añadir tu primera planta." order={3} name="fab">
        <WalkView style={[s.fab, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>
        </WalkView>
      </CopilotStep>

      <ScalePress onPress={() => start()} style={[s.startBtn, { backgroundColor: colors.primary }]}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Iniciar tour</Text>
      </ScalePress>
    </View>
  );
}

export default function CopilotSmokeScreen() {
  const colors = useColors();
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <CopilotProvider
        overlay="svg"
        animated
        backdropColor="rgba(0,0,0,0.75)"
        arrowColor={colors.surface}
        tooltipComponent={SemillitaTooltip}
        tooltipStyle={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, width: 300 }}
        stepNumberComponent={() => null}
      >
        <SmokeInner />
      </CopilotProvider>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, padding: 24, gap: 28, justifyContent: 'center' },
  box: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  startBtn: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
});
