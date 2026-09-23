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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackOr } from '../../src/utils/navigation';
import { getMagicSentDisplay } from '../../src/utils/magicSentDisplay';

export default function MagicSentScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string | string[] }>();
  const display = getMagicSentDisplay(email);
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
    if (!display.email) return;
    if (trimmed.length !== 6) {
      Alert.alert(t('magicSent.errorCodeTitle'), t('magicSent.errorCodeDesc'));
      return;
    }
    setVerifying(true);
    try {
      await verifyOtp(display.email, trimmed);
      router.replace(onboardingDone ? '/(tabs)' : '/onboarding');
    } catch {
      Alert.alert(t('magicSent.errorVerifyTitle'), t('magicSent.errorVerifyDesc'));
    } finally {
      setVerifying(false);
    }
  }

  if (process.env.EXPO_PUBLIC_STITCH_CLONE !== 'false') {
    return (
      <StitchMagicSentScreen
        colors={colors}
        email={display.email}
        messageKey={display.messageKey}
        code={code}
        verifying={verifying}
        onCodeChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        onVerify={() => { void handleVerify(); }}
        onBack={() => goBackOr(router, '/auth' as any)}
        onChangeEmail={() => router.replace('/auth' as any)}
        onContinueGuest={() => router.replace('/onboarding')}
        onOpenEmail={() => {
          void Linking.openURL('mailto:').catch(() => Alert.alert(t('common.error'), t('magicSent.mailAppError')));
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.content}>
          <Text style={s.emoji}>✉️</Text>
          <Text style={[s.title, { color: colors.text }]}>{t('magicSent.title')}</Text>
          <Text style={[s.body, { color: colors.textSecondary }]}>
            {t(display.messageKey, display.email ? { email: display.email } : undefined)}
          </Text>
          <Text style={[s.hint, { color: colors.textDisabled }]}>
            {t('magicSent.expiryLimited')} {t('magicSent.note')}
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
            disabled={!display.email || verifying || code.length !== 6}
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


function StitchMagicSentScreen({
  colors,
  email,
  messageKey,
  code,
  verifying,
  onCodeChange,
  onVerify,
  onBack,
  onChangeEmail,
  onContinueGuest,
  onOpenEmail,
}: {
  colors: ReturnType<typeof useColors>;
  email: string | null;
  messageKey: 'magicSent.message' | 'magicSent.messageWithoutAddress';
  code: string;
  verifying: boolean;
  onCodeChange: (value: string) => void;
  onVerify: () => void;
  onBack: () => void;
  onChangeEmail: () => void;
  onContinueGuest: () => void;
  onOpenEmail: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  return (
    <SafeAreaView style={[magicStitch.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={magicStitch.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('onboarding.back')} onPress={onBack} style={magicStitch.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('onboarding.back')}</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={magicStitch.content}>
        <View style={[magicStitch.illustration, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="mail-open-outline" size={62} color={colors.primary} />
          <Text style={magicStitch.seed} accessible={false}>🌱</Text>
        </View>
        <Text accessibilityRole="header" style={[magicStitch.title, { color: colors.text }]}>{t('magicSent.title')}</Text>
        <Text style={[magicStitch.body, { color: colors.textSecondary }]}>
          {t(messageKey, email ? { email } : undefined)}
        </Text>
        {email ? (
          <>
            <Text style={[magicStitch.note, { color: colors.textSecondary }]}>{t('magicSent.expiryLimited')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('magicSent.verify')}
              onPress={() => inputRef.current?.focus()}
              style={magicStitch.otpRow}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <View
                  key={index}
                  style={[magicStitch.otpBox, { backgroundColor: colors.surface, borderColor: code.length === index ? colors.primary : code[index] ? `${colors.primary}99` : colors.border }]}
                >
                  <Text style={[magicStitch.otpDigit, { color: colors.text }]}>{code[index] ?? ''}</Text>
                </View>
              ))}
            </Pressable>
            <TextInput
              ref={inputRef}
              accessibilityLabel={t('magicSent.verify')}
              value={code}
              onChangeText={onCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              style={magicStitch.hiddenInput}
              autoFocus
            />
            <Text style={[magicStitch.note, { color: colors.textSecondary }]}>{t('magicSent.note')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: verifying || code.length !== 6, busy: verifying }}
              disabled={verifying || code.length !== 6}
              onPress={onVerify}
              style={[magicStitch.primary, { backgroundColor: colors.primary, opacity: verifying || code.length !== 6 ? 0.5 : 1 }]}
            >
              <Text style={magicStitch.primaryText}>{t(verifying ? 'magicSent.verifying' : 'magicSent.verify')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onOpenEmail} style={[magicStitch.outline, { borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={19} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '800' }}>{t('magicSent.openEmailApp')}</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onChangeEmail} style={magicStitch.link}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('magicSent.changeEmail')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onContinueGuest} style={magicStitch.guestLink}>
          <Text style={{ color: colors.textSecondary }}>{t('magicSent.continueGuest')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const magicStitch = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20 },
  back: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 2 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center' },
  illustration: { width: 136, height: 136, borderRadius: 68, alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 22 },
  seed: { fontSize: 30, position: 'absolute', right: 18, top: 9 },
  title: { textAlign: 'center', fontSize: 25, fontWeight: '900' },
  body: { textAlign: 'center', fontSize: 14, lineHeight: 21, marginTop: 12 },
  note: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 10 },
  otpRow: { flexDirection: 'row', gap: 7, marginTop: 20 },
  otpBox: { width: 42, height: 52, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  otpDigit: { fontSize: 20, fontWeight: '800' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1, top: 0, left: 0 },
  primary: { width: '100%', minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: '#fff', fontWeight: '900' },
  outline: { width: '100%', minHeight: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  link: { alignItems: 'center', paddingVertical: 18, minHeight: 48, justifyContent: 'center' },
  guestLink: { alignItems: 'center', paddingVertical: 9, minHeight: 44, justifyContent: 'center' },
});

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
