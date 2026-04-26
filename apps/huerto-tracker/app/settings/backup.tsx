import { usePurchases } from '@portfolio/billing';
import { useColors, useTheme, Card, Button, type Theme } from '@portfolio/ui';
import { formatRelative } from '@portfolio/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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

  const { t } = useTranslation();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function handleToggleAuto(value: boolean) {
    if (value && !isPro) {
      Alert.alert(
        t('backup.proTitle'),
        t('backup.proDesc'),
        [
          { text: t('backup.viewPlans'), onPress: () => router.push('/paywall') },
          { text: t('common.cancel'), style: 'cancel' },
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
      Alert.alert(t('common.error'), t('backup.exportError'));
    }
  }

  async function handleImport() {
    Alert.alert(
      t('backup.importTitle'),
      t('backup.importDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.importConfirm'),
          style: 'destructive',
          onPress: async () => {
            const result = await importBackup();
            if (!result.success) {
              if (result.error) Alert.alert(t('common.error'), result.error);
              return;
            }
            Alert.alert(
              t('backup.restoredTitle'),
              t('backup.restoredDesc'),
              [{ text: t('common.ok') }]
            );
          },
        },
      ]
    );
  }

  const lastBackupLabel = lastBackupAt
    ? formatRelative(lastBackupAt)
    : t('backup.never');

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('backup.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* iCloud auto-sync */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('backup.autoSyncLabel')}</Text>
        <Card padded style={s.card}>
          <View style={s.row}>
            <View style={s.rowIcon}>
              <Ionicons name="cloud-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.rowTitleRow}>
                <Text style={[s.rowTitle, { color: colors.text }]}>{t('backup.icloudSync')}</Text>
                {!isPro && (
                  <View style={[s.proBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
                    <Text style={[s.proBadgeText, { color: colors.primary }]}>Pro</Text>
                  </View>
                )}
              </View>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                {t('backup.icloudSyncDesc')}
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
              <Text style={[s.rowTitle, { color: colors.text }]}>{t('backup.lastBackup')}</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>{lastBackupLabel}</Text>
            </View>
          </View>
        </Card>

        {autoBackup && (
          <View style={[s.infoBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              {t('backup.icloudTip')}
            </Text>
          </View>
        )}

        {/* Manual backup */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('backup.manualLabel')}</Text>
        <Card padded style={s.card}>
          <View style={s.actionRow}>
            <View style={s.rowIcon}>
              <Ionicons name="download-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>{t('backup.exportTitle')}</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                {t('backup.exportDesc')}
              </Text>
            </View>
            <Button
              title={exporting ? '…' : t('backup.export')}
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
              <Text style={[s.rowTitle, { color: colors.text }]}>{t('backup.importTitle2')}</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                {t('backup.importDesc2')}
              </Text>
            </View>
            <Button
              title={importing ? '…' : t('backup.import')}
              variant="outline"
              size="sm"
              onPress={handleImport}
              disabled={exporting || importing}
            />
          </View>
        </Card>

        {/* What's included */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('backup.includesLabel')}</Text>
        <Card padded style={s.card}>
          {[
            { icon: 'leaf-outline', label: t('backup.includeGarden') },
            { icon: 'flower-outline', label: t('backup.includePlants') },
            { icon: 'journal-outline', label: t('backup.includeEntries') },
            { icon: 'notifications-outline', label: t('backup.includeReminders') },
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
          {t('backup.footerNote')}
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
