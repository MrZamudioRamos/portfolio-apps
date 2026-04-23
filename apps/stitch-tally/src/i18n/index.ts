import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';

const deviceLang = getLocales()[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: { en: { translation: en }, es: { translation: es } },
  lng: deviceLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
