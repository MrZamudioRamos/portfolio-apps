import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import es from './locales/es.json';
import en from './locales/en.json';
import ca from './locales/ca.json';
import eu from './locales/eu.json';
import gl from './locales/gl.json';
import val from './locales/val.json';

export const SUPPORTED_LANGS = ['es', 'en', 'ca', 'eu', 'gl', 'val'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const LANG_KEY = '@portfolio/language';

export const LANG_LABELS: Record<SupportedLang, string> = {
  es: 'Español',
  en: 'English',
  ca: 'Català',
  eu: 'Euskara',
  gl: 'Galego',
  val: 'Valencià',
};

function detectLanguage(): SupportedLang {
  const locales = Localization.getLocales();
  for (const locale of locales) {
    const tag = locale.languageTag.toLowerCase();
    const code = locale.languageCode?.toLowerCase() ?? '';
    if (tag.includes('valencia')) return 'val';
    if (SUPPORTED_LANGS.includes(code as SupportedLang)) return code as SupportedLang;
  }
  return 'es';
}

i18n
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en }, ca: { translation: ca }, eu: { translation: eu }, gl: { translation: gl }, val: { translation: val } },
    lng: detectLanguage(),
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  });

export async function loadSavedLanguage() {
  const saved = await AsyncStorage.getItem(LANG_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved as SupportedLang)) {
    await i18n.changeLanguage(saved);
  }
}

export async function saveLanguage(lang: SupportedLang) {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
export { detectLanguage };
