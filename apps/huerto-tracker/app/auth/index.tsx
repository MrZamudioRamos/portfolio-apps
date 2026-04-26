import { signInWithApple, signInWithGoogle, signInWithMagicLink } from '@portfolio/supabase';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import * as AppleAuthentication from 'expo-apple-authentication';
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

export default function AuthScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();

  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function handleGoogle() {
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
      router.replace('/onboarding');
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
      router.replace('/onboarding');
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('common.error'), t('auth.errorApple'));
      }
    } finally {
      setLoadingApple(false);
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      Alert.alert(t('auth.errorEmailRequired'), t('auth.errorEmailRequiredDesc'));
      return;
    }
    setLoadingMagic(true);
    try {
      await signInWithMagicLink(email.trim().toLowerCase());
      router.push('/auth/magic-sent');
    } catch {
      Alert.alert(t('common.error'), t('auth.errorMagicLink'));
    } finally {
      setLoadingMagic(false);
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
            <Text style={[s.backText, { color: colors.primary }]}>{t('common.back')}</Text>
          </Pressable>

          <Text style={s.heroEmoji}>🌱</Text>
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
            <Text style={s.socialIcon}>🌐</Text>
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

          {/* Magic link toggle */}
          {!showMagicLink ? (
            <Pressable
              onPress={() => setShowMagicLink(true)}
              style={({ pressed }) => [s.magicToggle, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[s.magicToggleText, { color: colors.primary }]}>
                {t('auth.emailLink')}
              </Text>
            </Pressable>
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
              <Pressable
                onPress={handleMagicLink}
                disabled={loadingMagic}
                style={({ pressed }) => [
                  s.magicBtn,
                  { backgroundColor: colors.primary, opacity: pressed || loadingMagic ? 0.7 : 1 },
                ]}
              >
                <Text style={s.magicBtnText}>
                  {loadingMagic ? t('auth.sending') : t('auth.sendMagicLink')}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Guest link */}
          <Pressable
            onPress={() => router.replace('/onboarding')}
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
    heroEmoji: { fontSize: 56, textAlign: 'center', marginTop: spacing.xl },
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
    socialIcon: { fontSize: 20 },
    socialText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    appleBtn: { height: 52, marginBottom: spacing.md },
    divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
    dividerText: { fontSize: fontSize.sm },
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
