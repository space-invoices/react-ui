import { useEffect, useMemo, useReducer } from "react";
import { getLocaleLanguage, resolveTranslationLocale } from "./locale";
import { type ComponentTranslationProps, createTranslation } from "./translation";

type Dictionary = Record<string, string>;
export type TranslationLoaders = Record<string, () => Promise<{ default: Dictionary }>>;
type Translations = Record<string, Dictionary>;
type TranslationCache = {
  loaded: Map<string, Translations>;
  pending: Map<string, Promise<Translations>>;
};

const caches = new WeakMap<TranslationLoaders, TranslationCache>();
const EMPTY_TRANSLATIONS: Translations = {};

function getCache(loaders: TranslationLoaders): TranslationCache {
  let cache = caches.get(loaders);
  if (!cache) {
    cache = { loaded: new Map(), pending: new Map() };
    caches.set(loaders, cache);
  }
  return cache;
}

function loadTranslations(cache: TranslationCache, loaders: TranslationLoaders, language: string) {
  const existing = cache.pending.get(language);
  if (existing) return existing;
  const pending = Promise.resolve()
    .then(() => loaders[language]())
    .then(
      (module) => {
        const translations = { [language]: module.default };
        cache.loaded.set(language, translations);
        cache.pending.delete(language);
        return translations;
      },
      (error: unknown) => {
        cache.pending.delete(language);
        throw error;
      },
    );
  cache.pending.set(language, pending);
  return pending;
}

/** Keep loaders at module scope so components share only the dictionaries they request. */
export function useLazyTranslation(
  { locale, translationLocale, t, namespace }: Omit<ComponentTranslationProps, "translations">,
  loaders: TranslationLoaders,
) {
  const normalizedLocale = resolveTranslationLocale(translationLocale, locale);
  const baseLocale = getLocaleLanguage(normalizedLocale);
  const language = Object.hasOwn(loaders, normalizedLocale)
    ? normalizedLocale
    : Object.hasOwn(loaders, baseLocale)
      ? baseLocale
      : undefined;
  const cache = getCache(loaders);
  const translations = (language && cache.loaded.get(language)) || EMPTY_TRANSLATIONS;
  const [, refresh] = useReducer((revision: number) => revision + 1, 0);

  useEffect(() => {
    if (!language) return;
    const loaded = cache.loaded.get(language);
    if (loaded) {
      // Another component may finish the shared load between this render and effect.
      if (loaded !== translations) refresh();
      return;
    }
    let active = true;
    void loadTranslations(cache, loaders, language).then(
      () => {
        if (active) refresh();
      },
      () => {
        // Keep readable keys after failure; a later visit or mount can retry.
      },
    );
    return () => {
      active = false;
    };
  }, [cache, language, loaders, translations]);

  return useMemo(
    () => createTranslation({ locale, translationLocale, t, namespace, translations }),
    [locale, translationLocale, t, namespace, translations],
  );
}
