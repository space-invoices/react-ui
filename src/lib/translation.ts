import { useCallback } from "react";

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

      // 2. Look up in local translations for current locale
      if (translations[locale]) {
        const translation = translations[locale][key];
        if (translation) return translation;
      }

      // 3. Fall back to key itself (which is the English text)
      return key;
    },
    [t, namespace, locale, translations],
  );
}
