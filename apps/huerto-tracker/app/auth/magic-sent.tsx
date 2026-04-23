import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MagicSentScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.content}>
        <Text style={s.emoji}>✉️</Text>
        <Text style={[s.title, { color: colors.text }]}>Revisa tu email</Text>
        <Text style={[s.body, { color: colors.textSecondary }]}>
          Te hemos enviado un enlace mágico a{' '}
          <Text style={[s.emailHighlight, { color: colors.text }]}>{email ?? 'tu email'}</Text>
          {'. '}
          Pulsa el enlace desde tu teléfono para entrar automáticamente.
        </Text>
        <Text style={[s.hint, { color: colors.textDisabled }]}>
          El enlace caduca en 1 hora. Si no lo ves, revisa la carpeta de spam.
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
          <Text style={[s.btnText, { color: colors.text }]}>Cambiar email</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/onboarding')}
          style={({ pressed }) => [s.guestLink, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[s.guestText, { color: colors.textDisabled }]}>
            Continuar sin cuenta por ahora
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
