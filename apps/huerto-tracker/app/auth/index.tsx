import { signInWithApple, signInWithGoogle, signInWithMagicLink, signInWithPassword } from '@portfolio/supabase';
import { useOnboarding } from '@portfolio/shared';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot } from '../../src/components/Mascot';
import { goBackOr } from '../../src/utils/navigation';

type EmailMode = 'none' | 'password' | 'otp';

export default function AuthScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();

  const { t } = useTranslation();
  const { completed: onboardingDone } = useOnboarding('huerto');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailMode, setEmailMode] = useState<EmailMode>('none');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  const postAuthRoute = onboardingDone ? '/(tabs)' : '/onboarding';

  async function handleGoogle() {
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
      router.replace(postAuthRoute);
    } catch (e: any) {
      if (e?.message !== 'User cancelled') {
        Alert.alert(t('common.error'), t('auth.errorGoogle'));
      }
    } finally {
      setLoadingGoogle(false);
    }
  }

  async function handleApple() {
    setLoadingApple(true);
    try {
      await signInWithApple();
      router.replace(postAuthRoute);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('common.error'), t('auth.errorApple'));
      }
    } finally {
      setLoadingApple(false);
    }
  }

  async function handlePassword() {
    if (!email.trim() || !password) return;
    setLoadingEmail(true);
    try {
      await signInWithPassword(email.trim().toLowerCase(), password);
      router.replace(postAuthRoute);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('auth.errorMagicLink'));
    } finally {
      setLoadingEmail(false);
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) return;
    setLoadingEmail(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signInWithMagicLink(normalizedEmail);
      router.push({ pathname: '/auth/magic-sent', params: { email: normalizedEmail } });
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('auth.errorMagicLink'));
    } finally {
      setLoadingEmail(false);
    }
  }

  if (process.env.EXPO_PUBLIC_STITCH_CLONE !== 'false') {
    return <StitchAuthScreen colors={colors} router={{ ...router, back: () => goBackOr(router, '/welcome' as any) }} email={email} setEmail={setEmail} loading={loadingEmail} onSubmit={handleMagicLink} onApple={handleApple} onGoogle={handleGoogle} />;
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <Pressable onPress={() => goBackOr(router, '/welcome' as any)} style={s.backBtn} hitSlop={12}>
            <Text style={[s.backText, { color: colors.primaryDark }]}>{t('common.back')}</Text>
          </Pressable>

          <View style={[s.heroMascot, { backgroundColor: colors.surfaceAlt }]}>
            <Mascot pose="wave" size={88} />
          </View>
          <Text style={[s.title, { color: colors.text }]}>{t('auth.title')}</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            {t('auth.subtitle')}
          </Text>

          {/* Google */}
          <Pressable
            onPress={handleGoogle}
            disabled={loadingGoogle}
            style={({ pressed }) => [
              s.socialBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm, opacity: pressed || loadingGoogle ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
            <Text style={[s.socialText, { color: colors.text }]}>
              {loadingGoogle ? t('auth.connecting') : t('auth.continueGoogle')}
            </Text>
          </Pressable>

          {/* Apple (iOS only) */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radii.lg}
              style={s.appleBtn}
              onPress={handleApple}
            />
          )}

          {/* Divider */}
          <View style={s.divider}>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[s.dividerText, { color: colors.textDisabled }]}>{t('auth.or')}</Text>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Email form */}
          {emailMode === 'none' ? (
            <View style={{ gap: spacing.sm }}>
              <Pressable
                onPress={() => setEmailMode('password')}
                style={({ pressed }) => [s.emailModeBtn, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={s.emailModeBtnContent}>
                  <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
                  <Text style={[s.emailModeBtnText, { color: colors.text }]}>{t('auth.emailPassword')}</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setEmailMode('otp')}
                style={({ pressed }) => [s.magicToggle, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[s.magicToggleText, { color: colors.primaryDark }]}>
                  {t('auth.emailLink')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.magicForm}>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
              {emailMode === 'password' && (
                <TextInput
                  style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
              )}
              <Pressable
                onPress={emailMode === 'password' ? handlePassword : handleMagicLink}
                disabled={loadingEmail}
                style={({ pressed }) => [
                  s.magicBtn,
                  { backgroundColor: colors.accent, opacity: pressed || loadingEmail ? 0.7 : 1 },
                ]}
              >
                <Text style={[s.magicBtnText, { color: colors.primaryDark }]}>
                  {loadingEmail
                    ? t('auth.sending')
                    : emailMode === 'password'
                      ? t('auth.signIn')
                      : t('auth.sendMagicLink')}
                </Text>
              </Pressable>
              <Pressable onPress={() => setEmailMode('none')} style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textDisabled, fontSize: fontSize.sm }}>{t('common.back')}</Text>
              </Pressable>
            </View>
          )}

          {/* Guest link */}
          <Pressable
            onPress={() => router.replace(onboardingDone ? '/(tabs)' : '/onboarding')}
            style={({ pressed }) => [s.guestLink, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[s.guestText, { color: colors.textDisabled }]}>
              {t('auth.continueGuest')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StitchAuthScreen({ colors, router, email, setEmail, loading, onSubmit, onApple, onGoogle }: { colors: ReturnType<typeof useColors>; router: ReturnType<typeof useRouter>; email: string; setEmail: (value: string) => void; loading: boolean; onSubmit: () => void; onApple: () => void; onGoogle: () => void }) {
  return <SafeAreaView style={[authStitch.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}><ScrollView contentContainerStyle={authStitch.content} keyboardShouldPersistTaps="handled"><Pressable onPress={() => router.back()} style={authStitch.back} accessibilityRole="button" accessibilityLabel="Volver"><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={[authStitch.backText, { color: colors.text }]}>Volver</Text></Pressable><View style={authStitch.brand}><Ionicons name="leaf" size={23} color={colors.primary} /><Text style={[authStitch.brandText, { color: colors.primary }]}>SEMILLA</Text></View><Text style={[authStitch.kicker, { color: colors.primary }]}>Tu huerto en casa</Text><Text style={[authStitch.title, { color: colors.text }]}>Entra a tu Huerto</Text><Text style={[authStitch.subtitle, { color: colors.textSecondary }]}>Introduce tu correo electrónico para recibir un enlace mágico instantáneo sin necesidad de contraseña.</Text><Text style={[authStitch.label, { color: colors.text }]}>Correo electrónico</Text><View style={[authStitch.input, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="mail-outline" size={19} color={colors.textSecondary} /><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="tu@email.com" placeholderTextColor={colors.textDisabled} style={{ flex: 1, color: colors.text, fontSize: 15 }} /><Pressable onPress={() => setEmail('')} accessibilityRole="button" accessibilityLabel="Borrar texto"><Ionicons name="close-circle" size={18} color={colors.textDisabled} /></Pressable></View><View style={authStitch.secure}><Ionicons name="shield-checkmark-outline" size={17} color={colors.primary} /><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Te enviaremos un acceso seguro</Text></View><Pressable onPress={onSubmit} disabled={loading || !email.trim()} style={[authStitch.primary, { backgroundColor: colors.primary, opacity: loading || !email.trim() ? 0.5 : 1 }]} accessibilityRole="button"><Text style={authStitch.primaryText}>{loading ? 'Enviando…' : 'Enviar enlace mágico'}</Text><Ionicons name="sparkles-outline" size={18} color="#fff" /></Pressable><Text style={[authStitch.divider, { color: colors.textSecondary }]}>O ACCEDE CON</Text><Pressable onPress={onApple} style={[authStitch.social, { backgroundColor: '#111', borderColor: '#111' }]} accessibilityRole="button"><Ionicons name="logo-apple" size={20} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800' }}>Continuar con Apple</Text></Pressable><Pressable onPress={onGoogle} style={[authStitch.social, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="button"><Ionicons name="logo-google" size={18} color="#4285F4" /><Text style={[{ fontWeight: '800' }, { color: colors.text }]}>Continuar con Google</Text></Pressable><Text style={[authStitch.legal, { color: colors.textSecondary }]}>Conexión segura garantizada · Al continuar aceptas nuestras políticas de cultivo y privacidad para comunidades botánicas.</Text></ScrollView></SafeAreaView>;
}

const authStitch = StyleSheet.create({ container: { flex: 1 }, content: { paddingHorizontal: 24, paddingBottom: 36 }, back: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 2 }, backText: { fontWeight: '700' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 28 }, brandText: { fontWeight: '900', letterSpacing: 2 }, kicker: { textAlign: 'center', fontSize: 12, fontWeight: '800', marginTop: 24 }, title: { textAlign: 'center', fontSize: 28, fontWeight: '900', marginTop: 8 }, subtitle: { textAlign: 'center', fontSize: 14, lineHeight: 21, marginTop: 12 }, label: { fontSize: 13, fontWeight: '800', marginTop: 30, marginBottom: 8 }, input: { minHeight: 54, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 }, secure: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 }, primary: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 18 }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' }, divider: { textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginVertical: 24 }, social: { minHeight: 52, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginBottom: 10 }, legal: { textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 18 }, });

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] },
    backBtn: { paddingTop: spacing.lg, paddingBottom: spacing.md },
    backText: { fontSize: fontSize.md },
    heroMascot: { width: 116, height: 116, borderRadius: 58, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
    title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, textAlign: 'center', marginTop: spacing.md },
    subtitle: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing['2xl'], lineHeight: 20 },
    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 52,
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    socialText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    appleBtn: { height: 52, marginBottom: spacing.md },
    divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
    dividerText: { fontSize: fontSize.sm },
    emailModeBtn: {
      height: 48,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emailModeBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    emailModeBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    magicToggle: { alignItems: 'center', paddingVertical: spacing.md },
    magicToggleText: { fontSize: fontSize.md },
    magicForm: { gap: spacing.md },
    input: {
      height: 48,
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.md,
    },
    magicBtn: {
      height: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    magicBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    guestLink: { alignItems: 'center', marginTop: spacing['2xl'], paddingVertical: spacing.sm },
    guestText: { fontSize: fontSize.sm },
  });
