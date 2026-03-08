export function normalizeLocale(locale?: string, fallback = "en"): string {
  return locale?.trim().toLowerCase().replace(/_/g, "-") || fallback;
}

export function getLocaleLanguage(locale?: string, fallback = "en"): string {
  return normalizeLocale(locale, fallback).split("-")[0] || fallback;
}

const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: "en-US",
  de: "de-DE",
  sl: "sl-SI",
  it: "it-IT",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-PT",
  nl: "nl-NL",
  pl: "pl-PL",
  hr: "hr-HR",
  sv: "sv-SE",
  fi: "fi-FI",
  et: "et-EE",
  bg: "bg-BG",
  cs: "cs-CZ",
  sk: "sk-SK",
  nb: "nb-NO",
  is: "is-IS",
};

export function getFullLocale(locale?: string, fallback = "en-US"): string {
  const normalized = normalizeLocale(locale, fallback);
  if (Object.values(LANGUAGE_TO_LOCALE).includes(normalized)) {
    return normalized;
  }

  const language = getLocaleLanguage(normalized, fallback.split("-")[0]);
  return LANGUAGE_TO_LOCALE[language] || fallback;
}
