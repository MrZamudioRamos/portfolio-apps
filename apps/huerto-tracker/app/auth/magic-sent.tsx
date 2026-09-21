import { verifyOtp } from '@portfolio/supabase';
import { useOnboarding } from '@portfolio/shared';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MagicSentScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { t } = useTranslation();
  const { completed: onboardingDone } = useOnboarding('huerto');

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function handleVerify() {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      Alert.alert(t('magicSent.errorCodeTitle'), t('magicSent.errorCodeDesc'));
      return;
    }
    setVerifying(true);
    try {
      await verifyOtp(email ?? '', trimmed);
      router.replace(onboardingDone ? '/(tabs)' : '/onboarding');
    } catch {
      Alert.alert(t('magicSent.errorVerifyTitle'), t('magicSent.errorVerifyDesc'));
    } finally {
      setVerifying(false);
    }
  }

  if (process.env.EXPO_PUBLIC_STITCH_CLONE !== 'false') {
    return <StitchMagicSentScreen colors={colors} router={router} email={email ?? 'laura.jardin@correo.es'} />;
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.content}>
          <Text style={s.emoji}>✉️</Text>
          <Text style={[s.title, { color: colors.text }]}>{t('magicSent.title')}</Text>
          <Text style={[s.body, { color: colors.textSecondary }]}>
            {t('magicSent.message', { email: email ?? 'tu email' })}
          </Text>
          <Text style={[s.hint, { color: colors.textDisabled }]}>
            {t('magicSent.note')}
          </Text>

          {/* OTP input */}
          <Pressable onPress={() => inputRef.current?.focus()} style={s.otpRow}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={[
                  s.otpBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: code.length === i ? colors.accent : code[i] ? colors.accent + '99' : colors.border,
                  },
                ]}
              >
                <Text style={[s.otpDigit, { color: colors.text }]}>{code[i] ?? ''}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={s.hiddenInput}
            autoFocus
          />

          <Pressable
            onPress={handleVerify}
            disabled={verifying || code.length !== 6}
            style={({ pressed }) => [
              s.verifyBtn,
              { backgroundColor: colors.accent, opacity: pressed || verifying || code.length !== 6 ? 0.5 : 1 },
            ]}
          >
            <Text style={[s.verifyBtnText, { color: colors.primaryDark }]}>
              {verifying ? t('magicSent.verifying') : t('magicSent.verify')}
            </Text>
          </Pressable>
        </View>

        <View style={s.actions}>
          <Pressable
            onPress={() => router.replace('/auth' as any)}
            style={({ pressed }) => [s.btn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StitchMagicSentScreen({ colors, router, email }: { colors: ReturnType<typeof useColors>; router: ReturnType<typeof useRouter>; email: string }) {
  const openMail = () => {
    void Linking.openURL('mailto:').catch(() => Alert.alert('Aplicación de correo', 'No se ha podido abrir una aplicación de correo en este dispositivo.'));
  };
  return <SafeAreaView style={[magicStitch.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}><View style={magicStitch.content}><Pressable onPress={() => router.back()} style={magicStitch.back} accessibilityRole="button"><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={{ color: colors.text, fontWeight: '700' }}>Volver</Text></Pressable><View style={[magicStitch.illustration, { backgroundColor: colors.surfaceAlt }]}><Ionicons name="mail-open-outline" size={62} color={colors.primary} /><Text style={{ fontSize: 30, position: 'absolute', right: 26, top: 12 }}>🌱</Text></View><Text style={[magicStitch.title, { color: colors.text }]}>Enlace mágico enviado</Text><Text style={[magicStitch.body, { color: colors.textSecondary }]}>Hemos enviado un acceso seguro a</Text><Text style={[magicStitch.email, { color: colors.text }]}>{email}</Text><Text style={[magicStitch.body, { color: colors.textSecondary }]}>Abre tu correo y toca el enlace para entrar en tu huerto. El enlace caduca en 43 segundos.</Text><Pressable onPress={openMail} style={[magicStitch.primary, { backgroundColor: colors.primary }]} accessibilityRole="button"><Ionicons name="mail-outline" size={19} color="#fff" /><Text style={magicStitch.primaryText}>Abrir aplicación de correo</Text></Pressable><Pressable onPress={() => router.replace('/auth' as any)} style={magicStitch.link} accessibilityRole="button"><Text style={{ color: colors.primary, fontWeight: '800' }}>¿No es tu correo? Corregir dirección</Text></Pressable><Text style={[magicStitch.note, { color: colors.textSecondary }]}>Si no lo encuentras, revisa la carpeta de spam o promociones.</Text></View></SafeAreaView>;
}

const magicStitch = StyleSheet.create({ container: { flex: 1 }, content: { flex: 1, paddingHorizontal: 24 }, back: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 2 }, illustration: { width: 150, height: 150, borderRadius: 75, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 64, marginBottom: 28 }, title: { textAlign: 'center', fontSize: 25, fontWeight: '900' }, body: { textAlign: 'center', fontSize: 14, lineHeight: 21, marginTop: 13 }, email: { textAlign: 'center', fontSize: 16, fontWeight: '900', marginTop: 5 }, primary: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 26 }, primaryText: { color: '#fff', fontWeight: '900' }, link: { alignItems: 'center', paddingVertical: 18 }, note: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 16 }, });

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
    hint: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 18 },
    otpRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    otpBox: {
      width: 44,
      height: 56,
      borderRadius: radii.md,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    otpDigit: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    hiddenInput: { position: 'absolute', opacity: 0, width: 0, height: 0 },
    verifyBtn: {
      width: '100%',
      height: 52,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    verifyBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
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
