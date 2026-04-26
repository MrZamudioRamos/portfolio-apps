import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MagicSentScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { t } = useTranslation();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.content}>
        <Text style={s.emoji}>✉️</Text>
        <Text style={[s.title, { color: colors.text }]}>{t('magicSent.title')}</Text>
        <Text style={[s.body, { color: colors.textSecondary }]}>
          {t('magicSent.message', { email: email ?? 'tu email' })}
        </Text>
        <Text style={[s.hint, { color: colors.textDisabled }]}>
          {t('magicSent.note')}
        </Text>
      </View>

      <View style={s.actions}>
        <Pressable
          onPress={() => router.replace('/auth' as any)}
          style={({ pressed }) => [
            s.btn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[s.btnText, { color: colors.text }]}>{t('magicSent.changeEmail')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/onboarding')}
          style={({ pressed }) => [s.guestLink, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[s.guestText, { color: colors.textDisabled }]}>
            {t('magicSent.continueGuest')}
          </Text>
        </Pressable>
      </View>
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
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
    emoji: { fontSize: 72 },
    title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, textAlign: 'center' },
    body: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
    emailHighlight: { fontWeight: fontWeight.semibold },
    hint: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 18 },
    actions: { padding: spacing.xl, gap: spacing.md },
    btn: {
      height: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnText: { fontSize: fontSize.md },
    guestLink: { alignItems: 'center', paddingVertical: spacing.sm },
    guestText: { fontSize: fontSize.sm },
  });
