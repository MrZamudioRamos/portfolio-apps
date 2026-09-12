import { useOnboarding } from '@portfolio/shared';
import { useSession } from '@portfolio/supabase';
import { useTheme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const TAB_BAR_H = 64;
const TAB_BAR_GAP_BOTTOM = 0;
const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

export const FLOATING_TAB_BOTTOM_CLEARANCE = TAB_BAR_H + TAB_BAR_GAP_BOTTOM + 8;

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

function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Track collapse state reactively for pointerEvents
  useEffect(() => {
    const id = collapseAnim.addListener(({ value }) => setIsCollapsed(value > 0.5));
    return () => collapseAnim.removeListener(id);
  }, []);

  const fullWidth = screenWidth;

  const visibleRoutes = state.routes.filter(
    (r) => typeof descriptors[r.key].options.tabBarIcon === 'function'
  );
  const activeVisibleIdx = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key
  );
  const activeRoute = visibleRoutes[activeVisibleIdx];
  const activeOptions = activeRoute ? descriptors[activeRoute.key]?.options : null;

  // The bar collapses to a small restore control while scrolling.
  const tabBarWidth = collapseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [fullWidth, TAB_BAR_H],
  });
  const tabBarLeft = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });

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
      {/* A restrained shadow keeps the compact restore control discoverable. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + TAB_BAR_GAP_BOTTOM,
          left: tabBarLeft,
          width: tabBarWidth,
          height: TAB_BAR_H,
          borderRadius: isCollapsed ? TAB_BAR_H / 2 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.14,
          shadowRadius: 6,
          elevation: 4,
        }}
      />

      {/* Solid navigation bar: predictable, readable, and consistent with the app palette. */}
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + TAB_BAR_GAP_BOTTOM,
          left: tabBarLeft,
          width: tabBarWidth,
          height: TAB_BAR_H,
          borderRadius: isCollapsed ? TAB_BAR_H / 2 : 0,
          overflow: 'hidden',
          backgroundColor: glassAvailable ? 'transparent' : colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        }}
      >
        {glassAvailable ? (
          <GlassView
            style={StyleSheet.absoluteFill}
            glassEffectStyle="regular"
            colorScheme={isDark ? 'dark' : 'light'}
          />
        ) : Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 65 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(18,18,18,0.75)'
                  : 'rgba(255,255,255,0.75)',
              },
            ]}
          />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: isCollapsed ? TAB_BAR_H / 2 : 0,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.08)',
            },
          ]}
          pointerEvents="none"
        />
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
                accessibilityRole="tab"
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
                      borderRadius: 8,
                      backgroundColor: colors.primary + (isDark ? '26' : '16'),
                    }}
                  />
                )}
                {options.tabBarIcon?.({
                  color: focused
                    ? (isDark ? '#fff' : '#111')
                    : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'),
                  size: focused ? 26 : 22,
                  focused,
                })}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    fontWeight: focused ? '700' : '400',
                    color: focused
                      ? (isDark ? '#fff' : '#111')
                      : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'),
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
            width: TAB_BAR_H,
            height: TAB_BAR_H,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: restoreOpacity,
          }}
        >
          <Pressable
            onPress={showTabBar}
            accessibilityRole="button"
            accessibilityLabel={t('common.showMenu')}
            style={{
              width: TAB_BAR_H,
              height: TAB_BAR_H,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activeOptions?.tabBarIcon?.({ color: isDark ? '#fff' : '#111', size: 28, focused: true })}
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
