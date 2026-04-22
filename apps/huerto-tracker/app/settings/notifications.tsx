import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import { useSeasonalAlerts } from '../../src/hooks/useSeasonalAlerts';

export default function NotificationsSettingsScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { enabled, loading, toggle, nextPreview, zone } = useSeasonalAlerts();

  const zoneConfig = zone ? CLIMATE_ZONE_CONFIG[zone] : null;

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Notificaciones</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Seasonal alerts toggle */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>ALERTAS ESTACIONALES</Text>
        <Card padded style={s.card}>
          <View style={s.toggleRow}>
            <View style={[s.iconBox, { backgroundColor: colors.primary + '18' }]}>
              <Text style={{ fontSize: 20 }}>🗓️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>
                Recordatorios de siembra
              </Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                Aviso el 1.º de cada mes con lo que puedes sembrar
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggle}
              disabled={loading}
              trackColor={{ true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {zoneConfig && (
            <>
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <View style={s.zoneRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={[s.rowSub, { color: colors.textSecondary, flex: 1 }]}>
                  Basado en tu zona climática:{' '}
                  <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>
                    {zoneConfig.emoji} {zoneConfig.label}
                  </Text>
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* Next alert preview */}
        {enabled && nextPreview && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>PRÓXIMA ALERTA</Text>
            <Card padded style={s.card}>
              <View style={s.previewHeader}>
                <View style={[s.iconBox, { backgroundColor: '#4CAF5018' }]}>
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: colors.text }]}>
                    1 de {nextPreview.monthLabel}
                  </Text>
                  <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                    {nextPreview.total} cultivo{nextPreview.total !== 1 ? 's' : ''} para sembrar
                  </Text>
                </View>
              </View>
              <View style={[s.cropChipsRow, { marginTop: spacing.md }]}>
                {nextPreview.crops.map((c) => (
                  <View
                    key={c.id}
                    style={[s.cropChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  >
                    <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
                    <Text style={[s.cropChipText, { color: colors.text }]}>{c.name}</Text>
                  </View>
                ))}
                {nextPreview.total > 4 && (
                  <View style={[s.cropChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <Text style={[s.cropChipText, { color: colors.textSecondary }]}>
                      +{nextPreview.total - 4} más
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </>
        )}

        {/* How it works */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>CÓMO FUNCIONA</Text>
        <Card padded style={s.card}>
          {[
            {
              icon: '📅',
              title: 'Aviso mensual',
              desc: 'Recibes una notificación el día 1 de cada mes a las 9:00.',
            },
            {
              icon: '🌍',
              title: 'Personalizado por zona',
              desc: 'Los cultivos sugeridos se calculan según tu zona climática en España.',
            },
            {
              icon: '📱',
              title: 'Sin conexión',
              desc: 'Las alertas se programan en el dispositivo. No necesitas internet.',
            },
          ].map((item, i, arr) => (
            <View key={item.title}>
              {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
              <View style={s.howRow}>
                <Text style={{ fontSize: 22, width: 32 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[s.rowSub, { color: colors.textSecondary }]}>{item.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>

        {!zone && (
          <View style={[s.warningBox, { backgroundColor: colors.warning + '18', borderColor: colors.warning }]}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <Text style={[s.warningText, { color: colors.text }]}>
              Completa el onboarding para activar las alertas personalizadas por zona.
            </Text>
          </View>
        )}

        <View style={{ height: spacing['2xl'] }} />
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
    card: { marginBottom: 0 },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    zoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.sm },
    rowTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, marginBottom: 2 },
    rowSub: { fontSize: fontSize.xs, lineHeight: 17 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
    previewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cropChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    cropChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.full,
      borderWidth: 1,
      gap: spacing.xs,
    },
    cropChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing.lg,
    },
    warningText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
  });
