import '../src/i18n';
import { loadSavedLanguage } from '../src/i18n';
import { initSupabase, handleDeepLink } from '@portfolio/supabase';
import { ThemeProvider, huertoPalette } from '@portfolio/ui';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSyncProvider } from '../src/sync/useSyncProvider';

initSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

function AppServices() {
  const router = useRouter();
  useSyncProvider();

  useEffect(() => {
    loadSavedLanguage();
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url).then(() => {
        router.replace('/onboarding');
      });
    });
    return () => sub.remove();
  }, []);

  return null;
}

export default function RootLayout() {
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
          <Stack.Screen name="gardens" />
          <Stack.Screen name="rotation" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
