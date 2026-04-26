import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import es from './locales/es.json';
import en from './locales/en.json';
import ca from './locales/ca.json';
import eu from './locales/eu.json';
import gl from './locales/gl.json';
import val from './locales/val.json';

const SUPPORTED = ['es', 'en', 'ca', 'eu', 'gl', 'val'] as const;
type SupportedLang = (typeof SUPPORTED)[number];

function detectLanguage(): SupportedLang {
  const locales = Localization.getLocales();
  for (const locale of locales) {
    const tag = locale.languageTag.toLowerCase();
    const code = locale.languageCode?.toLowerCase() ?? '';

    // Valencian: ca-ES-Valencia or language tag containing 'valencia'
    if (tag.includes('valencia')) return 'val';

    // Exact matches first
    if (SUPPORTED.includes(code as SupportedLang)) return code as SupportedLang;
  }
  // Fallback: Spanish
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

export default i18n;
export { detectLanguage };
