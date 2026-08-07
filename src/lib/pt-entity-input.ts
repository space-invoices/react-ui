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

/** Share capital as the API accepts it — anything unparseable must not be submitted. */
export function toSubmittableShareCapital(value: number | string | null | undefined): number | undefined {
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
 * Fields the API requires on every Portugal entity. Order matches the API so the
 * first reported issue is the same one the API would report.
 */
export const PORTUGAL_REQUIRED_ENTITY_FIELDS = [
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

export type PortugalRequiredEntityField = (typeof PORTUGAL_REQUIRED_ENTITY_FIELDS)[number];

export type PortugalEntityInput = {
  country_code?: string | null;
  tax_number?: string | null;
  company_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  post_code?: string | null;
  state?: string | null;
  /** Unparseable numeric input arrives as the raw string the user typed. */
  starting_capital?: number | string | null;
};

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
  latinOnly: "Must contain only Latin characters",
} as const;

export type PortugalEntityIssue = {
  field: PortugalRequiredEntityField;
  message: string;
};

export function isPortugalCountryCode(countryCode: string | null | undefined): boolean {
  return countryCode?.trim().toUpperCase() === PT_COUNTRY_CODE;
}

export function normalizePortugalTaxNumber(taxNumber: string | null | undefined): string {
  const normalized = taxNumber?.trim().toUpperCase() ?? "";

  return normalized.startsWith("PT") ? normalized.slice(2) : normalized;
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

/** Trims to match the API's `getMissingPortugalEntityFields`: blank is not a value. */
function isMissing(value: string | number | null | undefined): boolean {
  if (typeof value === "number") return Number.isNaN(value);
  return value == null || value.trim() === "";
}

export function getMissingPortugalEntityFields(entity: PortugalEntityInput): PortugalRequiredEntityField[] {
  if (!isPortugalCountryCode(entity.country_code)) {
    return [];
  }

  return PORTUGAL_REQUIRED_ENTITY_FIELDS.filter((field) => isMissing(entity[field]));
}

/**
 * Every Portugal field problem in the given input, in API report order. Returns
 * an empty list for non-Portugal entities so callers can apply it unconditionally.
 */
export function getPortugalEntityIssues(entity: PortugalEntityInput): PortugalEntityIssue[] {
  if (!isPortugalCountryCode(entity.country_code)) {
    return [];
  }

  const issues: PortugalEntityIssue[] = getMissingPortugalEntityFields(entity).map((field) => ({
    field,
    message: PORTUGAL_ENTITY_MESSAGES.required,
  }));
  const missingFields = new Set(issues.map((issue) => issue.field));

  const addFormatIssue = (field: PortugalRequiredEntityField, isValid: boolean, message: string) => {
    if (missingFields.has(field) || isValid) return;
    issues.push({ field, message });
  };

  addFormatIssue(
    "tax_number",
    isValidPortugalTaxNumber(entity.tax_number) && !isPortugalPlaceholderTaxNumber(entity.tax_number),
    PORTUGAL_ENTITY_MESSAGES.invalidTaxNumber,
  );
  addFormatIssue("phone", isValidPortugalPhoneNumber(entity.phone), PORTUGAL_ENTITY_MESSAGES.invalidPhone);
  addFormatIssue("email", isValidEmailAddress(entity.email), PORTUGAL_ENTITY_MESSAGES.invalidEmail);
  addFormatIssue("address", isValidPortugalLatinText(entity.address), PORTUGAL_ENTITY_MESSAGES.latinOnly);
  addFormatIssue("city", isValidPortugalLatinText(entity.city), PORTUGAL_ENTITY_MESSAGES.latinOnly);
  addFormatIssue("post_code", isValidPortugalPostCode(entity.post_code), PORTUGAL_ENTITY_MESSAGES.invalidPostCode);
  addFormatIssue(
    "starting_capital",
    typeof entity.starting_capital === "number" && Number.isFinite(entity.starting_capital),
    PORTUGAL_ENTITY_MESSAGES.required,
  );

  return issues;
}

/**
 * Zod adapter for `getPortugalEntityIssues`. Entity forms drop this into a
 * `superRefine` so the Portugal rules stay in one place instead of being
 * restated per form. Field names must match the form's field names.
 */
export function applyPortugalEntityIssues(entity: PortugalEntityInput, ctx: RefinementCtx): void {
  for (const issue of getPortugalEntityIssues(entity)) {
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
export function getPortugalRequiredFieldsFromError(error: unknown): PortugalRequiredEntityField[] {
  const match = PORTUGAL_REQUIRED_FIELDS_ERROR.exec(getErrorMessage(error));
  if (!match) return [];

  const listed = new Set(match[1].split(",").map((field) => field.trim()));

  return PORTUGAL_REQUIRED_ENTITY_FIELDS.filter((field) => listed.has(field));
}
