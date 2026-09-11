import { useOnboarding } from '@portfolio/shared';
import { useColors, useTheme } from '@portfolio/ui';
import { Button } from '../src/components/ActionButton';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../src/components/Mascot';

export default function WelcomeScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { completed } = useOnboarding('huerto');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        bounces={false}
        contentContainerStyle={{ flexGrow: 1, padding: spacing.xl }}
      >
        <View style={[styles.decorations, { pointerEvents: 'none' }]}>
          <View style={[styles.decorOrb, styles.orbTopLeft, { backgroundColor: colors.primaryLight + '35' }]}>
            <Mascot pose="idle" size={58} />
          </View>
          <View style={[styles.decorOrb, styles.orbTopRight, { backgroundColor: colors.secondary + '35' }]}>
            <Text style={{ fontSize: 30 }}>🌱</Text>
          </View>
          <View style={[styles.decorOrb, styles.orbBottomRight, { backgroundColor: colors.water + '28' }]}>
            <Text style={{ fontSize: 28 }}>💧</Text>
          </View>
        </View>

        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', flex: 1, justifyContent: 'center', gap: spacing.lg }}>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Text style={{ color: colors.text, fontWeight: fontWeight.bold, letterSpacing: 3, textTransform: 'uppercase' }}>
              {t('welcome.title')}
            </Text>
            <View accessibilityLabel={t('onboarding.stepOf', { current: 1, total: 3 })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 42, height: 6, borderRadius: radii.full, backgroundColor: colors.primary }} />
              <View style={{ width: 8, height: 6, borderRadius: radii.full, backgroundColor: colors.border }} />
              <View style={{ width: 8, height: 6, borderRadius: radii.full, backgroundColor: colors.border }} />
            </View>
          </View>

          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 3, textAlign: 'center' }}>
              {t('welcome.eyebrow')}
            </Text>
            <Text accessibilityRole="header" style={{ color: colors.text, fontSize: fontSize['3xl'], lineHeight: 42, fontWeight: fontWeight.bold, textAlign: 'center', maxWidth: 390 }}>
              {t('welcome.heroTitle')}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 24, textAlign: 'center', maxWidth: 360 }}>
              {t('welcome.heroSubtitle')}
            </Text>
            <View style={{ width: 168, height: 168, borderRadius: 84, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm }}>
              <Mascot pose="wave" size={142} />
            </View>
          </View>

          <View style={{ padding: spacing.lg, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.md }}>
            {(['space', 'crop', 'care'] as const).map((key, index) => (
              <View key={key} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
                  <Text style={{ color: colors.primary, fontWeight: fontWeight.bold }}>{index + 1}</Text>
                </View>
                <Text style={{ color: colors.text, flex: 1, fontSize: fontSize.md }}>{t('welcome.path.' + key)}</Text>
              </View>
            ))}
          </View>

          <View style={{ gap: spacing.sm }}>
            <Button
              title={t(completed ? 'welcome.returnGarden' : 'welcome.explore')}
              size="lg"
              onPress={() => router.replace(completed ? '/(tabs)' : '/onboarding')}
              style={{ minHeight: 56, borderRadius: radii.md }}
            />
            <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>{t('welcome.noAccount')}</Text>
            <Button
              title={t('welcome.signIn')}
              variant="ghost"
              size="lg"
              onPress={() => router.push('/auth')}
              style={{ minHeight: 48, borderRadius: radii.md }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  decorations: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' as const },
  decorOrb: { position: 'absolute' as const, width: 86, height: 86, borderRadius: 43, alignItems: 'center' as const, justifyContent: 'center' as const },
  orbTopLeft: { top: 84, left: -24 },
  orbTopRight: { top: 152, right: -18 },
  orbBottomRight: { bottom: 110, right: -20 },
};
