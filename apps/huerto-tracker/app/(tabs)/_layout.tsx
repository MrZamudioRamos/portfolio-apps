import { useOnboarding } from '@portfolio/shared';
import { useSession } from '@portfolio/supabase';
import { useColors, useTheme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const PILL_H = 62;
const BUBBLE_SIZE = PILL_H - 10;
const PILL_MARGIN_TOP = 8;
const PILL_GAP_BOTTOM = 10;
const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

type TabBarProps = {
  state: { routes: Array<{ key: string; name: string }>; index: number };
  descriptors: Record<string, { options: any }>;
  navigation: { navigate: (name: string) => void; emit: (event: any) => any };
};

function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [pillWidth, setPillWidth] = useState(0);
  const bubbleX = useSharedValue(0);
  const isFirstLayout = useRef(true);

  const visibleRoutes = state.routes.filter(
    (r) => (descriptors[r.key].options as any).href !== null
  );
  const numTabs = visibleRoutes.length;
  const activeVisibleIdx = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key
  );
  const tabW = pillWidth > 0 ? pillWidth / numTabs : 0;

  useEffect(() => {
    if (tabW <= 0 || activeVisibleIdx < 0) return;
    const target = tabW * activeVisibleIdx + (tabW - BUBBLE_SIZE) / 2;
    if (isFirstLayout.current) {
      bubbleX.value = target;
      isFirstLayout.current = false;
    } else {
      bubbleX.value = withSpring(target, { damping: 18, stiffness: 220, mass: 0.7 });
    }
  }, [activeVisibleIdx, tabW]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bubbleX.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: insets.bottom + PILL_GAP_BOTTOM,
        left: 12,
        right: 12,
        height: PILL_H,
      }}
    >
      {/* Shadow wrapper — can't be inside overflow:hidden */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: PILL_H / 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.45 : 0.15,
          shadowRadius: 18,
          elevation: 12,
        }}
      />

      {/* Clipped pill content */}
      <View
        style={{ flex: 1, borderRadius: PILL_H / 2, overflow: 'hidden' }}
        onLayout={(e) => setPillWidth(e.nativeEvent.layout.width)}
      >
        {/* Glass background */}
        {glassAvailable ? (
          <GlassView
            style={StyleSheet.absoluteFill}
            glassEffectStyle="regular"
            colorScheme={isDark ? 'dark' : 'light'}
          />
        ) : Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 60 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(22,37,22,0.7)'
                  : 'rgba(255,255,255,0.75)',
              },
            ]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(22,37,22,0.96)'
                  : 'rgba(255,255,255,0.96)',
              },
            ]}
          />
        )}

        {/* Border overlay */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: PILL_H / 2,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: isDark
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(0,0,0,0.08)',
            },
          ]}
          pointerEvents="none"
        />

        {/* Animated glass bubble */}
        {pillWidth > 0 && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: (PILL_H - BUBBLE_SIZE) / 2,
                left: 0,
                width: BUBBLE_SIZE,
                height: BUBBLE_SIZE,
                borderRadius: BUBBLE_SIZE / 2,
                overflow: 'hidden',
              },
              bubbleStyle,
            ]}
            pointerEvents="none"
          >
            {glassAvailable ? (
              <GlassView
                style={StyleSheet.absoluteFill}
                glassEffectStyle="regular"
                colorScheme={isDark ? 'dark' : 'light'}
              />
            ) : Platform.OS === 'ios' ? (
              <BlurView
                intensity={isDark ? 90 : 50}
                tint={isDark ? 'light' : 'dark'}
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)',
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.primary + '28',
                    borderWidth: 1.5,
                    borderColor: colors.primary + '55',
                    borderRadius: BUBBLE_SIZE / 2,
                  },
                ]}
              />
            )}
          </Animated.View>
        )}

        {/* Tab buttons */}
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {visibleRoutes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = route.key === state.routes[state.index]?.key;
            const color = focused ? colors.text : colors.textSecondary;

            return (
              <Pressable
                key={route.key}
                onPress={() => {
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
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.title}
              >
                {options.tabBarIcon?.({ color, size: 22, focused })}
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: focused ? '700' : '400',
                    color,
                  }}
                >
                  {options.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

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

  const tabBarHeight = PILL_MARGIN_TOP + PILL_H + PILL_GAP_BOTTOM + insets.bottom;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        // Tells expo-router how much bottom space to reserve for content insets
        tabBarStyle: {
          position: 'absolute',
          height: tabBarHeight,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
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
