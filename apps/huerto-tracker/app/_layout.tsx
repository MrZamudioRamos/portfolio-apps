import '../src/i18n';
import { loadSavedLanguage } from '../src/i18n';
import { initSupabase, getSupabase, handleDeepLink, useSession } from '@portfolio/supabase';
import { useOnboarding } from '@portfolio/shared';
import { initAnalytics, track, identifyUser, EVENTS, Sentry } from '../src/analytics';
import { ThemeProvider, huertoPalette } from '@portfolio/ui';
import { Stack, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import i18next from 'i18next';
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSyncProvider } from '../src/sync/useSyncProvider';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { applyNunito } from '../src/theme/applyNunito';

// Fast Refresh re-evaluates this route while the shared client module survives.
// Reuse that exact client so auth subscribers never point at different clients.
try { getSupabase(); } catch {
  initSupabase(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);
}

initAnalytics();

// Make Nunito the default font (patch must run before any Text renders).
applyNunito();
SplashScreen.preventAutoHideAsync().catch(() => {});

// Catches render errors anywhere in the route tree (expo-router convention).
// Deliberately theme-free: the crash may have happened inside ThemeProvider.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: '#FAFAF5' }}>
      <Text style={{ fontSize: 48 }}>🥀</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#2E2E2E', textAlign: 'center' }}>
        {i18next.t('errorScreen.title', 'Algo ha salido mal')}
      </Text>
      <Text style={{ fontSize: 14, color: '#757575', textAlign: 'center' }}>
        {i18next.t('errorScreen.desc', 'Tus datos están a salvo. Vuelve a intentarlo.')}
      </Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={{ marginTop: 8, backgroundColor: '#2E7D32', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {i18next.t('errorScreen.retry', 'Reintentar')}
        </Text>
      </Pressable>
    </View>
  );
}

function AppServices() {
  const router = useRouter();
  const { completed: onboardingDone } = useOnboarding('huerto');
  const { user } = useSession();
  useSyncProvider();

  useEffect(() => {
    track(EVENTS.appOpen);
    loadSavedLanguage();
  }, []);
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      // Only navigate on successful exchange — a rejected handleDeepLink
      // means the user is NOT authenticated, so we stay put rather than
      // landing on /(tabs) with an empty logged-in state.
      handleDeepLink(url)
        .then(() => router.replace(onboardingDone ? '/(tabs)' : '/onboarding'))
        .catch(() => { /* auth exchange failed; stay on current route */ });
    });
    return () => sub.remove();
  }, [onboardingDone]);

  // Tie analytics + Sentry errors to the signed-in user.
  useEffect(() => {
    if (user?.id) identifyUser(user.id);
  }, [user?.id]);

  return null;
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ThemeProvider palette={huertoPalette}>
        <StatusBar style="auto" />
        <AppServices />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth/index" />
          <Stack.Screen name="auth/magic-sent" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="first-crop" />
          <Stack.Screen
            name="plant/new"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="plant/[id]" />
          <Stack.Screen
            name="entry/new"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="paywall"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="reminder/new"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="garden/edit" />
          <Stack.Screen name="garden/map" />
          <Stack.Screen name="settings/backup" />
          <Stack.Screen name="settings/notifications" />
          <Stack.Screen name="stats" />
          <Stack.Screen name="companions" />
          <Stack.Screen name="disease-guide" />
          <Stack.Screen name="catalog" />
          <Stack.Screen name="gardens" />
          <Stack.Screen name="rotation" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
