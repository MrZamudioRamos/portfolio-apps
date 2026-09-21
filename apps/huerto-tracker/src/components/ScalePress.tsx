import React, { useRef } from 'react';
import { Animated, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ScalePressProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale factor while pressed. Default 0.96 */
  pressedScale?: number;
}

/**
 * Pressable with spring scale feedback. Drop-in for Pressable when the
 * style is a plain StyleProp (no ({pressed}) function styles).
 */
export function ScalePress({ style, pressedScale = 0.96, onPress, onPressIn, onPressOut, children, ...rest }: ScalePressProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 6 }).start();

  const handlePressIn: NonNullable<PressableProps['onPressIn']> = (e) => {
    springTo(pressedScale);
    onPressIn?.(e);
  };

  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (e) => {
    springTo(1);
    onPressOut?.(e);
  };

  // Animated.createAnimatedComponent(Pressable) can swallow native pointer
  // clicks in the web renderer. Keep the interaction reliable in the browser;
  // native builds retain the spring feedback.
  if (Platform.OS === 'web') {
    return (
      <Pressable
        accessibilityRole="button"
        {...rest}
        onPress={onPress}
        style={style}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
