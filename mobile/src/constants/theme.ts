/**
 * AyeFinance Neo-Brutalist Cyber Design System
 * Shared Theme DNA with AyeTasks and AyeVideoDownloader
 */

export interface ThemeColors {
  bgBase: string;
  bgSecondary: string;
  bgSurface: string;
  bgCard: string;
  bgInvert: string;

  borderColor: string;
  borderMuted: string;
  borderAccent: string;

  accent: string;
  accentHover: string;
  accentSubtle: string;

  accentSuccess: string;
  accentSuccessHover: string;
  accentSuccessSubtle: string;

  accentDanger: string;
  accentDangerSubtle: string;
  accentWarning: string;
  accentWarningSubtle: string;

  textPrimary: string;
  textInvert: string;
  textSecondary: string;
  textMuted: string;

  shadowColor: string;
  gridDotColor: string;
}

export const DARK_THEME: ThemeColors = {
  bgBase: '#050505',
  bgSecondary: '#0d0d0d',
  bgSurface: '#121212',
  bgCard: '#181818',
  bgInvert: '#ffffff',

  borderColor: '#ffffff',
  borderMuted: '#2a2a2a',
  borderAccent: '#FE9D01',

  accent: '#FE9D01',
  accentHover: '#FFAF20',
  accentSubtle: '#2D1A00',

  accentSuccess: '#10B981',
  accentSuccessHover: '#059669',
  accentSuccessSubtle: '#064e3b',

  accentDanger: '#EF4444',
  accentDangerSubtle: '#450a0a',
  accentWarning: '#F59E0B',
  accentWarningSubtle: '#451a03',

  textPrimary: '#f5f5f5',
  textInvert: '#050505',
  textSecondary: '#8a8a8a',
  textMuted: '#555555',

  shadowColor: '#FE9D01',
  gridDotColor: 'rgba(255, 255, 255, 0.15)',
};

export const LIGHT_THEME: ThemeColors = {
  bgBase: '#ffffff',
  bgSecondary: '#f7f7f7',
  bgSurface: '#eeeeee',
  bgCard: '#e6e6e6',
  bgInvert: '#050505',

  borderColor: '#000000',
  borderMuted: '#cccccc',
  borderAccent: '#E68A00',

  accent: '#E68A00',
  accentHover: '#D47D00',
  accentSubtle: '#FFF3E0',

  accentSuccess: '#059669',
  accentSuccessHover: '#047857',
  accentSuccessSubtle: '#d1fae5',

  accentDanger: '#DC2626',
  accentDangerSubtle: '#fee2e2',
  accentWarning: '#D97706',
  accentWarningSubtle: '#fef3c7',

  textPrimary: '#111111',
  textInvert: '#ffffff',
  textSecondary: '#555555',
  textMuted: '#888888',

  shadowColor: '#000000',
  gridDotColor: 'rgba(0, 0, 0, 0.12)',
};

export const THEME = {
  colors: DARK_THEME,
  borders: {
    thick: 2,
    thin: 1,
  },
  radius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
} as const;

export function getThemeColors(mode: 'dark' | 'light'): ThemeColors {
  return mode === 'light' ? LIGHT_THEME : DARK_THEME;
}
