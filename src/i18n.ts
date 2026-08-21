import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import kkTranslations from './locales/kk.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      kk: kkTranslations
    },
    lng: 'kk',
    fallbackLng: 'kk',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
