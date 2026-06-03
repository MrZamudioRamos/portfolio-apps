import { StyleSheet, Text, TextInput } from 'react-native';

// Map the fontWeight used across the app to the matching Nunito family
// (@expo-google-fonts exposes one family per weight).
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

function injectFont(type: any, props: any): any {
  if ((type !== Text && type !== TextInput) || !props) return props;
  const flat = StyleSheet.flatten(props.style) || {};
  const family =
    flat.fontFamily ?? WEIGHT_TO_FAMILY[String(flat.fontWeight ?? '400')] ?? 'Nunito_400Regular';
  return { ...props, style: [{ fontFamily: family }, props.style] };
}

function patchRuntime(label: string, mod: any, fnNames: string[]): void {
  if (!mod) return;
  for (const fn of fnNames) {
    const orig = mod[fn];
    if (typeof orig !== 'function' || orig.__fontPatched) continue;
    const patched = function (type: any, props: any, ...rest: any[]) {
      return orig(type, injectFont(type, props), ...rest);
    };
    (patched as any).__fontPatched = true;
    mod[fn] = patched;
  }
  void label;
}

/**
 * Make Nunito the default app font by patching the JSX runtime (the shared
 * singleton every compiled file calls), so every <Text>/<TextInput> gets the
 * right Nunito family regardless of how it was imported. Call once at startup,
 * before the first render, with the Nunito_* families loaded.
 */
export function applyNunito(): void {
  // Static require literals so Metro can resolve them.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    patchRuntime('jsx-runtime', require('react/jsx-runtime'), ['jsx', 'jsxs']);
  } catch {
    /* ignore */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    patchRuntime('jsx-dev-runtime', require('react/jsx-dev-runtime'), ['jsxDEV']);
  } catch {
    /* dev runtime absent in prod */
  }
}
