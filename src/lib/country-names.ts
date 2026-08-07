/**
 * Country-name to ISO-code resolution for entity forms.
 *
 * The API resolves country names against a database of local names with an AI
 * fallback, so it will always understand more spellings than this does. Forms use
 * this to decide what to render before the request is made; when the server
 * resolves a name this cannot, the form must recover from the server's answer
 * rather than assume this module was right.
 */

export const ISO_COUNTRY_CODES = [
  "AD",
  "AE",
  "AF",
  "AG",
  "AL",
  "AM",
  "AO",
  "AR",
  "AT",
  "AU",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BN",
  "BO",
  "BR",
  "BS",
  "BT",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CV",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FM",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GH",
  "GM",
  "GN",
  "GQ",
  "GR",
  "GT",
  "GW",
  "GY",
  "HK",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IN",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KP",
  "KR",
  "KW",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MG",
  "MH",
  "MK",
  "ML",
  "MM",
  "MN",
  "MR",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NE",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PG",
  "PH",
  "PK",
  "PL",
  "PT",
  "PW",
  "PY",
  "QA",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SD",
  "SE",
  "SG",
  "SI",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SY",
  "SZ",
  "TD",
  "TG",
  "TH",
  "TJ",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VN",
  "VU",
  "WS",
  "XK",
  "YE",
  "ZA",
  "ZM",
  "ZW",
] as const;

const COUNTRY_CODE_ALIASES: Record<string, string> = {
  uk: "GB",
  "u.k.": "GB",
  usa: "US",
  "u.s.": "US",
  "u.s.a.": "US",
};

function normalizeCountryName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function resolveCountryCodeFromName(value: string | undefined, locale: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const alias = COUNTRY_CODE_ALIASES[normalizeCountryName(trimmed)];
  if (alias) return alias;

  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && ISO_COUNTRY_CODES.includes(upper as (typeof ISO_COUNTRY_CODES)[number])) {
    return upper;
  }

  const normalizedInput = normalizeCountryName(trimmed);
  const localesToTry = Array.from(new Set([locale, "en", "en-US"]));

  for (const candidateLocale of localesToTry) {
    const displayNames = new Intl.DisplayNames([candidateLocale], { type: "region" });
    for (const code of ISO_COUNTRY_CODES) {
      const label = displayNames.of(code);
      if (label && normalizeCountryName(label) === normalizedInput) {
        return code;
      }
    }
  }

  return getNativeCountryNameIndex().get(normalizedInput);
}

/**
 * Each country's name in its own language, so someone typing "Deutschland" or
 * "Slovenija" on an English UI is still understood. Built once on first use:
 * deriving it costs a few hundred Intl constructions, which is far too much to
 * repeat per keystroke.
 */
let nativeCountryNameIndex: Map<string, string> | undefined;

function getNativeCountryNameIndex(): Map<string, string> {
  if (nativeCountryNameIndex) return nativeCountryNameIndex;

  const index = new Map<string, string>();
  const displayNamesByLanguage = new Map<string, Intl.DisplayNames>();

  for (const code of ISO_COUNTRY_CODES) {
    const language = new Intl.Locale(`und-${code}`).maximize().language;

    let displayNames = displayNamesByLanguage.get(language);
    if (!displayNames) {
      displayNames = new Intl.DisplayNames([language], { type: "region" });
      displayNamesByLanguage.set(language, displayNames);
    }

    const label = displayNames.of(code);
    // First writer wins: several countries share a language, and an ambiguous
    // native name must not silently reassign an earlier country's spelling.
    if (label && !index.has(normalizeCountryName(label))) {
      index.set(normalizeCountryName(label), code);
    }
  }

  nativeCountryNameIndex = index;
  return index;
}
