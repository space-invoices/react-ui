export const DOCUMENT_CONTENT_TRANSLATIONS_FEATURE = "documents.content_translations" as const;
export const DEFAULT_CONTENT_LOCALE = "default" as const;

export const DOCUMENT_CONTENT_TRANSLATION_LOCALES = [
  { value: "en-US", label: "English (US)", flag: "US" },
  { value: "de-DE", label: "German (DE)", flag: "DE" },
  { value: "it-IT", label: "Italian (IT)", flag: "IT" },
  { value: "fr-FR", label: "French (FR)", flag: "FR" },
  { value: "es-ES", label: "Spanish (ES)", flag: "ES" },
  { value: "sl-SI", label: "Slovenian (SI)", flag: "SI" },
  { value: "pt-PT", label: "Portuguese (PT)", flag: "PT" },
  { value: "nl-NL", label: "Dutch (NL)", flag: "NL" },
  { value: "pl-PL", label: "Polish (PL)", flag: "PL" },
  { value: "hr-HR", label: "Croatian (HR)", flag: "HR" },
  { value: "sv-SE", label: "Swedish (SE)", flag: "SE" },
  { value: "fi-FI", label: "Finnish (FI)", flag: "FI" },
  { value: "et-EE", label: "Estonian (EE)", flag: "EE" },
  { value: "bg-BG", label: "Bulgarian (BG)", flag: "BG" },
  { value: "cs-CZ", label: "Czech (CZ)", flag: "CZ" },
  { value: "sk-SK", label: "Slovak (SK)", flag: "SK" },
  { value: "nb-NO", label: "Norwegian (NO)", flag: "NO" },
  { value: "is-IS", label: "Icelandic (IS)", flag: "IS" },
] as const;

export type DocumentContentTranslationLocale = (typeof DOCUMENT_CONTENT_TRANSLATION_LOCALES)[number]["value"];
export type DocumentContentLocaleMode = typeof DEFAULT_CONTENT_LOCALE | DocumentContentTranslationLocale;
export type LocalizedContentMap = Partial<Record<DocumentContentTranslationLocale, string>>;

const CONTENT_LOCALE_UI_LABELS = {
  en: {
    default: "Default",
    inputLanguage: "Input language",
  },
  sl: {
    default: "Privzeto",
    inputLanguage: "Jezik vnosa",
  },
  de: {
    default: "Standard",
    inputLanguage: "Sprache der Eingabe",
  },
  it: {
    default: "Predefinito",
    inputLanguage: "Lingua di input",
  },
  fr: {
    default: "Par defaut",
    inputLanguage: "Langue de saisie",
  },
  es: {
    default: "Predeterminado",
    inputLanguage: "Idioma de entrada",
  },
  pt: {
    default: "Padrao",
    inputLanguage: "Idioma de entrada",
  },
  nl: {
    default: "Standaard",
    inputLanguage: "Invoertaal",
  },
  pl: {
    default: "Domyslne",
    inputLanguage: "Jezyk wprowadzania",
  },
  hr: {
    default: "Zadano",
    inputLanguage: "Jezik unosa",
  },
  sv: {
    default: "Standard",
    inputLanguage: "Inmatningssprak",
  },
  fi: {
    default: "Oletus",
    inputLanguage: "Syottokieli",
  },
  et: {
    default: "Vaikimisi",
    inputLanguage: "Sisestuskeel",
  },
  bg: {
    default: "Po podrazbirane",
    inputLanguage: "Ezik na vavezhdane",
  },
  cs: {
    default: "Vychozi",
    inputLanguage: "Jazyk vstupu",
  },
  sk: {
    default: "Predvolene",
    inputLanguage: "Jazyk vstupu",
  },
  nb: {
    default: "Standard",
    inputLanguage: "Inndatasprak",
  },
  is: {
    default: "Sjalfgefid",
    inputLanguage: "Innslattarmal",
  },
} as const;

export function getContentTranslationLocaleOption(locale?: string | null) {
  return DOCUMENT_CONTENT_TRANSLATION_LOCALES.find((option) => option.value === locale);
}

function normalizeDisplayLocale(locale?: string | null) {
  if (!locale) return "en";
  return locale;
}

function getUiLanguage(locale?: string | null) {
  return normalizeDisplayLocale(locale).split("-")[0] || "en";
}

export function getContentLocaleUiLabels(uiLocale?: string | null) {
  const language = getUiLanguage(uiLocale) as keyof typeof CONTENT_LOCALE_UI_LABELS;
  return CONTENT_LOCALE_UI_LABELS[language] ?? CONTENT_LOCALE_UI_LABELS.en;
}

export function getLocalizedContentLocaleLabel(
  locale: string | null | undefined,
  uiLocale?: string | null,
  fallback?: string,
) {
  if (!locale) return fallback ?? "Default";

  const normalizedUiLocale = normalizeDisplayLocale(uiLocale);
  const [languageCode, regionCode] = locale.split("-");

  try {
    const languageNames = new Intl.DisplayNames([normalizedUiLocale], { type: "language" });
    const regionNames = regionCode ? new Intl.DisplayNames([normalizedUiLocale], { type: "region" }) : null;
    const languageLabel = languageNames.of(languageCode) ?? fallback ?? locale;
    const regionLabel = regionCode ? (regionNames?.of(regionCode) ?? regionCode) : null;
    return regionLabel ? `${languageLabel} (${regionLabel})` : languageLabel;
  } catch {
    return fallback ?? locale;
  }
}

export function getContentLocaleButtonLabel(mode: DocumentContentLocaleMode, defaultLocale?: string | null) {
  if (mode === DEFAULT_CONTENT_LOCALE) {
    return getContentTranslationLocaleOption(defaultLocale)?.flag ?? "Default";
  }

  return getContentTranslationLocaleOption(mode)?.flag ?? mode;
}

export function getContentLocaleTooltipLabel(
  mode: DocumentContentLocaleMode,
  defaultLocale?: string | null,
  options?: {
    uiLocale?: string | null;
    defaultLabel?: string;
    inputLanguageLabel?: string;
  },
) {
  const selectionLabel =
    mode === DEFAULT_CONTENT_LOCALE
      ? getContentLocaleMenuLabel(mode, defaultLocale, options)
      : getLocalizedContentLocaleLabel(mode, options?.uiLocale, getContentTranslationLocaleOption(mode)?.label ?? mode);

  return `${options?.inputLanguageLabel ?? "Input language"}: ${selectionLabel}`;
}

export function getContentLocaleMenuLabel(
  mode: DocumentContentLocaleMode,
  defaultLocale?: string | null,
  options?: {
    uiLocale?: string | null;
    defaultLabel?: string;
  },
) {
  if (mode === DEFAULT_CONTENT_LOCALE) {
    const localeLabel = getLocalizedContentLocaleLabel(
      defaultLocale,
      options?.uiLocale,
      getContentTranslationLocaleOption(defaultLocale)?.label ?? defaultLocale ?? options?.defaultLabel ?? "Default",
    );
    return `${options?.defaultLabel ?? "Default"} (${localeLabel})`;
  }

  return getLocalizedContentLocaleLabel(
    mode,
    options?.uiLocale,
    getContentTranslationLocaleOption(mode)?.label ?? mode,
  );
}

export function readLocalizedValue(
  baseValue: string | null | undefined,
  translations: LocalizedContentMap | null | undefined,
  activeLocale: DocumentContentLocaleMode,
) {
  if (activeLocale === DEFAULT_CONTENT_LOCALE) {
    return baseValue ?? "";
  }

  return translations?.[activeLocale] ?? "";
}

export function writeLocalizedValue(
  translations: LocalizedContentMap | null | undefined,
  locale: DocumentContentTranslationLocale,
  value: string,
): LocalizedContentMap {
  return {
    ...(translations ?? {}),
    [locale]: value,
  };
}

export function mergeLocalizedValues(
  base: LocalizedContentMap | null | undefined,
  override: LocalizedContentMap | null | undefined,
): LocalizedContentMap | undefined {
  if (!base && !override) return undefined;
  return {
    ...(base ?? {}),
    ...(override ?? {}),
  };
}

export function collectTranslationLocales(
  defaultLocale?: string | null,
  ...maps: Array<LocalizedContentMap | null | undefined>
): DocumentContentTranslationLocale[] {
  const locales = new Set<DocumentContentTranslationLocale>();

  for (const map of maps) {
    for (const locale of Object.keys(map ?? {})) {
      if (locale !== defaultLocale) {
        locales.add(locale as DocumentContentTranslationLocale);
      }
    }
  }

  return DOCUMENT_CONTENT_TRANSLATION_LOCALES.map((option) => option.value).filter((locale) => locales.has(locale));
}
