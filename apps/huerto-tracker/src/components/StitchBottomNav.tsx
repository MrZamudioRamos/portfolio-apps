import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@portfolio/ui';

export type StitchNavKey = 'today' | 'map' | 'plants' | 'calendar';

const ITEMS: Array<{ key: StitchNavKey; label: string; icon: keyof typeof Ionicons.glyphMap; href: string }> = [
  { key: 'today', label: 'Hoy', icon: 'leaf-outline', href: '/(tabs)' },
  { key: 'map', label: 'Mapa', icon: 'map-outline', href: '/(tabs)/map' },
  { key: 'plants', label: 'Plantas', icon: 'flower-outline', href: '/(tabs)/plants' },
  { key: 'calendar', label: 'Calendario', icon: 'calendar-outline', href: '/(tabs)/calendar' },
];

/** Reusable Stitch navigation for screens outside the Expo Router tabs group. */
export function StitchBottomNav({ active }: { active?: StitchNavKey | null }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, fontWeight } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {ITEMS.map((item) => {
        const selected = active === item.key;
        const color = selected ? colors.primaryDark : colors.textSecondary;
        return (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.href as never)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            style={({ pressed }) => [styles.tab, selected && { backgroundColor: `${colors.primary}14` }, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name={item.icon} size={selected ? 24 : 23} color={color} />
            <Text style={{ color, fontSize: 11, fontWeight: selected ? fontWeight.bold : fontWeight.medium, marginTop: 2 }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginVertical: 6,
    marginHorizontal: 3,
  },
});
