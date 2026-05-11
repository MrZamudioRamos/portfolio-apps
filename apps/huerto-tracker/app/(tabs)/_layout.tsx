import { useOnboarding } from '@portfolio/shared';
import { useSession } from '@portfolio/supabase';
import { useColors, useTheme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const PILL_H = 62;
const PILL_MARGIN_TOP = 8;
const PILL_GAP_BOTTOM = 10; // gap between pill bottom and safe area

export default function TabsLayout() {
  const { completed, isLoading: onboardingLoading } = useOnboarding('huerto');
  const { loading: sessionLoading, isAuthenticated } = useSession();
  const colors = useColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (onboardingLoading || sessionLoading) return null;

  if (!completed) {
    if (isAuthenticated) return <Redirect href="/onboarding" />;
    return <Redirect href="/welcome" />;
  }

  // Total tab bar height: pill + top gap + gap to safe area + safe area itself
  const tabBarHeight = PILL_MARGIN_TOP + PILL_H + PILL_GAP_BOTTOM + insets.bottom;
  // Push tab items up so they sit inside the pill, not in the safe area
  const tabBarPaddingBottom = PILL_GAP_BOTTOM + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: PILL_MARGIN_TOP,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {/* Pill glass background */}
            <View
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                top: PILL_MARGIN_TOP,
                height: PILL_H,
                borderRadius: PILL_H / 2,
                overflow: 'hidden',
                // shadow (shows on iOS, elevation handles Android)
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDark ? 0.45 : 0.15,
                shadowRadius: 18,
              }}
            >
              {Platform.OS === 'ios' ? (
                <BlurView
                  intensity={isDark ? 60 : 80}
                  tint={isDark ? 'dark' : 'light'}
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(22, 37, 22, 0.7)'
                        : 'rgba(255, 255, 255, 0.75)',
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(22, 37, 22, 0.96)'
                        : 'rgba(255, 255, 255, 0.96)',
                      elevation: 12,
                    },
                  ]}
                />
              )}
              {/* Subtle border overlay */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: PILL_H / 2,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              />
            </View>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: t('tabs.diary'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="journal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
