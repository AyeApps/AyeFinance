import { Appearance } from 'react-native';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME, ThemeColors, getThemeColors } from '../constants/theme';

export type ThemePreference = 'system' | 'dark' | 'light';
export type ThemeMode = 'dark' | 'light';

export const resolveEffectiveTheme = (preference: ThemePreference): ThemeMode => {
  if (preference === 'system') {
    const sys = Appearance.getColorScheme();
    return sys === 'light' ? 'light' : 'dark';
  }
  return preference;
};

const THEME_STORAGE_KEY = '@ayefinance_theme_mode';

interface ThemeState {
  themePreference: ThemePreference;
  themeMode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setThemePreference: (mode: ThemePreference) => void;
  toggleTheme: () => void;
  loadSavedTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themePreference: 'dark',
  themeMode: 'dark',
  colors: DARK_THEME,
  isDark: true,

  setThemePreference: async (preference: ThemePreference) => {
    const effective = resolveEffectiveTheme(preference);
    set({
      themePreference: preference,
      themeMode: effective,
      colors: getThemeColors(effective),
      isDark: effective === 'dark',
    });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {}
  },

  toggleTheme: async () => {
    const currentMode = get().themeMode;
    const nextMode: ThemePreference = currentMode === 'dark' ? 'light' : 'dark';
    get().setThemePreference(nextMode);
  },

  loadSavedTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const preference: ThemePreference =
        saved === 'dark' || saved === 'light' || saved === 'system'
          ? (saved as ThemePreference)
          : 'dark';

      const effective = resolveEffectiveTheme(preference);
      set({
        themePreference: preference,
        themeMode: effective,
        colors: getThemeColors(effective),
        isDark: effective === 'dark',
      });

      // Listen for OS scheme change if system is selected
      Appearance.addChangeListener(({ colorScheme }) => {
        if (get().themePreference === 'system') {
          const sysEffective: ThemeMode = colorScheme === 'light' ? 'light' : 'dark';
          set({
            themeMode: sysEffective,
            colors: getThemeColors(sysEffective),
            isDark: sysEffective === 'dark',
          });
        }
      });
    } catch {}
  },
}));

export const useTheme = () => {
  const { themePreference, themeMode, colors, isDark, toggleTheme, setThemePreference } = useThemeStore();
  return { themePreference, themeMode, colors, isDark, toggleTheme, setThemePreference, setThemeMode: setThemePreference };
};
