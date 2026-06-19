import { useOnboarding } from '@portfolio/shared';
import { useSession } from '@portfolio/supabase';
import { useTheme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const PILL_H = 64;
const PILL_GAP_BOTTOM = 12;

export const FLOATING_TAB_BOTTOM_CLEARANCE = PILL_H + PILL_GAP_BOTTOM + 8;

// 0 = expanded, 1 = collapsed to circle
export const collapseAnim = new Animated.Value(0);
let _isHidden = false;

export function showTabBar() {
  _isHidden = false;
  Animated.spring(collapseAnim, {
    toValue: 0,
    useNativeDriver: false,
    tension: 70,
    friction: 11,
  }).start();
}

export function hideTabBar() {
  _isHidden = true;
  Animated.spring(collapseAnim, {
    toValue: 1,
    useNativeDriver: false,
    tension: 70,
    friction: 11,
  }).start();
}

type TabBarProps = {
  state: { routes: Array<{ key: string; name: string }>; index: number };
  descriptors: Record<string, { options: any }>;
  navigation: { navigate: (name: string) => void; emit: (event: any) => any };
};

const PILL_BG = 'rgba(18, 18, 18, 0.97)';
const PILL_BORDER = 'rgba(255, 255, 255, 0.08)';
const ACTIVE_BG = 'rgba(255, 255, 255, 0.13)';

function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Track collapse state reactively for pointerEvents
  useEffect(() => {
    const id = collapseAnim.addListener(({ value }) => setIsCollapsed(value > 0.5));
    return () => collapseAnim.removeListener(id);
  }, []);

  const fullWidth = screenWidth - 24;

  const visibleRoutes = state.routes.filter(
    (r) => typeof descriptors[r.key].options.tabBarIcon === 'function'
  );
  const activeVisibleIdx = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key
  );
  const activeRoute = visibleRoutes[activeVisibleIdx];
  const activeOptions = activeRoute ? descriptors[activeRoute.key]?.options : null;

  // Width shrinks from full → PILL_H (circle) when hidden
  const pillWidth = collapseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [fullWidth, PILL_H],
  });

  // Tab row fades out early in the collapse
  const tabRowOpacity = collapseAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [1, 0, 0],
  });

  // Collapsed icon fades in at the end
  const restoreOpacity = collapseAnim.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Shadow layer — same animated width, no overflow clipping */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + PILL_GAP_BOTTOM,
          left: 12,
          width: pillWidth,
          height: PILL_H,
          borderRadius: PILL_H / 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.45,
          shadowRadius: 20,
          elevation: 14,
        }}
      />

      {/* Pill content */}
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + PILL_GAP_BOTTOM,
          left: 12,
          width: pillWidth,
          height: PILL_H,
          borderRadius: PILL_H / 2,
          backgroundColor: PILL_BG,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: PILL_BORDER,
          overflow: 'hidden',
        }}
      >
        {/* Full tab row */}
        <Animated.View
          pointerEvents={isCollapsed ? 'none' : 'box-none'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            opacity: tabRowOpacity,
          }}
        >
          {visibleRoutes.map((route) => {
            const { options } = descriptors[route.key];
            const focused = route.key === state.routes[state.index]?.key;

            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  if (_isHidden) {
                    showTabBar();
                    return;
                  }
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                onLongPress={() =>
                  navigation.emit({ type: 'tabLongPress', target: route.key })
                }
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.title}
              >
                {/* Squircle active background */}
                {focused && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 6,
                      right: 6,
                      bottom: 4,
                      borderRadius: 14,
                      backgroundColor: ACTIVE_BG,
                    }}
                  />
                )}
                {options.tabBarIcon?.({
                  color: focused ? '#fff' : 'rgba(255,255,255,0.45)',
                  size: focused ? 26 : 22,
                  focused,
                })}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 9,
                    fontWeight: focused ? '700' : '400',
                    color: focused ? '#fff' : 'rgba(255,255,255,0.45)',
                    marginTop: 2,
                  }}
                >
                  {options.title}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Collapsed: active icon centered in the circle */}
        <Animated.View
          pointerEvents={isCollapsed ? 'box-none' : 'none'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: PILL_H,
            height: PILL_H,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: restoreOpacity,
          }}
        >
          <Pressable
            onPress={showTabBar}
            accessibilityRole="button"
            accessibilityLabel="Mostrar menú"
            style={{
              width: PILL_H,
              height: PILL_H,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activeOptions?.tabBarIcon?.({ color: '#fff', size: 28, focused: true })}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  const { completed, isLoading: onboardingLoading } = useOnboarding('huerto');
  const { loading: sessionLoading, isAuthenticated } = useSession();
  const { t } = useTranslation();

  if (onboardingLoading || sessionLoading) return null;

  if (!completed) {
    if (isAuthenticated) return <Redirect href="/onboarding" />;
    return <Redirect href="/welcome" />;
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...(props as any)} />}
      screenOptions={{ headerShown: false }}
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
            <Ionicons name="sunny-outline" size={size} color={color} />
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
        name="tools"
        options={{
          title: t('tabs.tools'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
