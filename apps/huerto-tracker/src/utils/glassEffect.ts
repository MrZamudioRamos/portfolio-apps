import React from 'react';
import { View, type ViewProps } from 'react-native';

type GlassViewProps = ViewProps & { glassEffectStyle?: 'regular' | 'clear' | 'identity' | 'none' };

let _GlassView: React.ComponentType<GlassViewProps> = (props) => React.createElement(View, props);
let _GlassContainer: React.ComponentType<ViewProps> = (props) => React.createElement(View, props);
let _isLiquidGlassAvailable = () => false;
let _isGlassEffectAPIAvailable = () => false;

try {
  const mod = require('expo-glass-effect');
  if (mod?.GlassView) _GlassView = mod.GlassView;
  if (mod?.GlassContainer) _GlassContainer = mod.GlassContainer;
  if (typeof mod?.isLiquidGlassAvailable === 'function') {
    _isLiquidGlassAvailable = () => {
      try { return mod.isLiquidGlassAvailable(); } catch { return false; }
    };
  }
  if (typeof mod?.isGlassEffectAPIAvailable === 'function') {
    _isGlassEffectAPIAvailable = () => {
      try { return mod.isGlassEffectAPIAvailable(); } catch { return false; }
    };
  }
} catch {
  // expo-glass-effect unavailable (Expo Go, older iOS, etc.) — fallbacks remain
}

export const GlassView = _GlassView;
export const GlassContainer = _GlassContainer;
export const isLiquidGlassAvailable = _isLiquidGlassAvailable;
export const isGlassEffectAPIAvailable = _isGlassEffectAPIAvailable;
