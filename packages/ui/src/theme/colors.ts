export interface AppColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  success: string;
  warning: string;
  error: string;
}

export interface ColorPalette {
  light: AppColors;
  dark: AppColors;
}

// ── Huerto (greens) ──────────────────────────────────────────────────────────
export const huertoColors: AppColors = {
  primary: '#2D7A3A',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  secondary: '#8B6914',
  background: '#FAFAF5',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F8E9',
  border: '#C8E6C9',
  text: '#1A2E1A',
  textSecondary: '#4A6741',
  textDisabled: '#A5C8A5',
  success: '#388E3C',
  warning: '#F9A825',
  error: '#C62828',
};

export const huertoDarkColors: AppColors = {
  primary: '#66BB6A',
  primaryLight: '#81C784',
  primaryDark: '#4CAF50',
  secondary: '#CDAA7D',
  background: '#0D160D',
  surface: '#162516',
  surfaceAlt: '#1C2E1C',
  border: '#2A3E2A',
  text: '#E8F5E9',
  textSecondary: '#A5C8A5',
  textDisabled: '#4A6741',
  success: '#66BB6A',
  warning: '#FFD54F',
  error: '#EF5350',
};

export const huertoPalette: ColorPalette = { light: huertoColors, dark: huertoDarkColors };

// ── Mascota (oranges) ────────────────────────────────────────────────────────
export const mascotaColors: AppColors = {
  primary: '#E67E22',
  primaryLight: '#F39C12',
  primaryDark: '#D35400',
  secondary: '#8E44AD',
  background: '#FFFCF8',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF3E0',
  border: '#FFE0B2',
  text: '#2C1810',
  textSecondary: '#6D4C41',
  textDisabled: '#FFCC80',
  success: '#27AE60',
  warning: '#F39C12',
  error: '#C0392B',
};

export const mascotaDarkColors: AppColors = {
  primary: '#FFB74D',
  primaryLight: '#FFCC80',
  primaryDark: '#FF9800',
  secondary: '#CE93D8',
  background: '#170D08',
  surface: '#2C1810',
  surfaceAlt: '#3A2010',
  border: '#4A2C1A',
  text: '#FFF3E0',
  textSecondary: '#FFCC80',
  textDisabled: '#6D4C41',
  success: '#66BB6A',
  warning: '#FFD54F',
  error: '#EF5350',
};

export const mascotaPalette: ColorPalette = { light: mascotaColors, dark: mascotaDarkColors };

// ── Coche (blues) ────────────────────────────────────────────────────────────
export const cocheColors: AppColors = {
  primary: '#1565C0',
  primaryLight: '#1976D2',
  primaryDark: '#0D47A1',
  secondary: '#546E7A',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#E3F2FD',
  border: '#BBDEFB',
  text: '#0D1B2A',
  textSecondary: '#37474F',
  textDisabled: '#90CAF9',
  success: '#2E7D32',
  warning: '#F57F17',
  error: '#B71C1C',
};

export const cocheDarkColors: AppColors = {
  primary: '#64B5F6',
  primaryLight: '#90CAF9',
  primaryDark: '#2196F3',
  secondary: '#90A4AE',
  background: '#050D1A',
  surface: '#0D1B2A',
  surfaceAlt: '#152232',
  border: '#1E3244',
  text: '#E3F2FD',
  textSecondary: '#90CAF9',
  textDisabled: '#37474F',
  success: '#66BB6A',
  warning: '#FFD54F',
  error: '#EF5350',
};

export const cochePalette: ColorPalette = { light: cocheColors, dark: cocheDarkColors };

// ── Stitch (pinks) ───────────────────────────────────────────────────────────
export const stitchColors: AppColors = {
  primary: '#AD1457',
  primaryLight: '#E91E63',
  primaryDark: '#880E4F',
  secondary: '#6A1B9A',
  background: '#FFF8FC',
  surface: '#FFFFFF',
  surfaceAlt: '#FCE4EC',
  border: '#F8BBD9',
  text: '#2A0A1A',
  textSecondary: '#6A1B4D',
  textDisabled: '#F48FB1',
  success: '#2E7D32',
  warning: '#F57F17',
  error: '#B71C1C',
};

export const stitchDarkColors: AppColors = {
  primary: '#F06292',
  primaryLight: '#F48FB1',
  primaryDark: '#E91E63',
  secondary: '#CE93D8',
  background: '#15000A',
  surface: '#2A0A1A',
  surfaceAlt: '#350F22',
  border: '#4A1530',
  text: '#FCE4EC',
  textSecondary: '#F48FB1',
  textDisabled: '#6A1B4D',
  success: '#66BB6A',
  warning: '#FFD54F',
  error: '#EF5350',
};

export const stitchPalette: ColorPalette = { light: stitchColors, dark: stitchDarkColors };
