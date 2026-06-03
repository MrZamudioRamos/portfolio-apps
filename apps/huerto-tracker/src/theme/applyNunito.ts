import React from 'react';
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

  Component.render = function patchedRender(...args: any[]) {
    const element = original.apply(this, args);
    try {
      const props = args[0] ?? {};
      const flat = StyleSheet.flatten(props.style) || {};
      // Respect an explicit fontFamily; otherwise derive it from the weight.
      const family = flat.fontFamily ?? WEIGHT_TO_FAMILY[String(flat.fontWeight ?? '400')] ?? 'Nunito_400Regular';
      return React.cloneElement(element, {
        style: [{ fontFamily: family }, props.style],
      });
    } catch {
      return element;
    }
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
