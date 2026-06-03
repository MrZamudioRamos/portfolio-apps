import { StyleSheet, Text, TextInput } from 'react-native';

// Map the fontWeight used across the app to the matching Nunito family
// (@expo-google-fonts exposes one family per weight, so fontWeight alone
// wouldn't pick the right face).
const WEIGHT_TO_FAMILY: Record<string, string> = {
  '100': 'Nunito_400Regular',
  '200': 'Nunito_400Regular',
  '300': 'Nunito_400Regular',
  '400': 'Nunito_400Regular',
  normal: 'Nunito_400Regular',
  '500': 'Nunito_500Medium',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
  bold: 'Nunito_700Bold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_800ExtraBold',
};

function patch(Component: any): void {
  const original = Component?.render;
  if (typeof original !== 'function' || Component.__nunitoPatched) return;

  // Inject fontFamily into the INPUT props (before the original render), so the
  // component applies it to the real native text element. Modifying the output
  // element doesn't work because Text.render wraps it in a context provider.
  Component.render = function patchedRender(props: any, ref: any) {
    const flat = StyleSheet.flatten(props?.style) || {};
    const family =
      flat.fontFamily ?? WEIGHT_TO_FAMILY[String(flat.fontWeight ?? '400')] ?? 'Nunito_400Regular';
    const nextProps = { ...props, style: [{ fontFamily: family }, props?.style] };
    return original.call(this, nextProps, ref);
  };
  Component.__nunitoPatched = true;
}

/**
 * Make Nunito the default app font (mapping each weight to its family).
 * Call once at startup, before the fonts are needed. Must be paired with
 * loading the Nunito_* families and holding the splash until they're ready.
 */
export function applyNunito(): void {
  patch(Text);
  patch(TextInput);
}
