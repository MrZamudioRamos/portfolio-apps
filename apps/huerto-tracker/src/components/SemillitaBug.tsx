import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet } from 'react-native';

export type SemillitaPose = 'idle' | 'wave' | 'point' | 'celebrate' | 'worried';

type Props = {
  size?: number;
  animated?: boolean;
  pose?: SemillitaPose;
};

const POSE_SOURCES: Record<SemillitaPose, number> = {
  idle: require('../../assets/semillin-golden-transparent.png'),
  wave: require('../../assets/semillin-golden-wave.png'),
  point: require('../../assets/semillin-golden-point.png'),
  celebrate: require('../../assets/semillin-golden-celebrate.png'),
  worried: require('../../assets/semillin-golden-worried.png'),
};

/**
 * Semillín, the official mascot selected from the Stitch exploration.
 * The exported character is kept as a transparent image so the golden seed
 * reads cleanly over the app's pale green surfaces while the wrapper provides
 * the same subtle float, breathe and sway micro-motion on every platform.
 */
export function SemillitaBug({ size = 76, animated = true, pose = 'idle' }: Props) {
  const float = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const useNativeDriver = Platform.OS !== 'web';

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1450, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(float, { toValue: 0, duration: 1450, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      ]),
    );
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(breathe, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      ]),
    );
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(sway, { toValue: -1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(sway, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      ]),
    );

    floatLoop.start();
    breatheLoop.start();
    swayLoop.start();
    return () => {
      floatLoop.stop();
      breatheLoop.stop();
      swayLoop.stop();
    };
  }, [animated, breathe, float, sway]);

  const animatedStyle = animated
    ? {
        transform: [
          { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [1, -3] }) },
          { rotate: sway.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-3deg', '0deg', '3deg'] }) },
          { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
        ],
      }
    : undefined;

  return (
    <Animated.View style={[styles.wrapper, { width: size, height: size }, animatedStyle]} accessibilityLabel="Semillita, la mascota de la app">
      <Image
        accessibilityLabel="Semillín, la semilla dorada de Semilla"
        resizeMode="contain"
        source={POSE_SOURCES[pose]}
        style={styles.image}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
