import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = '@ayefinance_language';

interface LanguageState {
  language: Language;
  t: typeof translations.es;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  loadSavedLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'es',
  t: translations.es,

  setLanguage: async (lang) => {
    set({ language: lang, t: translations[lang] });
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {}
  },

  toggleLanguage: () => {
    const next = get().language === 'es' ? 'en' : 'es';
    get().setLanguage(next);
  },

  loadSavedLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'es' || saved === 'en') {
        set({ language: saved, t: translations[saved] });
      }
    } catch {}
  },
}));

export const useTranslation = () => {
  const { language, t, toggleLanguage, setLanguage } = useLanguageStore();
  return { language, t, toggleLanguage, setLanguage };
};
