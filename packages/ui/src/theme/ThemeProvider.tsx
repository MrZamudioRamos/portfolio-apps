import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import type { AppColors, ColorPalette } from './colors';
import { huertoColors, huertoDarkColors } from './colors';
import { fontWeight, fontSize, radii, shadows, spacing } from './tokens';

export interface Theme {
  colors: AppColors;
  spacing: typeof spacing;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  radii: typeof radii;
  shadows: typeof shadows;
  isDark: boolean;
}

const defaultTheme: Theme = {
  colors: huertoColors,
  spacing,
  fontSize,
  fontWeight,
  radii,
  shadows,
  isDark: false,
};

const ThemeContext = createContext<Theme>(defaultTheme);

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Pass a full palette (light + dark) for automatic dark mode switching. */
  palette?: ColorPalette;
  /** Legacy: single color set (always light). */
  colors?: AppColors;
  /** Override system color scheme detection. */
  colorScheme?: 'light' | 'dark';
}

export function ThemeProvider({ palette, colors, colorScheme, children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const scheme = colorScheme ?? systemScheme ?? 'light';
  const isDark = scheme === 'dark';

  let resolvedColors: AppColors;
  if (palette) {
    resolvedColors = isDark ? palette.dark : palette.light;
  } else if (colors) {
    resolvedColors = colors;
  } else {
    resolvedColors = isDark ? huertoDarkColors : huertoColors;
  }

  const theme: Theme = {
    colors: resolvedColors,
    spacing,
    fontSize,
    fontWeight,
    radii,
    shadows,
    isDark,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useColors(): AppColors {
  return useContext(ThemeContext).colors;
}
