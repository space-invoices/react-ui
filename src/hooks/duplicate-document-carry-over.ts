/**
 * Carry-over policy for document duplication.
 *
 * Duplication covers two different operations that need opposite rules:
 * - Re-issue (same source and target type): a new commercial event. Dates move to the new
 *   document, periods advance, and document-specific references are not reused.
 * - Conversion (source type differs from target type): the same commercial event moving
 *   through the sales lifecycle. Dates that describe the supply follow the source document.
 */
import { getDocumentDefaultFields } from "@/ui/components/documents/create/business-unit-utils";
import { normalizeApiDateOnlyInput, toLocalCalendarDate, toLocalDateOnlyString } from "@/ui/lib/date-only";

export type DuplicateDocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

/** Document types whose forms manage a payment due date. */
const DUE_DATE_TYPES: DuplicateDocumentType[] = ["invoice"];

/** Text fields that fall back to per-document-type entity defaults when omitted. */
const DEFAULTED_TEXT_FIELDS = ["note", "payment_terms", "footer", "signature"] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function differenceInCalendarDays(
  from: string | null | undefined,
  to: string | null | undefined,
): number | null {
  const start = toLocalCalendarDate(from);
  const end = toLocalCalendarDate(to);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function addCalendarDays(value: string | null | undefined, days: number): string | undefined {
  const date = toLocalCalendarDate(value);
  if (!date) return undefined;
  date.setDate(date.getDate() + days);
  return toLocalDateOnlyString(date);
}

function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Whole months covered by a period that starts on the 1st and ends on a month's last day.
 *
 * Covers monthly, quarterly, and annual billing alike; returns 0 when the period is not a
 * clean run of calendar months, in which case the caller shifts by day count instead.
 */
function wholeCalendarMonthSpan(start: Date, end: Date): number {
  if (start.getDate() !== 1 || end.getDate() !== lastDayOfMonth(end)) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return months > 0 ? months : 0;
}

function shiftWholeMonths(start: Date, spanMonths: number, periodsShifted: number): { start: Date; end: Date } {
  const offset = spanMonths * periodsShifted;
  const shiftedStart = new Date(start.getFullYear(), start.getMonth() + offset, 1);
  const lastMonth = new Date(shiftedStart.getFullYear(), shiftedStart.getMonth() + spanMonths - 1, 1);
  const shiftedEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), lastDayOfMonth(lastMonth));
  return { start: shiftedStart, end: shiftedEnd };
}

/**
 * Advance a stored service period so it lands on the period the new document bills for.
 *
 * A period is shifted by whole periods until it ends on or after the new document date, so
 * duplicating July's monthly invoice in August bills August rather than re-declaring July.
 * Returns null when the stored period cannot be reasoned about; callers then leave the field
 * empty and let the form default to the new document date.
 */
export function shiftServicePeriod(
  dateService: string | null | undefined,
  dateServiceTo: string | null | undefined,
  newDate: string,
): { date_service: string; date_service_to: string } | null {
  const start = toLocalCalendarDate(dateService);
  const end = toLocalCalendarDate(dateServiceTo);
  const target = toLocalCalendarDate(newDate);
  if (!start || !end || !target) return null;
  if (end.getTime() < start.getTime()) return null;

  const spanMonths = wholeCalendarMonthSpan(start, end);
  if (spanMonths > 0) {
    // Monthly, quarterly and annual periods all advance by whole months so the new period keeps
    // its own month boundaries instead of drifting by a fixed day count. Estimate the number of
    // periods, then correct it against the real requirement - the period must end on or after
    // the new document date without overshooting by a whole period. Comparing dates rather than
    // day-of-month numbers keeps end-of-month cases exact, and the correction is bounded by the
    // estimate's error rather than by an arbitrary iteration cap.
    const monthsBehind = (target.getFullYear() - end.getFullYear()) * 12 + (target.getMonth() - end.getMonth());
    let periods = Math.max(0, Math.ceil(monthsBehind / spanMonths));
    while (shiftWholeMonths(start, spanMonths, periods).end.getTime() < target.getTime()) {
      periods += 1;
    }
    while (periods > 0 && shiftWholeMonths(start, spanMonths, periods - 1).end.getTime() >= target.getTime()) {
      periods -= 1;
    }

    const shifted = shiftWholeMonths(start, spanMonths, periods);
    return {
      date_service: toLocalDateOnlyString(shifted.start),
      date_service_to: toLocalDateOnlyString(shifted.end),
    };
  }

  const periodLength = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  if (periodLength <= 0) return null;

  // Same reasoning as the month path: derive the number of whole periods instead of stepping,
  // so an old source document cannot leave the period short of the new document date.
  const daysBehind = Math.round((target.getTime() - end.getTime()) / MS_PER_DAY);
  const periods = daysBehind > 0 ? Math.ceil(daysBehind / periodLength) : 0;
  const shiftedStart = new Date(start.getTime());
  const shiftedEnd = new Date(end.getTime());
  shiftedStart.setDate(shiftedStart.getDate() + periodLength * periods);
  shiftedEnd.setDate(shiftedEnd.getDate() + periodLength * periods);

  return {
    date_service: toLocalDateOnlyString(shiftedStart),
    date_service_to: toLocalDateOnlyString(shiftedEnd),
  };
}

export type CarriedDocumentDates = {
  date_due?: string;
  date_valid_till?: string;
  date_service?: string;
  date_service_to?: string;
};

type DateSource = {
  date?: string | null;
  date_due?: string | null;
  date_valid_till?: string | null;
  date_service?: string | null;
  date_service_to?: string | null;
};

/**
 * Resolve the dates a duplicate or conversion should start with.
 *
 * Payment terms are carried as an offset from the source document rather than as an absolute
 * date, so a customer-specific term survives duplication instead of reverting to the entity
 * default while the copied payment-terms text still describes the original term.
 */
export function resolveDuplicateDates({
  source,
  sourceType,
  targetType,
  newDate,
}: {
  source: DateSource;
  sourceType: DuplicateDocumentType | null;
  targetType: DuplicateDocumentType;
  newDate: string;
}): CarriedDocumentDates {
  const carried: CarriedDocumentDates = {};
  if (!sourceType) return carried;

  const isConversion = sourceType !== targetType;

  if (DUE_DATE_TYPES.includes(targetType) && DUE_DATE_TYPES.includes(sourceType)) {
    const dueOffset = differenceInCalendarDays(source.date, source.date_due);
    if (dueOffset !== null && dueOffset >= 0) {
      carried.date_due = addCalendarDays(newDate, dueOffset);
    }
  }

  if (targetType === "estimate" && sourceType === "estimate") {
    const validOffset = differenceInCalendarDays(source.date, source.date_valid_till);
    if (validOffset !== null && validOffset >= 0) {
      carried.date_valid_till = addCalendarDays(newDate, validOffset);
    }
  }

  if (!isConversion) {
    // A stored period describes the source document's supply. Advance it rather than
    // re-declaring it; a single service date simply follows the new document date.
    const shifted = shiftServicePeriod(source.date_service, source.date_service_to, newDate);
    if (shifted) {
      carried.date_service = shifted.date_service;
      carried.date_service_to = shifted.date_service_to;
    }
    return carried;
  }

  // A credit note corrects the original supply, so it keeps the source period exactly.
  if (sourceType === "invoice" && targetType === "credit_note") {
    const dateService = normalizeApiDateOnlyInput(source.date_service);
    const dateServiceTo = normalizeApiDateOnlyInput(source.date_service_to);
    if (dateService) carried.date_service = dateService;
    if (dateServiceTo) carried.date_service_to = dateServiceTo;
    return carried;
  }

  if (targetType === "invoice") {
    // The delivery date is the supply date the invoice must declare.
    if (sourceType === "delivery_note") {
      const deliveryDate = normalizeApiDateOnlyInput(source.date);
      if (deliveryDate) carried.date_service = deliveryDate;
      return carried;
    }

    if (sourceType === "advance_invoice") {
      const dateService = normalizeApiDateOnlyInput(source.date_service);
      const dateServiceTo = normalizeApiDateOnlyInput(source.date_service_to);
      if (dateService) carried.date_service = dateService;
      if (dateServiceTo) carried.date_service_to = dateServiceTo;
      return carried;
    }
  }

  return carried;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

/**
 * Drop text that the source document only carries because it is that type's default.
 *
 * Boilerplate is configured per document type, so carrying an estimate's note onto an invoice
 * would override the entity's invoice defaults with estimate wording. Text the user actually
 * customised is still carried through.
 *
 * `tax_clause` is deliberately not part of this: its defaults are keyed by transaction type
 * rather than document type, so they are the same for the source and the target. The carried
 * clause stays as a fallback and the create form replaces it when transaction-type defaults
 * resolve for the new document.
 */
/**
 * Whether a field's translations hold anything other than the source type's configured defaults.
 *
 * The create forms seed configured translated defaults, so the presence of a translation does not
 * make a field customised. A translation that differs from the source default - including an
 * intentional blank for a language the default fills - is user content, and because the scalar
 * and its translations are one unit the whole field is then carried rather than falling through
 * to the target type defaults.
 */
function hasNonDefaultTranslations(value: unknown, defaultValue: unknown): boolean {
  const entries = Object.entries((value ?? {}) as Record<string, unknown>);
  if (entries.length === 0) return false;

  const defaults = (defaultValue ?? {}) as Record<string, unknown>;
  return entries.some(([locale, text]) => defaults[locale] !== text);
}

export function stripSourceTypeDefaultText<T extends Record<string, any>>(
  values: T,
  {
    sourceType,
    targetType,
    settings,
  }: {
    sourceType: DuplicateDocumentType | null;
    targetType: DuplicateDocumentType;
    settings: Record<string, any> | null | undefined;
  },
): T {
  if (!sourceType || sourceType === targetType) return values;

  const sourceDefaults = getDocumentDefaultFields(sourceType, settings) as Record<string, any>;
  const next: Record<string, any> = { ...values };
  const translations = next.translations ? { ...(next.translations as Record<string, any>) } : undefined;

  for (const field of DEFAULTED_TEXT_FIELDS) {
    const value = next[field];
    const defaultValue = sourceDefaults[field];
    if (isBlank(value) || value !== defaultValue) continue;

    // The primary text is the source type's default; keep the field when its translations hold
    // anything the defaults do not, so user-written or intentionally blank content is not lost.
    if (translations && hasNonDefaultTranslations(translations[field], sourceDefaults.translations?.[field])) {
      continue;
    }

    delete next[field];
    if (translations) delete translations[field];
  }

  if (translations) {
    next.translations = Object.keys(translations).length > 0 ? translations : undefined;
  }

  return next as T;
}
