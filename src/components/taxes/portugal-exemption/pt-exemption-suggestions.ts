import { ptExemptionDefaultReasons } from "@/ui/generated/schemas/pt-exemption-defaults";

/** Common shortcuts; all supported standard wording comes from the API catalogue. */
export const PT_EXEMPTION_SUGGESTIONS = ["M02", "M07", "M13", "M16", "M99"].map((code) => ({
  code,
  reason: ptExemptionDefaultReasons[code],
}));
export const PT_EXEMPTION_OPTIONS = Object.entries(ptExemptionDefaultReasons).map(([code, reason]) => ({
  code,
  reason,
}));

function normalizeCode(code?: string | null) {
  const normalized = code?.trim().toUpperCase();
  return normalized ? normalized : undefined;
}

function normalizeReason(reason?: string | null) {
  const normalized = reason?.trim();
  return normalized ? normalized : undefined;
}

/** Suggested legal reason for an exemption code, or `undefined` when the code has none. */
export function getPtExemptionSuggestedReason(code?: string | null) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return undefined;

  return Object.hasOwn(ptExemptionDefaultReasons, normalizedCode)
    ? ptExemptionDefaultReasons[normalizedCode]
    : undefined;
}

/**
 * M19 ("Outras isenções") has no standard wording, so the issuer must write its own legal reason;
 * issuance is rejected without one.
 */
export function requiresPtExemptionCustomReason(code?: string | null) {
  return normalizeCode(code) === "M19";
}

/**
 * Reason value that should be treated as automatic when a form hydrates: an existing reason
 * that is byte-identical to its own code's suggestion is indistinguishable from one this UI
 * filled in, so a later code change may replace it. Anything else is a custom reason.
 */
export function getPtExemptionAutomaticReasonSeed(code?: string | null, reason?: string | null) {
  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) return undefined;

  return normalizedReason === getPtExemptionSuggestedReason(code) ? normalizedReason : undefined;
}

export type PtExemptionReasonState = {
  /** Exemption code the form now holds. */
  code?: string | null;
  /** Reason the form now holds. */
  reason?: string | null;
  /** Reason this UI last suggested, used to tell an untouched suggestion from a custom reason. */
  automaticReason?: string;
};

/**
 * Resolves the reason after the exemption code changed.
 *
 * - An empty reason, or a reason still equal to the previous automatic suggestion, follows the
 *   new code's suggestion (and is cleared when the new code has none, so one code's legal basis
 *   never survives under another).
 * - Any other reason is a custom or user-edited value and is preserved untouched.
 */
export function applyPtExemptionCodeChange({ code, reason, automaticReason }: PtExemptionReasonState) {
  const currentReason = normalizeReason(reason);
  const isAutomatic = currentReason === undefined || currentReason === automaticReason;

  if (!isAutomatic) {
    return { reason: reason ?? undefined, automaticReason };
  }

  const suggestedReason = getPtExemptionSuggestedReason(code);
  return { reason: suggestedReason, automaticReason: suggestedReason };
}
