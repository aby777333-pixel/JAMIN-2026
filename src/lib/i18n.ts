import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bn from '@/locales/bn.json';
import en from '@/locales/en.json';
import gu from '@/locales/gu.json';
import hi from '@/locales/hi.json';
import kn from '@/locales/kn.json';
import ml from '@/locales/ml.json';
import mr from '@/locales/mr.json';
import ta from '@/locales/ta.json';
import te from '@/locales/te.json';
import ur from '@/locales/ur.json';

/**
 * i18n — SuperPrompt §2. English default; structure ready for Indian languages:
 * Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati.
 * Untranslated keys fall back to English. Locale files fill in incrementally.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ur', label: 'اردو' },
  { code: 'mr', label: 'मराठी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'gu', label: 'ગુજરાતી' },
] as const;

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta },
  ml: { translation: ml },
  te: { translation: te },
  kn: { translation: kn },
  ur: { translation: ur },
  mr: { translation: mr },
  bn: { translation: bn },
  gu: { translation: gu },
} as const;

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const initialLanguage = deviceLanguage in resources ? deviceLanguage : 'en';

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

/** The user's chosen language, persisted so it survives app restarts. */
const LANG_KEY = 'jamin.language';

/** Switch the whole app's language and remember the choice. */
export async function setAppLanguage(code: string): Promise<void> {
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(LANG_KEY, code);
  } catch {
    /* persistence is best-effort */
  }
}

/** Re-apply the persisted language on app start (called from the root layout). */
export async function loadPersistedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved && saved in resources && saved !== i18n.language) {
      await i18n.changeLanguage(saved);
    }
  } catch {
    /* fall back to device language */
  }
}

export default i18n;
