import { useOnboarding } from '@portfolio/shared';
import { useSession } from '@portfolio/supabase';
import { useTheme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const TAB_BAR_HEIGHT = 64;

// Shared clearance for scroll content below the stable Stitch navigation bar.
export const TAB_BAR_BOTTOM_CLEARANCE = TAB_BAR_HEIGHT + 16;

type TabBarProps = {
  state: { routes: Array<{ key: string; name: string }>; index: number };
  descriptors: Record<string, { options: any }>;
  navigation: { navigate: (name: string) => void; emit: (event: any) => any };
};

function StitchTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter(
    (route) => typeof descriptors[route.key]?.options.tabBarIcon === 'function'
  );

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}>
      <View
        style={[
          styles.bar,
          {
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = route.key === state.routes[state.index]?.key;
          const color = focused ? colors.primaryDark : colors.textSecondary;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.title}
              style={({ pressed }) => [
                styles.tab,
                focused && { backgroundColor: `${colors.primary}14` },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {options.tabBarIcon?.({ color, size: focused ? 24 : 23, focused })}
              <Text
                numberOfLines={1}
                style={{
                  color,
                  fontSize: 11,
                  fontWeight: focused ? fontWeight.bold : fontWeight.medium,
                  marginTop: 2,
                }}
              >
                {options.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { completed, isLoading: onboardingLoading } = useOnboarding('huerto');
  const { loading: sessionLoading, isAuthenticated } = useSession();
  const { t } = useTranslation();

  if (onboardingLoading || sessionLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (!completed) {
    if (isAuthenticated) return <Redirect href="/onboarding" />;
    return <Redirect href="/welcome" />;
  }

  return (
    <Tabs
      tabBar={(props) => <StitchTabBar {...(props as any)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: t('tabs.plants'),
          tabBarIcon: ({ color, size }) => <Ionicons name="flower-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: t('tabs.plants'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flower-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendarNav'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="diary" options={{ href: null }} />
      <Tabs.Screen name="tools" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginVertical: 6,
    marginHorizontal: 3,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
