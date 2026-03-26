import type { Locale } from "date-fns";
import { bg, cs, de, enUS, es, et, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } from "date-fns/locale";
import { getLocaleLanguage } from "./locale";

const DATE_FNS_LOCALES: Record<string, Locale> = {
  bg,
  cs,
  de,
  en: enUS,
  es,
  et,
  fi,
  fr,
  hr,
  is,
  it,
  nb,
  nl,
  pl,
  pt,
  sk,
  sl,
  sv,
};

export function getDateFnsLocale(locale?: string): Locale {
  const language = getLocaleLanguage(locale);
  return DATE_FNS_LOCALES[language ?? ""] ?? enUS;
}
