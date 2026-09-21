import { useColors, useTheme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CropPreset = { id: string; name: string; icon: keyof typeof Ionicons.glyphMap; volume: number; hint: string };

const PRESETS: CropPreset[] = [
  { id: 'aromatic', name: 'Aromáticas', icon: 'leaf-outline', volume: 5, hint: 'Albahaca, menta, perejil' },
  { id: 'leafy', name: 'Hojas', icon: 'flower-outline', volume: 8, hint: 'Lechuga, rúcula, espinaca' },
  { id: 'fruiting', name: 'Tomates y frutos', icon: 'nutrition-outline', volume: 20, hint: 'Tomate, pimiento, berenjena' },
];

export default function VolumeCalculatorScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState('fruiting');
  const [volumeText, setVolumeText] = useState('20');
  const [saved, setSaved] = useState(false);
  const preset = PRESETS.find((item) => item.id === selected) ?? PRESETS[2];
  const volume = Math.max(1, Number(volumeText.replace(',', '.')) || preset.volume);
  const result = useMemo(() => ({
    substrate: Math.round(volume * 0.8 * 10) / 10,
    drainage: Math.round(volume * 0.2 * 10) / 10,
  }), [volume]);

  function choosePreset(item: CropPreset) {
    setSelected(item.id);
    setVolumeText(String(item.volume));
    setSaved(false);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver a Herramientas" onPress={() => router.back()} style={styles.headerAction}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[styles.headerBack, { color: colors.text }]}>Herramientas</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Calculadora</Text>
        <View style={{ width: 92 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.surface }]}><Ionicons name="calculator-outline" size={27} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>LITROS & DRENAJE</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Mezcla sin adivinar</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>Calcula el sustrato y la perlita que necesita tu maceta para que las raíces respiren.</Text>
          </View>
        </View>

        <Text style={[styles.section, { color: colors.textSecondary }]}>¿QUÉ VAS A PLANTAR?</Text>
        <View style={styles.presetGrid}>
          {PRESETS.map((item) => {
            const active = item.id === selected;
            return (
              <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => choosePreset(item)} style={[styles.preset, { backgroundColor: active ? colors.primary + '14' : colors.surface, borderColor: active ? colors.primary : colors.border }]}>
                <Ionicons name={item.icon} size={22} color={active ? colors.primary : colors.textSecondary} />
                <Text style={[styles.presetTitle, { color: active ? colors.primary : colors.text }]}>{item.name}</Text>
                <Text style={[styles.presetHint, { color: colors.textSecondary }]}>{item.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.section, { color: colors.textSecondary }]}>VOLUMEN DE LA MACETA</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="cube-outline" size={20} color={colors.primary} />
          <TextInput value={volumeText} onChangeText={(value) => { setVolumeText(value.replace(/[^0-9,]/g, '')); setSaved(false); }} keyboardType="decimal-pad" accessibilityLabel="Litros de la maceta" style={[styles.input, { color: colors.text }]} />
          <Text style={[styles.unit, { color: colors.textSecondary }]}>litros</Text>
        </View>

        <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.resultHeader}><View><Text style={[styles.resultEyebrow, { color: colors.textSecondary }]}>MEZCLA RECOMENDADA</Text><Text style={[styles.resultTitle, { color: colors.text }]}>{preset.name}</Text></View><Ionicons name="checkmark-circle" size={25} color={colors.primary} /></View>
          <View style={styles.resultGrid}>
            <View style={[styles.resultItem, { backgroundColor: colors.surfaceAlt }]}><Text style={[styles.resultNumber, { color: colors.primary }]}>{result.substrate} L</Text><Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Sustrato nutritivo</Text></View>
            <View style={[styles.resultItem, { backgroundColor: colors.accent + '2A' }]}><Text style={[styles.resultNumber, { color: colors.warning }]}>{result.drainage} L</Text><Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Perlita / drenaje</Text></View>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Reserva aproximadamente un 20% del recipiente para material de drenaje y no llenes hasta el borde.</Text>
        </View>

        <View style={[styles.rule, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Ionicons name="finger-print-outline" size={20} color={colors.primary} /><Text style={[styles.body, { color: colors.text }]}>Semillita recuerda: aunque la mezcla sea correcta, comprueba los 2 cm superiores antes de regar.</Text></View>

        <Pressable accessibilityRole="button" onPress={() => setSaved(true)} style={[styles.primary, { backgroundColor: colors.primary }]}><Ionicons name={saved ? 'checkmark-circle-outline' : 'save-outline'} size={19} color="#fff" /><Text style={styles.primaryText}>{saved ? 'Mezcla guardada' : 'Guardar esta mezcla'}</Text></Pressable>
      </ScrollView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { minHeight: 64, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 }, headerBack: { fontSize: 13, fontWeight: '800' }, headerTitle: { fontSize: 18, fontWeight: '900' }, content: { padding: 18, paddingBottom: 34, gap: 14 }, hero: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12 }, heroIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }, heroTitle: { fontSize: 21, fontWeight: '900', marginTop: 3 }, body: { fontSize: 13, lineHeight: 19, marginTop: 4 }, section: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, marginTop: 8 }, presetGrid: { gap: 8 }, preset: { minHeight: 66, padding: 11, borderWidth: 1, borderRadius: 14, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 9 }, presetTitle: { width: 100, fontSize: 13, fontWeight: '900' }, presetHint: { flex: 1, fontSize: 11 }, inputRow: { minHeight: 54, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }, input: { flex: 1, fontSize: 18, fontWeight: '900', paddingVertical: 0 }, unit: { fontSize: 13, fontWeight: '700' }, resultCard: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 }, resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, resultEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }, resultTitle: { fontSize: 17, fontWeight: '900', marginTop: 3 }, resultGrid: { flexDirection: 'row', gap: 8 }, resultItem: { flex: 1, padding: 12, borderRadius: 12 }, resultNumber: { fontSize: 21, fontWeight: '900' }, resultLabel: { fontSize: 11, marginTop: 3 }, rule: { borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: 'row', gap: 9 }, primary: { minHeight: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, primaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
