import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useColors } from '@portfolio/ui';

interface Props {
  visible: boolean;
  /** Size of the circle */
  size?: number;
}

/**
 * Full-screen overlay that flashes a green checkmark burst on success actions.
 * Plays when visible=true, auto-hides after the animation completes.
 */
export function SuccessBurst({ visible, size = 90 }: Props) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0);
    opacity.setValue(1);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.delay(400),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={s.overlay}>
        <Animated.View
          style={[
            s.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.primary,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <Animated.Text style={[s.check, { fontSize: size * 0.5, color: colors.background }]}>✓</Animated.Text>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#fff', fontWeight: '700' },
});
