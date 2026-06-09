import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePro } from '../../src/hooks/usePro';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

interface ToolItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  labelKey: string;
  route: string;
  badge?: string;
  accent?: string;
}

export default function ToolsScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { isPro } = usePro();

  const tools: ToolItem[] = [
    { icon: 'bar-chart-outline',       labelKey: 'settings.tools.stats',       route: '/stats',          badge: isPro ? undefined : 'Pro', accent: colors.secondary },
    { icon: 'cash-outline',            labelKey: 'costs.title',                route: '/costs',          badge: isPro ? undefined : 'Pro', accent: '#4CAF50' },
    { icon: 'library-outline',         labelKey: 'settings.tools.catalog',      route: '/catalog',        accent: colors.primary },
    { icon: 'git-network-outline',     labelKey: 'settings.tools.companions',   route: '/companions',     badge: isPro ? undefined : 'Pro parcial', accent: '#FF7043' },
    { icon: 'bug-outline',             labelKey: 'settings.tools.diseaseGuide', route: '/disease-guide',  accent: '#EF5350' },
    { icon: 'refresh-circle-outline',  labelKey: 'settings.rotation',          route: '/rotation',       accent: '#26C6DA' },
    { icon: 'leaf-outline',            labelKey: 'customCrop.manage',           route: '/crop',           accent: '#8D6E63' },
    { icon: 'cloud-upload-outline',    labelKey: 'settings.data.backup',        route: '/settings/backup', accent: '#42A5F5' },
    { icon: 'chatbubble-ellipses-outline', labelKey: 'chat.title',              route: '/chat',            badge: isPro ? undefined : 'Pro', accent: '#7C3AED' },
    { icon: 'sunny-outline',               labelKey: 'lightMeter.title',        route: '/light-meter',     accent: '#FFB300' },
  ];

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.pageTitle, { color: colors.text }]}>{t('tools.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* 2-column grid for visual richness */}
        <View style={s.grid}>
          {tools.map((tool) => (
            <Pressable
              key={tool.route}
              onPress={() => router.push(tool.route as any)}
              style={({ pressed }) => [s.tile, { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 }]}
            >
              {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
              <View style={[s.iconCircle, { backgroundColor: (tool.accent ?? colors.primary) + '20' }]}>
                <Ionicons name={tool.icon} size={26} color={tool.accent ?? colors.primary} />
              </View>
              <Text style={[s.tileLabel, { color: colors.text }]} numberOfLines={2}>
                {t(tool.labelKey)}
              </Text>
              {tool.badge && (
                <View style={[s.badge, { backgroundColor: colors.secondary + '25' }]}>
                  <Text style={[s.badgeText, { color: colors.warning }]}>{tool.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={s.chevron} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pageTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    scroll: { padding: spacing.xl, paddingBottom: 40 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    tile: {
      width: '47.5%',
      borderRadius: radii.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      overflow: 'hidden',
      // subtle shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, lineHeight: 20 },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    badgeText: { fontSize: 10, fontWeight: fontWeight.bold },
    chevron: { position: 'absolute', top: spacing.md, right: spacing.md },
  });
