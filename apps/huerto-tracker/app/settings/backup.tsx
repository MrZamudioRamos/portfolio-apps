import { usePurchases } from '@portfolio/billing';
import { useColors, useTheme, Card, Button, type Theme } from '@portfolio/ui';
import { formatRelative } from '@portfolio/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBackup } from '../../src/hooks/useBackup';

export default function BackupScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { isPro } = usePurchases();
  const {
    autoBackup,
    lastBackupAt,
    loading,
    exporting,
    importing,
    exportBackup,
    importBackup,
    toggleAutoBackup,
  } = useBackup();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function handleToggleAuto(value: boolean) {
    if (value && !isPro) {
      Alert.alert(
        'Función Pro',
        'La sincronización automática con iCloud está disponible en el plan Pro.',
        [
          { text: 'Ver planes', onPress: () => router.push('/paywall') },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
      return;
    }
    await toggleAutoBackup(value);
  }

  async function handleExport() {
    try {
      await exportBackup();
    } catch {
      Alert.alert('Error', 'No se pudo exportar el backup. Inténtalo de nuevo.');
    }
  }

  async function handleImport() {
    Alert.alert(
      'Importar backup',
      'Esto reemplazará TODOS los datos actuales con los del archivo de backup. La app necesitará reiniciarse.\n\n¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            const result = await importBackup();
            if (!result.success) {
              if (result.error) Alert.alert('Error', result.error);
              return;
            }
            Alert.alert(
              'Datos restaurados ✓',
              'Cierra y vuelve a abrir la app para que los cambios surtan efecto.',
              [{ text: 'Entendido' }]
            );
          },
        },
      ]
    );
  }

  const lastBackupLabel = lastBackupAt
    ? formatRelative(lastBackupAt)
    : 'Nunca';

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Copia de seguridad</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* iCloud auto-sync */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>SINCRONIZACIÓN AUTOMÁTICA</Text>
        <Card padded style={s.card}>
          <View style={s.row}>
            <View style={s.rowIcon}>
              <Ionicons name="cloud-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.rowTitleRow}>
                <Text style={[s.rowTitle, { color: colors.text }]}>Sincronizar con iCloud</Text>
                {!isPro && (
                  <View style={[s.proBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
                    <Text style={[s.proBadgeText, { color: colors.primary }]}>Pro</Text>
                  </View>
                )}
              </View>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                Guarda automáticamente un backup en tu carpeta de iCloud al salir de la app.
              </Text>
            </View>
            <Switch
              value={autoBackup}
              onValueChange={handleToggleAuto}
              disabled={loading}
              trackColor={{ true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          <View style={s.row}>
            <View style={s.rowIcon}>
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>Último backup</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>{lastBackupLabel}</Text>
            </View>
          </View>
        </Card>

        {autoBackup && (
          <View style={[s.infoBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              Para activar la sincronización iCloud ve a{' '}
              <Text style={{ fontWeight: fontWeight.semibold }}>
                Ajustes {'>'} Tu nombre {'>'} iCloud {'>'} Apps que usan iCloud
              </Text>{' '}
              y activa HuertoTracker.
            </Text>
          </View>
        )}

        {/* Manual backup */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>MANUAL</Text>
        <Card padded style={s.card}>
          <View style={s.actionRow}>
            <View style={s.rowIcon}>
              <Ionicons name="download-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>Exportar backup</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                Guarda el archivo en Archivos, Drive o compártelo.
              </Text>
            </View>
            <Button
              title={exporting ? '…' : 'Exportar'}
              variant="secondary"
              size="sm"
              onPress={handleExport}
              disabled={exporting || importing}
            />
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          <View style={s.actionRow}>
            <View style={s.rowIcon}>
              <Ionicons name="arrow-down-circle-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>Importar backup</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                Restaura desde un archivo .json. Reemplaza todos los datos.
              </Text>
            </View>
            <Button
              title={importing ? '…' : 'Importar'}
              variant="outline"
              size="sm"
              onPress={handleImport}
              disabled={exporting || importing}
            />
          </View>
        </Card>

        {/* What's included */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>QUÉ INCLUYE EL BACKUP</Text>
        <Card padded style={s.card}>
          {[
            { icon: 'leaf-outline', label: 'Huerto y configuración de zona' },
            { icon: 'flower-outline', label: 'Todas tus plantas' },
            { icon: 'journal-outline', label: 'Entradas del diario' },
            { icon: 'notifications-outline', label: 'Recordatorios configurados' },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={s.includeRow}>
                <Ionicons name={item.icon as never} size={18} color={colors.primary} />
                <Text style={[s.includeText, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              </View>
              {i < arr.length - 1 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </Card>

        <Text style={[s.footer, { color: colors.textDisabled }]}>
          El backup no incluye fotos (se almacenan en la galería del dispositivo) ni el estado de la suscripción.
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    card: { gap: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
    rowTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    rowSub: { fontSize: fontSize.xs, lineHeight: 17 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
    proBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    proBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
    infoBox: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing.sm,
    },
    infoText: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
    includeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    includeText: { flex: 1, fontSize: fontSize.md },
    footer: { fontSize: fontSize.xs, lineHeight: 18, marginTop: spacing.lg, textAlign: 'center' },
  });
