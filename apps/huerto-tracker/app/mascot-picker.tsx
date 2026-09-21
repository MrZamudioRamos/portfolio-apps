import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@portfolio/ui';
import { SemillitaBug, type SemillitaPose } from '../src/components/SemillitaBug';

type MascotId = 'hojita' | 'semillin' | 'mariquita' | 'lombri';

const HOJITA_IMAGE = require('../assets/mascot-hojita-v2.png');
const MARIQUITA_IMAGE = require('../assets/mascot-mariquita-v2.png');
const LOMBRI_IMAGE = require('../assets/mascot-lombri-v2.png');

const MASCOTS: Array<{
  id: MascotId;
  name: string;
  subtitle: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  pose: SemillitaPose;
  imageSource?: ImageSourcePropType;
}> = [
  { id: 'hojita', name: 'Hojita', subtitle: 'Bichito hoja redondeado', detail: 'Una guía suave para el cuidado diario.', icon: 'leaf', tint: '#B9E8A2', pose: 'idle', imageSource: HOJITA_IMAGE },
  { id: 'semillin', name: 'Semillín', subtitle: 'Brote con personalidad', detail: 'La semilla dorada que representa el comienzo de tu huerto.', icon: 'sparkles', tint: '#FFE2A0', pose: 'wave' },
  { id: 'mariquita', name: 'Mariquita Flora', subtitle: 'Bio-protectora del huerto', detail: 'Una compañera atenta para detectar cambios en tus plantas.', icon: 'bug', tint: '#FFD1C7', pose: 'point', imageSource: MARIQUITA_IMAGE },
  { id: 'lombri', name: 'Lombri', subtitle: 'Amigo del sustrato', detail: 'Un recordatorio simpático de cuidar la tierra y las raíces.', icon: 'ellipse', tint: '#F4C5A7', pose: 'worried', imageSource: LOMBRI_IMAGE },
];

function MascotAvatar({ id, pose, size }: { id: MascotId; pose: SemillitaPose; size: number }) {
  if (id === 'semillin') return <SemillitaBug pose={pose} size={size} />;
  const mascot = MASCOTS.find((item) => item.id === id);
  return mascot?.imageSource ? <Image source={mascot.imageSource} resizeMode="contain" style={{ width: size * 1.15, height: size * 1.15 }} /> : null;
}

export default function MascotPickerScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selected, setSelected] = useState<MascotId>('semillin');
  const [confirmed, setConfirmed] = useState(false);

  async function confirmMascot() {
    await AsyncStorage.setItem('@portfolio/mascot/selected', selected).catch(() => {});
    setConfirmed(true);
    Alert.alert('Mascota seleccionada', `${MASCOTS.find((mascot) => mascot.id === selected)?.name} será tu guía de Semilla.`);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver a Ajustes" style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Ajustes</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mascota Oficial</Text>
        <Pressable onPress={() => Alert.alert('Guía de estilo', 'La mascota debe ser legible entre 32 y 64 pt, sin texto integrado y con estados que puedan animarse en Expo.')} accessibilityRole="button" accessibilityLabel="Guía de estilo" style={styles.infoButton}>
          <Ionicons name="color-palette-outline" size={21} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}><Ionicons name="leaf" size={23} color={colors.primary} /></View>
          <Text style={[styles.title, { color: colors.text }]}>Elige el embajador de Semilla</Text>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>Cuatro propuestas botánicas creadas para reconocerse a tamaño pequeño y acompañarte en cada diagnóstico.</Text>
        </View>

        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>4 PROPUESTAS BOTÁNICAS</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>Toca una para probarla</Text>

        <View style={styles.grid}>
          {MASCOTS.map((mascot) => {
            const active = mascot.id === selected;
            return (
              <Pressable
                key={mascot.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Elegir ${mascot.name}`}
                onPress={() => setSelected(mascot.id)}
                style={({ pressed }) => [styles.mascotCard, { backgroundColor: colors.surface, borderColor: active ? colors.primary : colors.border }, active && { borderWidth: 2 }, pressed && styles.pressed]}
              >
                <View style={[styles.mascotVisual, { backgroundColor: mascot.tint }]}>
                  {mascot.id === 'semillin' ? <SemillitaBug pose={mascot.pose} size={104} /> : mascot.imageSource ? <Image source={mascot.imageSource} resizeMode="contain" style={styles.mascotImage} /> : <Ionicons name={mascot.icon} size={58} color={mascot.id === 'mariquita' ? '#D75C4A' : colors.primaryDark} />}
                  {active && <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}><Ionicons name="checkmark" size={13} color="#fff" /></View>}
                </View>
                <Text style={[styles.cardKicker, { color: colors.primary }]}>{active ? 'SELECCIONADA' : 'PROPUESTA'}</Text>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{mascot.name}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{mascot.subtitle}</Text>
                <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>{mascot.detail}</Text>
                <View style={styles.poseRow}>
                  {(['idle', 'celebrate', 'point', 'worried'] as SemillitaPose[]).map((pose) => <View key={pose} style={[styles.poseDot, { backgroundColor: pose === mascot.pose && active ? colors.primary : colors.surfaceAlt, borderColor: colors.border }]}><Ionicons name={pose === 'worried' ? 'sad-outline' : pose === 'point' ? 'hand-left-outline' : pose === 'celebrate' ? 'sparkles-outline' : 'happy-outline'} size={13} color={pose === mascot.pose && active ? '#fff' : colors.textSecondary} /></View>)}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Previsualización en pantallas reales</Text>
          <Text style={[styles.previewCaption, { color: colors.textSecondary }]}>Mostrando: {MASCOTS.find((mascot) => mascot.id === selected)?.name}</Text>
          <View style={[styles.previewRow, { borderTopColor: colors.border }]}>
            <View style={[styles.previewIcon, { backgroundColor: colors.surfaceAlt }]}><Ionicons name="phone-portrait-outline" size={18} color={colors.primary} /></View>
            <View style={styles.previewCopy}><Text style={[styles.previewTitle, { color: colors.text }]}>En pantalla Welcome</Text><Text style={[styles.previewBody, { color: colors.textSecondary }]}>Héroe de bienvenida y saludo inicial.</Text></View>
            <MascotAvatar id={selected} pose="wave" size={54} />
          </View>
          <View style={[styles.previewRow, { borderTopColor: colors.border }]}>
            <View style={[styles.previewIcon, { backgroundColor: colors.surfaceAlt }]}><Ionicons name="calendar-outline" size={18} color={colors.primary} /></View>
            <View style={styles.previewCopy}><Text style={[styles.previewTitle, { color: colors.text }]}>En el consejo de Hoy</Text><Text style={[styles.previewBody, { color: colors.textSecondary }]}>Avatar inline junto a la regla de 2 cm.</Text></View>
            <MascotAvatar id={selected} pose="point" size={42} />
          </View>
        </View>

        <Pressable onPress={() => void confirmMascot()} accessibilityRole="button" accessibilityLabel={`Elegir ${MASCOTS.find((mascot) => mascot.id === selected)?.name} como mascota oficial`} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.primaryText}>Elegir {MASCOTS.find((mascot) => mascot.id === selected)?.name} como Mascota Oficial</Text>
        </Pressable>
        {confirmed && <View style={[styles.confirmed, { backgroundColor: colors.primary + '16', borderColor: colors.primary + '55' }]}><Ionicons name="checkmark-circle" size={18} color={colors.primary} /><Text style={[styles.confirmedText, { color: colors.primaryDark }]}>Mascota oficial guardada en este dispositivo.</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18 },
  back: { minWidth: 86, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 14, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  infoButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 30 },
  hero: { borderRadius: 18, borderWidth: 1, padding: 18, alignItems: 'center' },
  heroIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 23, fontWeight: '900', textAlign: 'center' },
  intro: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 24 },
  hint: { fontSize: 12, marginTop: 4, marginBottom: 10 },
  grid: { gap: 12 },
  mascotCard: { borderRadius: 16, borderWidth: 1, padding: 12 },
  mascotVisual: { height: 142, borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mascotImage: { width: '78%', height: '92%' },
  selectedBadge: { position: 'absolute', top: 9, right: 9, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginTop: 12 },
  cardTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  cardSubtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  cardDetail: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  poseRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
  poseDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  preview: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  previewCaption: { fontSize: 12, marginTop: 4 },
  previewRow: { minHeight: 72, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewCopy: { flex: 1 },
  previewTitle: { fontSize: 13, fontWeight: '800' },
  previewBody: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  primary: { minHeight: 54, borderRadius: 16, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  confirmed: { minHeight: 46, borderRadius: 12, borderWidth: 1, marginTop: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  confirmedText: { fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
