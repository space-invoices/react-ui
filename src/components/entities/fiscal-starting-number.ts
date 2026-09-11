import { z } from "zod";

export const FISCAL_STARTING_NUMBER_MAX = 999999999;

/**
 * Shared zod schema for an optional fiscal starting number on a register form.
 * The message mirrors {@link getFiscalStartingNumberError}; the visible error is rendered
 * by StartingNumberInput (translated), so both surfaces agree on the bound.
 */
export const fiscalStartingNumberZodSchema = z
  .number()
  .int()
  .min(1, `Starting number must be between 1 and ${FISCAL_STARTING_NUMBER_MAX}`)
  .max(FISCAL_STARTING_NUMBER_MAX, `Starting number must be between 1 and ${FISCAL_STARTING_NUMBER_MAX}`)
  .optional();

/** Whether a premise/device record still allows editing its starting number. */
export function canEditStartingNumber(record: { can_update_starting_number?: boolean }) {
  return record.can_update_starting_number !== false;
}

export function sanitizeFiscalStartingNumberInput(value: string) {
  return value.replace(/[^0-9]/g, "");
}

/**
 * Digits only. `Number()` reads "-1", "1.5" and "1e3" as 1, 1.5 and 1000, so a raw entry
 * has to be matched as text before it is converted: a fiscal number must be the one the
 * issuer typed, or an error, never a different number.
 */
const FISCAL_STARTING_NUMBER_PATTERN = /^\d+$/;

export function getFiscalStartingNumberError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const number = Number(trimmed);
  if (!FISCAL_STARTING_NUMBER_PATTERN.test(trimmed) || number < 1 || number > FISCAL_STARTING_NUMBER_MAX) {
    return `Starting number must be between 1 and ${FISCAL_STARTING_NUMBER_MAX}`;
  }

  return null;
}

export function isFiscalStartingNumberValueValid(value: string) {
  return getFiscalStartingNumberError(value) === null;
}

export function optionalFiscalStartingNumber(value: string) {
  return value.trim() ? Number(value) : undefined;
}

export function nullableFiscalStartingNumber(value: string) {
  return value.trim() ? Number(value) : null;
}
