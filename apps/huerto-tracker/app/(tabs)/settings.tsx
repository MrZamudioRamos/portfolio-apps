import { useOnboarding } from '@portfolio/shared';
import { useColors, useTheme, Card, Button } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import type { Garden } from '../../src/models/garden';
import type { Plant } from '../../src/models/plant';
import type { DiaryEntry } from '../../src/models/diary-entry';
import type { GardenReminder } from '../../src/models/reminder';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { reset: resetOnboarding } = useOnboarding('huerto');

  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const reminders = useCollection<GardenReminder>('reminders');

  const garden = gardens.items[0];
  const zoneConfig = garden ? CLIMATE_ZONE_CONFIG[garden.climateZone] : null;

  useFocusEffect(useCallback(() => { gardens.refresh(); }, []));

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight as Record<string, string>, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      garden: gardens.items[0],
      plants: plants.items,
      diaryEntries: entries.items,
      reminders: reminders.items,
    };
    Alert.alert(
      'Exportar datos',
      `Se exportarían ${plants.count} plantas y ${entries.count} entradas de diario.\n\n(Integración completa disponible próximamente)`,
      [{ text: 'OK' }]
    );
  }

  function deleteAllData() {
    Alert.alert(
      '¿Eliminar todos los datos?',
      'Se borrarán permanentemente todas las plantas, entradas de diario y recordatorios. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar todo',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              plants.items.map((p) => plants.remove(p.id)),
              entries.items.map((e) => entries.remove(e.id)),
              reminders.items.map((r) => reminders.remove(r.id)),
              gardens.items.map((g) => gardens.remove(g.id)),
            ]);
            await resetOnboarding();
            router.replace('/onboarding');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <Text style={[s.pageTitle, { color: colors.text }]}>Ajustes</Text>

        {/* ── Mi huerto ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>MI HUERTO</Text>
        <Card padded style={s.card}>
          <Row
            icon="leaf-outline"
            label="Nombre"
            value={garden?.name ?? '—'}
            colors={colors}
            s={s}
          />
          <Separator colors={colors} />
          <Row
            icon="location-outline"
            label="Provincia"
            value={garden?.province ?? '—'}
            colors={colors}
            s={s}
          />
          <Separator colors={colors} />
          <Row
            icon="cloud-outline"
            label="Zona climática"
            value={zoneConfig ? `${zoneConfig.emoji} ${zoneConfig.label}` : '—'}
            colors={colors}
            s={s}
          />
          <Separator colors={colors} />
          <RowAction
            icon="create-outline"
            label="Editar huerto"
            colors={colors}
            s={s}
            onPress={() => router.push('/plant/new')}
          />
        </Card>

        {/* ── Suscripción ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>SUSCRIPCIÓN</Text>
        <Card padded style={s.card}>
          <View style={s.proRow}>
            <View style={s.proInfo}>
              <View style={[s.freeBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[s.freeBadgeText, { color: colors.textSecondary }]}>Plan gratuito</Text>
              </View>
              <Text style={[s.proDesc, { color: colors.textSecondary }]}>
                Hasta 5 plantas por huerto
              </Text>
            </View>
            <Button
              title="Ver planes"
              variant="primary"
              size="sm"
              onPress={() => router.push('/paywall')}
            />
          </View>
        </Card>

        {/* ── Estadísticas ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>RESUMEN</Text>
        <Card padded style={s.card}>
          <Row icon="leaf-outline" label="Plantas activas" value={String(plants.count)} colors={colors} s={s} />
          <Separator colors={colors} />
          <Row icon="journal-outline" label="Entradas de diario" value={String(entries.count)} colors={colors} s={s} />
          <Separator colors={colors} />
          <Row icon="notifications-outline" label="Recordatorios" value={String(reminders.count)} colors={colors} s={s} />
        </Card>

        {/* ── Datos ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>DATOS</Text>
        <Card padded style={s.card}>
          <RowAction
            icon="download-outline"
            label="Exportar datos (JSON)"
            colors={colors}
            s={s}
            onPress={exportData}
          />
          <Separator colors={colors} />
          <RowAction
            icon="trash-outline"
            label="Eliminar todos los datos"
            colors={colors}
            s={s}
            onPress={deleteAllData}
            destructive
          />
        </Card>

        {/* ── App ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>APP</Text>
        <Card padded style={s.card}>
          <Row icon="information-circle-outline" label="Versión" value={APP_VERSION} colors={colors} s={s} />
          <Separator colors={colors} />
          <RowAction
            icon="star-outline"
            label="Valorar en App Store"
            colors={colors}
            s={s}
            onPress={() => Linking.openURL('https://apps.apple.com')}
          />
          <Separator colors={colors} />
          <RowAction
            icon="mail-outline"
            label="Contacto"
            colors={colors}
            s={s}
            onPress={() => Linking.openURL('mailto:hola@huertotracker.app')}
          />
        </Card>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon, label, value, colors, s,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.rowContainer}>
      <Ionicons name={icon as never} size={18} color={colors.textSecondary} />
      <Text style={[s.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[s.rowValue, { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
}

function RowAction({
  icon, label, colors, s, onPress, destructive,
}: {
  icon: string;
  label: string;
  colors: ReturnType<typeof useColors>;
  s: ReturnType<typeof makeStyles>;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [s.rowContainer, { opacity: pressed ? 0.6 : 1 }]} onPress={onPress}>
      <Ionicons name={icon as never} size={18} color={destructive ? colors.error : colors.textSecondary} />
      <Text style={[s.rowLabel, { color: destructive ? colors.error : colors.text, flex: 1 }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
    </Pressable>
  );
}

function Separator({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 2 }} />;
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Record<string, string>,
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
    pageTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, marginTop: spacing.lg, marginBottom: spacing.xl },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
      marginTop: spacing.xl,
    },
    card: { gap: spacing.xs },
    rowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.md,
    },
    rowLabel: { flex: 1, fontSize: fontSize.md },
    rowValue: { fontSize: fontSize.md },
    proRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    proInfo: { gap: 4 },
    freeBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    freeBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    proDesc: { fontSize: fontSize.xs },
  });
