import { ThemeProvider, huertoPalette } from '@portfolio/ui';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider palette={huertoPalette}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
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
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
