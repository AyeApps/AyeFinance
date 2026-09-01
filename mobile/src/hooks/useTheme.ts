import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME, ThemeColors, getThemeColors } from '../constants/theme';

const THEME_STORAGE_KEY = '@ayefinance_theme_mode';

interface ThemeState {
  themeMode: 'dark' | 'light';
  colors: ThemeColors;
  isDark: boolean;
  setThemeMode: (mode: 'dark' | 'light') => void;
  toggleTheme: () => void;
  loadSavedTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'dark',
  colors: DARK_THEME,
  isDark: true,

  setThemeMode: async (mode) => {
    set({
      themeMode: mode,
      colors: getThemeColors(mode),
      isDark: mode === 'dark',
    });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {}
  },

  toggleTheme: async () => {
    const nextMode = get().themeMode === 'dark' ? 'light' : 'dark';
    get().setThemeMode(nextMode);
  },

  loadSavedTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        set({
          themeMode: saved,
          colors: getThemeColors(saved),
          isDark: saved === 'dark',
        });
      }
    } catch {}
  },
}));

export const useTheme = () => {
  const { themeMode, colors, isDark, toggleTheme, setThemeMode } = useThemeStore();
  return { themeMode, colors, isDark, toggleTheme, setThemeMode };
};
