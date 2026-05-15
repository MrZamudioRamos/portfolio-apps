import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, View } from 'react-native';
import type { ViewProps } from 'react-native';

// Evaluated once at module load — safe for conditional rendering
export const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

interface GlassSheetProps extends ViewProps {
  glassEffectStyle?: 'clear' | 'regular';
  /** Background color applied when glass is unavailable (Android / iOS < 26) */
  fallbackStyle?: ViewProps['style'];
}

export function GlassSheet({
  style,
  fallbackStyle,
  glassEffectStyle = 'regular',
  children,
  ...rest
}: GlassSheetProps) {
  if (glassAvailable) {
    return (
      <GlassView style={style} glassEffectStyle={glassEffectStyle} {...(rest as any)}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[fallbackStyle, style]} {...rest}>
      {children}
    </View>
  );
}
