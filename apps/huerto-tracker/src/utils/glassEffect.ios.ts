import { View } from 'react-native';

let _GlassView: any = View;
let _GlassContainer: any = View;
let _moduleLoaded = false;

try {
  const m = require('expo-glass-effect');
  _GlassView = m.GlassView;
  _GlassContainer = m.GlassContainer;
  _moduleLoaded = true;
} catch {}

export const GlassView = _GlassView;
export const GlassContainer = _GlassContainer;

export function isLiquidGlassAvailable(): boolean {
  if (!_moduleLoaded) return false;
  try {
    return require('expo-glass-effect').isLiquidGlassAvailable();
  } catch {
    return false;
  }
}
