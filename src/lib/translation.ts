import { useCallback } from "react";
import { getLocaleLanguage, normalizeLocale } from "./locale";

type TranslationFunction = (key: string) => string;

export type ComponentTranslationProps = {
  t?: TranslationFunction;
  namespace?: string;
  locale?: string;
  translations?: Record<string, Record<string, string>>;
};

export function createTranslation({ t, namespace, locale = "en", translations = {} }: ComponentTranslationProps = {}) {
  return useCallback(
    (key: string): string => {
      // 1. If external translation function provided, use it
      if (t) {
        const fullKey = namespace ? `${namespace}.${key}` : key;
        const result = t(fullKey);

        // If translation found (result is not the key), return it.
        // We check against both fullKey (standard i18next behavior) and key (in case namespace was stripped)
        if (result !== fullKey && result !== key) {
          return result;
        }
      }

      const normalizedLocale = normalizeLocale(locale);
      const baseLocale = getLocaleLanguage(normalizedLocale);

      // 2. Look up in local translations for current locale, then base language
      const localeTranslations = translations[normalizedLocale] ?? translations[baseLocale];
      if (localeTranslations) {
        const translation = localeTranslations[key];
        if (translation) return translation;
      }

      const englishTranslations = translations.en;
      if (englishTranslations) {
        const translation = englishTranslations[key];
        if (translation) return translation;
      }

      // 3. Fall back to key itself (which is the English text)
      return key;
    },
    [t, namespace, locale, translations],
  );
}
