/**
 * Portugal entity-input rules, mirrored from the API Portugal overlay
 * (`apps/api/src/modules/fiscalization/pt/pt.helpers.ts`). Entity forms use these
 * to surface localized field-level errors instead of letting the API reject the
 * submit with a raw `unprocessable_entity` message.
 *
 * Keep these predicates in sync with the API overlay: the API stays the
 * authority, this is the pre-submit parity layer.
 */

import { type RefinementCtx, z } from "zod";
import { isCompanyLegalForm, type LegalForm, requiresShareCapital } from "./legal-details";

export const PT_COUNTRY_CODE = "PT";

/**
 * Share capital as an entity form holds it.
 *
 * `NumericInput` emits the raw string it could not parse (and `""` for a cleared
 * field), so the field schema must accept a string. If it rejected one, zod would
 * fail the surrounding object and skip the Portugal `superRefine` entirely — the
 * user would see a single untranslated "Invalid input" and none of the other
 * Portugal errors. `getPortugalEntityIssues` reports the non-number itself.
 */
export const portugalShareCapitalSchema = z.union([z.number(), z.string(), z.null()]).optional();

/** A money disclosure as an entity form holds it: parsed number, raw unparsed text, or cleared. */
export type PortugalAmountInput = number | string | null | undefined;

/** Share capital as the API accepts it — anything unparseable must not be submitted. */
export function toSubmittableShareCapital(value: PortugalAmountInput): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const PORTUGAL_POST_CODE_REGEX = /^\d{4}-\d{3}$/;
const PORTUGAL_LATIN_TEXT_REGEX = /^[\u0020-\u024F]*$/u;
const PORTUGAL_PHONE_REGEX =
  /^\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PORTUGAL_NIF_PREFIXES_1 = new Set(["1", "2", "3", "5", "6", "8"]);
const PORTUGAL_NIF_PREFIXES_2 = new Set(["45", "70", "71", "72", "74", "75", "77", "79", "90", "91", "98", "99"]);

/**
 * Every entity field the Portugal rules can name, in report order. This is the
 * vocabulary, not the requirement list: what is actually mandatory depends on the
 * legal form (see `getRequiredPortugalEntityFields`).
 */
export const PORTUGAL_ENTITY_FIELDS = [
  "name",
  "legal_form",
  "tax_number",
  "address",
  "city",
  "post_code",
  "company_number",
  "registration_office",
  "starting_capital",
  "paid_up_capital",
  "equity",
  "phone",
  "email",
  "state",
] as const;

export type PortugalEntityField = (typeof PORTUGAL_ENTITY_FIELDS)[number];

/**
 * Fields Portugal needs from every entity, whoever is invoicing. Contact details
 * and the district are not among them: an invoice is valid without a phone number,
 * and the fiscal region is derived from the address the entity already gives.
 */
export const PORTUGAL_BASE_REQUIRED_ENTITY_FIELDS = ["tax_number", "address", "city", "post_code"] as const;

/**
 * Fields the API may list in its Portugal rejection message, in report order. The legal
 * form comes first: it decides which registration and capital details are required, and
 * the API asks for it before demanding company data.
 */
const PORTUGAL_API_ENTITY_FIELDS = [
  "legal_form",
  "tax_number",
  "company_number",
  "phone",
  "email",
  "address",
  "city",
  "post_code",
  "state",
  "starting_capital",
] as const;

export type PortugalApiEntityField = (typeof PORTUGAL_API_ENTITY_FIELDS)[number];

/**
 * Fields the API names by their stored path. The legal profile lives in
 * `settings.legal_details`, but the entity forms hold it flat, so the rejection has to be
 * reported against the field the user can actually fill in.
 */
const PORTUGAL_API_FIELD_ALIASES: Record<string, PortugalApiEntityField> = {
  "settings.legal_details.legal_form": "legal_form",
};

export type PortugalEntityInput = {
  country_code?: string | null;
  name?: string | null;
  tax_number?: string | null;
  company_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  post_code?: string | null;
  state?: string | null;
  /** Unparseable numeric input arrives as the raw string the user typed. */
  starting_capital?: PortugalAmountInput;
  /**
   * Conditional company disclosures, held flat by the form and assembled into
   * `settings.legal_details` on submit. Both are optional, and both arrive as the raw
   * string the user typed when it could not be parsed as a number.
   */
  paid_up_capital?: PortugalAmountInput;
  equity?: PortugalAmountInput;
  /**
   * Legal form and registry office as the entity forms hold them: flat fields that
   * the form assembles into `settings.legal_details` on submit.
   */
  legal_form?: LegalForm | null;
  registration_office?: string | null;
};

export type PortugalEntityIssueOptions = {
  /**
   * Require an explicit legal form. New Portugal profiles must choose one, because
   * the choice decides which registration and capital details are mandatory and is
   * a legal fact about the business that no form is entitled to guess. Both create
   * and settings forms require it; partial field checks can omit the requirement.
   */
  requireLegalForm?: boolean;
};

/**
 * Which fields a Portugal entity with this legal form has to fill in.
 *
 * Individual professionals and sole traders have no company registration and no
 * share capital, so they are only asked for the base set. Companies publish their
 * registry office and registration number; the capital-based forms also publish
 * their share capital, where zero is a real, valid figure.
 */
export function getRequiredPortugalEntityFields(legalForm: LegalForm | null | undefined): PortugalEntityField[] {
  const fields: PortugalEntityField[] = [...PORTUGAL_BASE_REQUIRED_ENTITY_FIELDS];

  if (isCompanyLegalForm(legalForm)) {
    fields.push("company_number", "registration_office");
  }

  if (requiresShareCapital(legalForm)) {
    fields.push("starting_capital");
  }

  return PORTUGAL_ENTITY_FIELDS.filter((field) => fields.includes(field));
}

/**
 * Raw English messages. `translateZodValidationMessage` maps them to the active
 * form locale, so they must stay byte-identical to the entries in
 * `zod-validation-message.ts`.
 */
export const PORTUGAL_ENTITY_MESSAGES = {
  required: "Required",
  invalidTaxNumber: "Invalid Portuguese tax number",
  invalidPhone: "Invalid international phone number",
  invalidEmail: "Invalid email address",
  invalidPostCode: "Invalid Portuguese post code",
  invalidAmount: "Invalid amount",
  amountNegative: "Amount cannot be negative",
  latinOnly: "Must contain only Latin characters",
  nameTooLong: "Portugal limits the company name to 100 characters",
  addressTooLong: "Portugal limits the address to 210 characters",
  cityTooLong: "Portugal limits the city to 50 characters",
  companyIdTooLong: "Registry office and registration number must fit 50 characters together",
  invalidRegistrationNumber: "Registration number must contain only digits and slashes",
} as const;

/**
 * Portugal's own field limits, which are tighter than the generic entity schema
 * (address 500, city 100, unbounded name). They come from the fields these values
 * are written into on a Portuguese document and in SAF-T.
 */
export const PORTUGAL_ENTITY_NAME_MAX_LENGTH = 100;
export const PORTUGAL_ENTITY_ADDRESS_MAX_LENGTH = 210;
export const PORTUGAL_ENTITY_CITY_MAX_LENGTH = 50;

/**
 * The registry office and the registration number are published together as one
 * company identification string, so their combined length is what is bounded — not
 * either field on its own. The API keeps `registration_office` at its own 100 limit
 * independently; this is the conditional combined bound on top of it.
 */
export const PORTUGAL_COMPANY_ID_MAX_LENGTH = 50;

const PORTUGAL_REGISTRATION_NUMBER_REGEX = /^[\d/]+$/;

/** How the registry office and registration number read as one published string. */
export function formatPortugalCompanyId(
  registrationOffice: string | null | undefined,
  companyNumber: string | null | undefined,
): string {
  return [registrationOffice?.trim(), companyNumber?.trim()].filter(Boolean).join(" ");
}

/** A Portuguese commercial registration number is digits, optionally slash-separated. */
export function isValidPortugalRegistrationNumber(value: string | null | undefined): boolean {
  return PORTUGAL_REGISTRATION_NUMBER_REGEX.test(value?.trim() ?? "");
}

export type PortugalEntityIssue = {
  field: PortugalEntityField;
  message: string;
};

export function isPortugalCountryCode(countryCode: string | null | undefined): boolean {
  return countryCode?.trim().toUpperCase() === PT_COUNTRY_CODE;
}

export function normalizePortugalTaxNumber(taxNumber: string | null | undefined): string {
  const normalized = taxNumber?.trim().toUpperCase() ?? "";

  return normalized.startsWith("PT") ? normalized.slice(2) : normalized;
}

/** UI entry normalization; strict API-parity predicates below are unchanged. */
/** Separators people type inside phone numbers, none of which carry meaning. */
const PHONE_SEPARATOR_REGEX = /[\s()-]/g;
/** A dialable number: an optional leading plus and digits, once separators are gone. */
const PHONE_COMPACT_REGEX = /^\+?\d+$/;
/**
 * The national trunk digit some international numbers print in parentheses
 * (`+351 (0) 21 123 4567`). It is meaningful — dropping it dials a different
 * number — so such an input is left alone for the user to resolve.
 */
const PHONE_PARENTHESIZED_TRUNK_REGEX = /\(\s*0\s*\)/;
/** A separator the user has just typed and is still typing after. */
const PHONE_TRAILING_SEPARATOR_REGEX = /[\s-]+$/;
const PORTUGAL_DIALLING_CODE = "351";
const PORTUGAL_NATIONAL_PHONE_LENGTH = 9;

/**
 * A phone number as the API stores it: `+` and digits.
 *
 * Accepts the spellings a Portuguese business actually has printed — `912 345 678`,
 * `(912) 345-678`, `00351 912 345 678`, `351912345678` — and any international
 * number given with its own country code. Only a bare nine-digit number is read as
 * Portuguese; nothing else is guessed at, and an explicit `+` or `00` number is
 * never re-read as a national one.
 */
export function normalizePortugalPhoneInput(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || PHONE_PARENTHESIZED_TRUNK_REGEX.test(trimmed)) return trimmed;

  const compact = trimmed.replace(PHONE_SEPARATOR_REGEX, "");
  if (!PHONE_COMPACT_REGEX.test(compact)) return trimmed;

  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  // A leading trunk zero is ambiguous; ask for an explicit international code.
  if (compact.startsWith("0")) return trimmed;
  if (
    compact.startsWith(PORTUGAL_DIALLING_CODE) &&
    compact.length === PORTUGAL_DIALLING_CODE.length + PORTUGAL_NATIONAL_PHONE_LENGTH
  ) {
    return `+${compact}`;
  }
  if (compact.length === PORTUGAL_NATIONAL_PHONE_LENGTH) return `+${PORTUGAL_DIALLING_CODE}${compact}`;

  return trimmed;
}

/**
 * Whether a bracket group is still open, or the brackets do not pair up at all.
 * Either way there is nothing to read yet, so the entry is left as typed.
 */
function hasUnresolvedParentheses(value: string): boolean {
  let open = 0;
  for (const character of value) {
    if (character === "(") open += 1;
    else if (character === ")") {
      if (open === 0) return true;
      open -= 1;
    }
  }

  return open > 0;
}

/**
 * A phone number as it should read while it is still being typed.
 *
 * The same rules as `normalizePortugalPhoneInput`, minus the guesses that are
 * premature mid-entry:
 *
 * - a separator just typed is kept, so the keystroke is not swallowed and retyped;
 * - a bracket group still being typed may be the meaningful trunk digit
 *   (`+351 (0) 21 123 4567`), so it is left alone until it closes and the trunk
 *   guard can see it — a closed non-trunk group normalizes away as before;
 * - nine digits that begin with the Portuguese dialling code are the front of a
 *   number still being written out (`351 912 345 678`), not a national number.
 */
export function formatPortugalPhoneEntry(value: string): string {
  const trailingSeparator = PHONE_TRAILING_SEPARATOR_REGEX.exec(value);
  const beforeSeparator = trailingSeparator ? value.slice(0, trailingSeparator.index) : "";
  // Nothing but separators is not a number yet, so it is left to the normalizer.
  if (trailingSeparator && beforeSeparator !== "") {
    return `${formatPortugalPhoneEntry(beforeSeparator)}${trailingSeparator[0]}`;
  }
  if (hasUnresolvedParentheses(value)) return value;

  const compact = value.trim().replace(PHONE_SEPARATOR_REGEX, "");
  if (compact.length === PORTUGAL_NATIONAL_PHONE_LENGTH && compact.startsWith(PORTUGAL_DIALLING_CODE)) {
    return value;
  }

  return normalizePortugalPhoneInput(value);
}

/** The seven digits of a Portuguese post code, however the user separated them. */
const PORTUGAL_POST_CODE_INPUT_REGEX = /^(\d{4})\s*-?\s*(\d{3})$/;

/** A post code as Portugal writes it: `1000-001`. Anything else is left as typed. */
export function normalizePortugalPostCodeInput(value: string): string {
  const trimmed = value.trim();
  const match = PORTUGAL_POST_CODE_INPUT_REGEX.exec(trimmed);

  return match ? `${match[1]}-${match[2]}` : trimmed;
}

/** A post code as it is being typed: the digits, and the hyphen once there are five. */
const PORTUGAL_POST_CODE_ENTRY_REGEX = /^\d{0,7}$/;
/** A hyphen typed by hand, before the fifth digit would have produced one. */
const PORTUGAL_POST_CODE_TRAILING_HYPHEN_REGEX = /-\s*$/;

/**
 * A post code as it should read while it is still being typed: `1`, `1100`,
 * `1100-0`, `1100-053`. The hyphen appears with the fifth digit, so nobody has to
 * type it — but typing it after the first four digits is the natural thing to do,
 * so that hyphen is kept rather than swallowed, and a second one never doubles it.
 *
 * Spaces and hyphens are regrouped; letters and an eighth digit are left exactly
 * as typed, for `isValidPortugalPostCode` to reject. The submitted spelling stays
 * `normalizePortugalPostCodeInput`'s to decide.
 */
export function formatPortugalPostCodeEntry(value: string): string {
  const digits = value.replace(/[\s-]/g, "");
  if (!PORTUGAL_POST_CODE_ENTRY_REGEX.test(digits)) return value;
  if (digits.length < 4) return digits;
  if (digits.length === 4) {
    return PORTUGAL_POST_CODE_TRAILING_HYPHEN_REGEX.test(value) ? `${digits}-` : digits;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/** A NIF as it is pasted: grouped in threes, sometimes with the country prefix. */
const PORTUGAL_TAX_NUMBER_INPUT_REGEX = /^(?:PT)?(\d{9})$/;

/**
 * A NIF as the API stores it: the nine digits alone, leading zeros kept. Validity
 * is not this function's business — `isValidPortugalTaxNumber` still has the say.
 */
export function normalizePortugalTaxNumberInput(value: string): string {
  const match = PORTUGAL_TAX_NUMBER_INPUT_REGEX.exec(value.replace(/\s/g, "").toUpperCase());

  return match ? match[1] : value.trim();
}

/** The fields `normalizePortugalEntityInput` has an opinion about. */
export type PortugalNormalizedEntityInput = Pick<PortugalEntityInput, "phone" | "post_code" | "tax_number">;

/** A cleared field is a value in its own right, so only text is normalized. */
function normalizeOptionalInput(value: string | null, normalize: (input: string) => string): string | null {
  return value === null ? null : normalize(value);
}

/**
 * The Portugal-shaped fields of an entity input, tidied into the spellings the API
 * stores. Returns only the fields present, so callers spread it over their own
 * values and keep every other field — and every absent field — exactly as it was.
 *
 * Empty for any other country: normalizing a French post code by Portuguese rules
 * would be a corruption, not a convenience.
 */
export function normalizePortugalEntityInput(entity: PortugalEntityInput): PortugalNormalizedEntityInput {
  if (!isPortugalCountryCode(entity.country_code)) return {};

  const normalized: PortugalNormalizedEntityInput = {};

  if (entity.phone !== undefined) {
    normalized.phone = normalizeOptionalInput(entity.phone, normalizePortugalPhoneInput);
  }
  if (entity.post_code !== undefined) {
    normalized.post_code = normalizeOptionalInput(entity.post_code, normalizePortugalPostCodeInput);
  }
  if (entity.tax_number !== undefined) {
    normalized.tax_number = normalizeOptionalInput(entity.tax_number, normalizePortugalTaxNumberInput);
  }

  return normalized;
}

export function isValidPortugalTaxNumber(taxNumber: string | null | undefined): boolean {
  const normalized = normalizePortugalTaxNumber(taxNumber);
  if (!/^\d{9}$/.test(normalized)) {
    return false;
  }

  if (!PORTUGAL_NIF_PREFIXES_1.has(normalized.slice(0, 1)) && !PORTUGAL_NIF_PREFIXES_2.has(normalized.slice(0, 2))) {
    return false;
  }

  const digits = normalized.split("").map((digit) => Number.parseInt(digit, 10));
  const total = digits.slice(0, 8).reduce((sum, digit, index) => sum + digit * (9 - index), 0);
  const modulo11 = total % 11;
  const checkDigit = modulo11 < 2 ? 0 : 11 - modulo11;

  return checkDigit === digits[8];
}

export function isPortugalPlaceholderTaxNumber(taxNumber: string | null | undefined): boolean {
  const normalized = taxNumber?.trim().toUpperCase();
  return normalized === "123456789" || normalized === "PT123456789";
}

export function isValidPortugalPostCode(postCode: string | null | undefined): boolean {
  return PORTUGAL_POST_CODE_REGEX.test(postCode?.trim() ?? "");
}

export function isValidPortugalLatinText(value: string | null | undefined): boolean {
  return PORTUGAL_LATIN_TEXT_REGEX.test(value ?? "");
}

export function isValidPortugalPhoneNumber(value: string | null | undefined): boolean {
  return PORTUGAL_PHONE_REGEX.test(value?.trim() ?? "");
}

export function isValidEmailAddress(value: string | null | undefined): boolean {
  return EMAIL_REGEX.test(value?.trim() ?? "");
}

/** Trims to match the API: blank is not a value. Zero share capital is. */
function isMissing(value: string | number | boolean | null | undefined): boolean {
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "boolean") return false;
  return value == null || value.trim() === "";
}

/**
 * Whether an optional money disclosure holds something the API can store.
 *
 * A blank field is not an error — it is the explicit "this does not apply to us", and
 * the form submits it as `null`. Text `NumericInput` could not parse is an error, because
 * the alternative is submitting `null` for it and silently deleting a disclosure the
 * entity had already published.
 *
 * Only `null`, `undefined` and a blank string are that intentional clear. `NaN` and the
 * infinities are numbers the API cannot store, so they are reported rather than passed to
 * `isMissing`, which counts `NaN` as an empty required field.
 */
export function isSubmittablePortugalAmount(value: PortugalAmountInput): boolean {
  if (typeof value === "number") return Number.isFinite(value);

  return value == null || value.trim() === "";
}

/**
 * Whether a nonnegative-only disclosure holds a negative figure. Paid-up capital is an
 * amount actually paid in, so it cannot be below zero; equity can be, and says so when it is.
 */
function isNegativePortugalAmount(value: PortugalAmountInput): boolean {
  return typeof value === "number" && Number.isFinite(value) && value < 0;
}

export function getMissingPortugalEntityFields(
  entity: PortugalEntityInput,
  options: PortugalEntityIssueOptions = {},
): PortugalEntityField[] {
  if (!isPortugalCountryCode(entity.country_code)) {
    return [];
  }

  const missing = getRequiredPortugalEntityFields(entity.legal_form).filter((field) => isMissing(entity[field]));

  if (options.requireLegalForm && entity.legal_form == null) {
    return ["legal_form", ...missing];
  }

  return missing;
}

/**
 * Every Portugal field problem in the given input, in report order. Returns an
 * empty list for non-Portugal entities so callers can apply it unconditionally.
 *
 * Optional fields are still format-checked once they hold a value: a phone number
 * nobody had to supply must still be dialable if it is printed on an invoice.
 */
export function getPortugalEntityIssues(
  entity: PortugalEntityInput,
  options: PortugalEntityIssueOptions = {},
): PortugalEntityIssue[] {
  if (!isPortugalCountryCode(entity.country_code)) {
    return [];
  }

  const issues: PortugalEntityIssue[] = getMissingPortugalEntityFields(entity, options).map((field) => ({
    field,
    message: PORTUGAL_ENTITY_MESSAGES.required,
  }));
  const missingFields = new Set(issues.map((issue) => issue.field));

  const addFormatIssue = (field: PortugalEntityField, isValid: boolean, message: string) => {
    if (missingFields.has(field) || isValid) return;
    issues.push({ field, message });
  };

  const hasValue = (field: PortugalEntityField) => !isMissing(entity[field]);

  addFormatIssue(
    "tax_number",
    isValidPortugalTaxNumber(entity.tax_number) && !isPortugalPlaceholderTaxNumber(entity.tax_number),
    PORTUGAL_ENTITY_MESSAGES.invalidTaxNumber,
  );
  addFormatIssue("address", isValidPortugalLatinText(entity.address), PORTUGAL_ENTITY_MESSAGES.latinOnly);
  addFormatIssue("city", isValidPortugalLatinText(entity.city), PORTUGAL_ENTITY_MESSAGES.latinOnly);
  addFormatIssue("post_code", isValidPortugalPostCode(entity.post_code), PORTUGAL_ENTITY_MESSAGES.invalidPostCode);
  addFormatIssue(
    "starting_capital",
    isSubmittablePortugalAmount(entity.starting_capital),
    PORTUGAL_ENTITY_MESSAGES.invalidAmount,
  );
  // The conditional disclosures are optional, but an unparseable entry must be reported
  // rather than submitted: the form writes `null` for anything it cannot parse, which would
  // erase a figure the entity had already published.
  addFormatIssue(
    "paid_up_capital",
    isSubmittablePortugalAmount(entity.paid_up_capital),
    PORTUGAL_ENTITY_MESSAGES.invalidAmount,
  );
  addFormatIssue(
    "paid_up_capital",
    !isNegativePortugalAmount(entity.paid_up_capital),
    PORTUGAL_ENTITY_MESSAGES.amountNegative,
  );
  addFormatIssue("equity", isSubmittablePortugalAmount(entity.equity), PORTUGAL_ENTITY_MESSAGES.invalidAmount);
  addFormatIssue(
    "phone",
    !hasValue("phone") || isValidPortugalPhoneNumber(entity.phone),
    PORTUGAL_ENTITY_MESSAGES.invalidPhone,
  );
  addFormatIssue(
    "email",
    !hasValue("email") || isValidEmailAddress(entity.email),
    PORTUGAL_ENTITY_MESSAGES.invalidEmail,
  );

  // Portugal's own field limits, tighter than the generic entity schema.
  const withinLength = (value: string | null | undefined, max: number) => (value?.trim().length ?? 0) <= max;

  addFormatIssue(
    "name",
    withinLength(entity.name, PORTUGAL_ENTITY_NAME_MAX_LENGTH),
    PORTUGAL_ENTITY_MESSAGES.nameTooLong,
  );
  addFormatIssue(
    "address",
    withinLength(entity.address, PORTUGAL_ENTITY_ADDRESS_MAX_LENGTH),
    PORTUGAL_ENTITY_MESSAGES.addressTooLong,
  );
  addFormatIssue(
    "city",
    withinLength(entity.city, PORTUGAL_ENTITY_CITY_MAX_LENGTH),
    PORTUGAL_ENTITY_MESSAGES.cityTooLong,
  );

  // Keep existing combined registry values until an explicit company profile is chosen.
  if (isCompanyLegalForm(entity.legal_form)) {
    // The registration number is a registry number, not the NIF, and it is published
    // next to the registry office as one company identification string.
    addFormatIssue(
      "company_number",
      !hasValue("company_number") || isValidPortugalRegistrationNumber(entity.company_number),
      PORTUGAL_ENTITY_MESSAGES.invalidRegistrationNumber,
    );
    addFormatIssue(
      "registration_office",
      formatPortugalCompanyId(entity.registration_office, entity.company_number).length <=
        PORTUGAL_COMPANY_ID_MAX_LENGTH,
      PORTUGAL_ENTITY_MESSAGES.companyIdTooLong,
    );
  }

  return issues;
}

/**
 * Zod adapter for `getPortugalEntityIssues`. Entity forms drop this into a
 * `superRefine` so the Portugal rules stay in one place instead of being
 * restated per form. Field names must match the form's field names.
 */
export function applyPortugalEntityIssues(
  entity: PortugalEntityInput,
  ctx: RefinementCtx,
  options: PortugalEntityIssueOptions = {},
): void {
  for (const issue of getPortugalEntityIssues(entity, options)) {
    ctx.addIssue({ code: "custom", path: [issue.field], message: issue.message });
  }
}

const PORTUGAL_REQUIRED_FIELDS_ERROR = /Portugal entities require these fields:\s*(.+)$/;

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";

  const candidate = error as {
    message?: unknown;
    data?: { message?: unknown };
    error?: { message?: unknown };
  };

  // SDK errors put the API response body on `data`; their own `message` is only the
  // generic HTTP summary, so `data.message` has to be checked first.
  if (typeof candidate.data?.message === "string") return candidate.data.message;
  if (typeof candidate.error?.message === "string") return candidate.error.message;
  if (typeof candidate.message === "string") return candidate.message;

  return "";
}

/**
 * Recognise the API's Portugal-required-fields rejection and name the fields it
 * listed.
 *
 * The server resolves country names this client cannot (a database of local names
 * plus an AI fallback), so it can decide an entity is Portuguese when the form
 * never worked that out and never showed the Portugal inputs. Treat this rejection
 * as the server telling us the country: the form can then reveal those inputs
 * instead of leaving the user stuck behind an error about fields they were never
 * offered.
 *
 * Matched on the message because the API has no machine-readable code for it. The
 * message itself is never shown — callers render their own localized copy.
 */
export function getPortugalRequiredFieldsFromError(error: unknown): PortugalApiEntityField[] {
  const match = PORTUGAL_REQUIRED_FIELDS_ERROR.exec(getErrorMessage(error));
  if (!match) return [];

  const listed = new Set(
    match[1].split(",").map((field) => {
      const name = field.trim();
      return PORTUGAL_API_FIELD_ALIASES[name] ?? name;
    }),
  );

  return PORTUGAL_API_ENTITY_FIELDS.filter((field) => listed.has(field));
}
