import '../src/i18n';
import { loadSavedLanguage } from '../src/i18n';
import { initSupabase, getSupabase, handleDeepLink, useSession } from '@portfolio/supabase';
import { useOnboarding } from '@portfolio/shared';
import { initAnalytics, track, identifyUser, EVENTS, Sentry } from '../src/analytics';
import { ThemeProvider, huertoColors, huertoPalette } from '@portfolio/ui';
import { Stack, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import i18next from 'i18next';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { loadThemePreference, useThemePreference } from '../src/hooks/useThemePreference';

// Fast Refresh re-evaluates this route while the shared client module survives.
// Reuse that exact client so auth subscribers never point at different clients.
try { getSupabase(); } catch {
  initSupabase(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
}

initAnalytics();

// Make Nunito the default font (patch must run before any Text renders).
applyNunito();
SplashScreen.preventAutoHideAsync().catch(() => {});

const MASCOT_BOOT_ASSETS = [
  require('../assets/semillin-golden-wave.png'),
  require('../assets/semillin-golden-transparent.png'),
];

// Catches render errors anywhere in the route tree (expo-router convention).
// Deliberately theme-free: the crash may have happened inside ThemeProvider.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: huertoColors.background }}>
        <Ionicons name="alert-circle-outline" size={52} color={huertoColors.error} />
      <Text style={{ fontSize: 20, fontWeight: '700', color: huertoColors.text, textAlign: 'center' }}>
        {i18next.t('errorScreen.title', 'Algo ha salido mal')}
      </Text>
      <Text style={{ fontSize: 14, color: huertoColors.textSecondary, textAlign: 'center' }}>
        {i18next.t('errorScreen.desc', 'Tus datos están a salvo. Vuelve a intentarlo.')}
      </Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={{ marginTop: 8, backgroundColor: huertoColors.primaryDark, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 16, minHeight: 44 }}
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

  useEffect(() => {
    const openNotificationRoute = (response: Notifications.NotificationResponse) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as any);
    };
    const sub = Notifications.addNotificationResponseReceivedListener(openNotificationRoute);
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotificationRoute(response);
    }).catch(() => {});
    return () => sub.remove();
  }, [router]);

  // Tie analytics + Sentry errors to the signed-in user.
  useEffect(() => {
    if (user?.id) identifyUser(user.id);
  }, [user?.id]);

  return null;
}

/**
 * Stitch's source screens are phone compositions. Expo Go naturally supplies
 * that viewport on iOS; keeping the same bound on web makes localhost a
 * faithful preview instead of silently turning the mobile UI into a desktop
 * dashboard.
 */
function MobileViewport({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.webStage}>
      <View style={styles.mobileFrame}>{children}</View>
    </View>
  );
}

function RootLayout() {
  const { preference: themePreference } = useThemePreference();
  const [mascotAssetsLoaded, setMascotAssetsLoaded] = React.useState(false);
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    ...Ionicons.font,
  });

  useEffect(() => {
    let cancelled = false;
    Asset.loadAsync(MASCOT_BOOT_ASSETS)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMascotAssetsLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (fontsLoaded && mascotAssetsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, mascotAssetsLoaded]);

  useEffect(() => {
    const webDocument = (globalThis as {
      document?: {
        documentElement: { style: { fontFamily: string } };
        body: { style: { fontFamily: string } };
      };
    }).document;
    if (Platform.OS !== 'web' || !webDocument) return;
    const prototypeFontStack = 'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif';
    webDocument.documentElement.style.fontFamily = prototypeFontStack;
    webDocument.body.style.fontFamily = prototypeFontStack;
  }, []);

  useEffect(() => {
    void loadThemePreference();
  }, []);

  if (!fontsLoaded || !mascotAssetsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: huertoColors.background }}>
        <ActivityIndicator size="small" color={huertoColors.primary} />
        <Text style={{ color: huertoColors.text, fontSize: 15, fontWeight: '600' }}>
          {i18next.t('common.loading', 'Cargando…')}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ThemeProvider palette={huertoPalette} colorScheme={themePreference === 'system' ? undefined : themePreference}>
        <StatusBar style="auto" />
        <AppServices />
        <MobileViewport>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="auth/index" />
            <Stack.Screen name="auth/magic-sent" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="first-crop" />
            <Stack.Screen name="coach-demo" />
            <Stack.Screen name="mascot-picker" />
            <Stack.Screen name="volume-calculator" />
            <Stack.Screen
              name="plant/new"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="modal/add-plant"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="plant/[id]" />
            <Stack.Screen
              name="plant/follow-up"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
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
            <Stack.Screen
              name="modal/check-soil-sheet"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </Stack>
        </MobileViewport>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  webStage: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? '#E9E7DE' : 'transparent',
  },
  mobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    overflow: 'hidden',
    backgroundColor: huertoColors.background,
    ...(Platform.OS === 'web'
      ? {
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderLeftColor: '#DCE3D5',
          borderRightColor: '#DCE3D5',
        }
      : {}),
  },
});
