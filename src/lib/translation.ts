import { getLocaleLanguage, resolveTranslationLocale } from "./locale";

type TranslationFunction = (key: string) => string;

export type ComponentTranslationProps = {
  t?: TranslationFunction;
  namespace?: string;
  locale?: string;
  translationLocale?: string;
  translations?: Record<string, Record<string, string>>;
};

function humanizeFallbackKey(key: string): string {
  if (!/[_-]/.test(key)) return key;

  const words = key.split(/[_-]+/).filter(Boolean);
  if (words.length === 0) return key;

  return words
    .map((word, index) => {
      if (word.toUpperCase() === word && word.length > 1) return word;
      if (index === 0) return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
      return word;
    })
    .join(" ");
}

export function createTranslation({
  t,
  namespace,
  locale = "en",
  translationLocale,
  translations = {},
}: ComponentTranslationProps = {}) {
  return (key: string): string => {
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

    const normalizedLocale = resolveTranslationLocale(translationLocale, locale);
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

    // 3. Humanize raw lookup keys like "credit_note" before falling back fully
    return humanizeFallbackKey(key);
  };
}
