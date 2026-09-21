import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TAB_BAR_BOTTOM_CLEARANCE } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Plant } from '../../src/models/plant';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';

type Tint = 'primary' | 'info' | 'water' | 'warning' | 'success' | 'secondary' | 'error';

interface ToolItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  eyebrow: string;
  route: string;
  tint: Tint;
  description: string;
  action: string;
}

function ToolsInner() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const plantCollection = useCollection<Plant>('plants');
  const { activeGarden } = useActiveGarden();
  const firstPlantId = useMemo(
    () => plantCollection.items.find((plant) => !plant.deletedAt && (!activeGarden?.id || plant.gardenId === activeGarden.id))?.id,
    [activeGarden?.id, plantCollection.items]
  );

  // Content and order match Stitch's "Herramientas de Semilla" frame.
  const tools: ToolItem[] = [
    { icon: 'sunny-outline', title: 'Medidor de Luz Solar', eyebrow: 'Sensor AR activo', route: '/light-meter', tint: 'warning', description: 'Mide con la cámara los luxes exactos de tu barandilla y calcula horas de sol directo.', action: 'Abrir sensor' },
    { icon: 'scan-outline', title: 'Identificador de Plantas y Plagas', eyebrow: 'IA Botánica', route: '/plant/scan', tint: 'primary', description: 'Reconoce especies o detecta hongos como oídio fotografiando las hojas.', action: 'Escanear ahora' },
    { icon: 'finger-print-outline', title: 'Diagnóstico Táctil de Sustrato', eyebrow: 'Prueba 2 cm', route: '/modal/check-soil-sheet', tint: 'water', description: 'Guía interactiva paso a paso para la prueba del dedo a 2 cm antes de aplicar agua.', action: 'Iniciar prueba' },
    { icon: 'partly-sunny-outline', title: 'Simulador de Sombras y Sol', eyebrow: 'Orientación Sur/Este', route: '/garden/map', tint: 'secondary', description: 'Descubre en qué horas tu pared hace sombra según la estación.', action: 'Simular fachada' },
    { icon: 'calculator-outline', title: 'Calculadora de Volumen de Maceta y Sustrato', eyebrow: 'Litros & Drenaje', route: '/volume-calculator', tint: 'success', description: 'Calcula cuántos litros de tierra y drenaje de perlita necesita cada hortaliza.', action: 'Calcular mezcla' },
    { icon: 'water-outline', title: 'Modo Vacaciones y Ausencia', eyebrow: 'Autorriego', route: '/absence', tint: 'info', description: 'Prepara sistemas de autorriego con mecha casera para cuando viajes.', action: 'Planificar viaje' },
  ];

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  const renderTile = (tool: ToolItem) => {
    const openTool = () => {
      if (tool.route === '/modal/check-soil-sheet') {
        router.push(firstPlantId ? { pathname: tool.route, params: { plantId: firstPlantId } } as any : '/first-crop' as any);
        return;
      }
      router.push(tool.route as any);
    };

    return (
    <View key={tool.route} style={[s.tile, { backgroundColor: colors.surface }]}>
        <View style={s.tileTop}>
          <View style={[s.iconCircle, { backgroundColor: colors[tool.tint] + '20' }]}>
            <Ionicons name={tool.icon} size={25} color={colors[tool.tint]} />
          </View>
          <View style={{ flex: 1 }}>
          <Text style={[s.tileEyebrow, { color: colors[tool.tint] }]}>{tool.eyebrow}</Text>
          <Text style={[s.tileLabel, { color: colors.text }]} numberOfLines={2}>{tool.title}</Text>
          <Text style={[s.tileDescription, { color: colors.textSecondary }]}>{tool.description}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tool.action}
        onPress={openTool}
        style={[s.tileAction, { borderTopColor: colors.border }]}
      >
        <Text style={[s.tileActionText, { color: colors.primary }]}>{tool.action}</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </Pressable>
    </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mi Huerto" onPress={() => router.back()} style={s.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.backTitle, { color: colors.text }]}>Mi Huerto</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.pageIntro}>
          <Ionicons name="build-outline" size={18} color={colors.primary} />
          <Text style={[s.introKicker, { color: colors.primary }]}>Utilidades Semilla</Text>
          <Text style={[s.pageTitle, { color: colors.text }]}>Herramientas de Semilla</Text>
          <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>Sensores, asistentes y guías inteligentes para cuidar tu huerto urbano sin errores de principiante.</Text>
        </View>
        <View style={s.grid}>{tools.map(renderTile)}</View>
        <View style={[s.tipCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="bulb-outline" size={20} color={colors.primary} />
          <Text style={[s.tipText, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>Consejo de Semilla: </Text>
            Recuerda medir la luz en diferentes franjas horarias (11:00 y 16:00) para un mapa solar certero.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ToolsScreen() {
  return <ToolsInner />;
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>,
) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    backTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    pageIntro: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
    introKicker: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: spacing.xs, letterSpacing: 0.4 },
    pageTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 2 },
    pageSubtitle: { fontSize: fontSize.sm, lineHeight: 19, marginTop: spacing.xs },
    scroll: { padding: spacing.xl, paddingTop: spacing.md, paddingBottom: TAB_BAR_BOTTOM_CLEARANCE + 20 },
    grid: { gap: spacing.md },
    tile: {
      width: '100%',
      borderRadius: radii.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      overflow: 'hidden',
      // Keep the same visual lift without deprecated Web shadow props.
      ...Platform.select({
        web: { boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)' },
        default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
      }),
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    tileEyebrow: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginBottom: 3 },
    tileLabel: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, lineHeight: 20 },
    tileDescription: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 3 },
    tileAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },
    tileActionText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginTop: spacing.lg },
    tipText: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
  });
