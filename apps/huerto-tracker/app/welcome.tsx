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
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}>
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.xl }}>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontWeight: fontWeight.bold }}>semilla</Text>
            <Mascot pose="wave" size={120} />
            <Text accessibilityRole="header" style={{ color: colors.text, fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, textAlign: 'center' }}>{t('onboarding.welcomeTitle')}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 24, textAlign: 'center' }}>{t('onboarding.welcomeSubtitle')}</Text>
          </View>
          <View style={{ padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, gap: spacing.md }}>
            {(['space', 'crop', 'care'] as const).map((key, index) => (
              <View key={key} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <Text style={{ color: colors.primary, fontWeight: fontWeight.bold }}>{index + 1}</Text>
                <Text style={{ color: colors.text, flex: 1, fontSize: fontSize.md }}>{t('welcome.path.' + key)}</Text>
              </View>
            ))}
          </View>
          <View style={{ gap: spacing.sm }}>
            <Button title={t(completed ? 'welcome.returnGarden' : 'welcome.explore')} size="lg" onPress={() => router.replace(completed ? '/(tabs)' : '/onboarding')} />
            <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>{t('welcome.noAccount')}</Text>
            <Button title={t('welcome.signIn')} variant="ghost" size="lg" onPress={() => router.push('/auth')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
