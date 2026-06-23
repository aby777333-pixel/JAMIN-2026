import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bn from '@/locales/bn.json';
import en from '@/locales/en.json';
import gu from '@/locales/gu.json';
import hi from '@/locales/hi.json';
import kn from '@/locales/kn.json';
import mr from '@/locales/mr.json';
import ta from '@/locales/ta.json';
import te from '@/locales/te.json';

/**
 * i18n — SuperPrompt §2. English default; structure ready for Indian languages:
 * Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati.
 * Untranslated keys fall back to English. Locale files fill in incrementally.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'mr', label: 'मराठी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'gu', label: 'ગુજરાતી' },
] as const;

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta },
  te: { translation: te },
  kn: { translation: kn },
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

export default i18n;
