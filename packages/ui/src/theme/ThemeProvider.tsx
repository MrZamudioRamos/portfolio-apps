import React, { createContext, useContext } from 'react';
import { AppColors, huertoColors } from './colors';
import { fontWeight, fontSize, radii, shadows, spacing } from './tokens';

export interface Theme {
  colors: AppColors;
  spacing: typeof spacing;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  radii: typeof radii;
  shadows: typeof shadows;
}

const defaultTheme: Theme = {
  colors: huertoColors,
  spacing,
  fontSize,
  fontWeight,
  radii,
  shadows,
};

const ThemeContext = createContext<Theme>(defaultTheme);

interface ThemeProviderProps {
  colors?: AppColors;
  children: React.ReactNode;
}

export function ThemeProvider({ colors, children }: ThemeProviderProps) {
  const theme: Theme = {
    colors: colors ?? huertoColors,
    spacing,
    fontSize,
    fontWeight,
    radii,
    shadows,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useColors(): AppColors {
  return useContext(ThemeContext).colors;
}
