import { z } from "zod";
import { normalizeDateOnlyInput } from "../../../lib/date-only";

type DocumentDateValues = {
  date?: string | null;
  date_due?: string | null;
  date_valid_till?: string | null;
  date_service?: string | null;
  date_service_to?: string | null;
};

/** Only the part of the Portugal document input this rule reads. */
type PortugalDateValues = DocumentDateValues & {
  pt?: { manual?: boolean | null } | null;
};

export type DocumentDateRuleOptions = {
  /** Calendar-day source for country-specific document rules. */
  getToday?: () => string;
};

const messages = {
  dateInFuture: "Document date cannot be in the future.",
  serviceDateToBeforeServiceDate: "Service period end date must be on or after the service start date.",
  dueDateBeforeIssueDate: "Due date must be on or after the issue date.",
  validTillBeforeIssueDate: "Valid until date must be on or after the issue date.",
  portugalIssueDateNotToday: "Portuguese documents must be issued with today's date.",
} as const;

export const documentDateValidationMessages = messages;

const PORTUGAL_TIME_ZONE = "Europe/Lisbon";

/**
 * Today in Portugal. The issue date is a Portuguese calendar day, so a user in
 * another time zone — or an entity whose browser is an hour behind Lisbon — must
 * still see the day the document will actually carry.
 */
export function getPortugalToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PORTUGAL_TIME_ZONE }).format(now);
}

function compareDateOnly(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function getTodayDateOnly(): string {
  return normalizeDateOnlyInput(new Date().toISOString()) ?? "";
}

function addCustomIssue(ctx: z.RefinementCtx, path: string[], message: string, condition: boolean) {
  if (!condition) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  });
}

function applyBaseDocumentDateRules(
  value: DocumentDateValues,
  ctx: z.RefinementCtx,
  options: DocumentDateRuleOptions = {},
) {
  const date = normalizeDateOnlyInput(value.date ?? undefined);
  addCustomIssue(
    ctx,
    ["date"],
    messages.dateInFuture,
    !!date && compareDateOnly(date, options.getToday?.() ?? getTodayDateOnly()) > 0,
  );
}

function applyInvoiceLikeServiceDateRules(value: DocumentDateValues, ctx: z.RefinementCtx) {
  const dateService = normalizeDateOnlyInput(value.date_service ?? undefined);
  const dateServiceTo = normalizeDateOnlyInput(value.date_service_to ?? undefined);

  addCustomIssue(
    ctx,
    ["date_service_to"],
    messages.serviceDateToBeforeServiceDate,
    !!dateService && !!dateServiceTo && compareDateOnly(dateServiceTo, dateService) < 0,
  );
}

export function withInvoiceIssueDateValidation<T extends z.ZodTypeAny>(
  schema: T,
  options: DocumentDateRuleOptions = {},
) {
  return schema.superRefine((value, ctx) => {
    const document = value as DocumentDateValues;
    applyBaseDocumentDateRules(document, ctx, options);
    applyInvoiceLikeServiceDateRules(document, ctx);

    const date = normalizeDateOnlyInput(document.date ?? undefined);
    const dateDue = normalizeDateOnlyInput(document.date_due ?? undefined);

    addCustomIssue(
      ctx,
      ["date_due"],
      messages.dueDateBeforeIssueDate,
      !!date && !!dateDue && compareDateOnly(dateDue, date) < 0,
    );
  });
}

export function withCreditNoteIssueDateValidation<T extends z.ZodTypeAny>(
  schema: T,
  options: DocumentDateRuleOptions = {},
) {
  return schema.superRefine((value, ctx) => {
    const document = value as DocumentDateValues;
    applyBaseDocumentDateRules(document, ctx, options);
    applyInvoiceLikeServiceDateRules(document, ctx);
  });
}

/**
 * Portugal only issues a document on the day it is created. An earlier date is
 * legitimate solely for a manual/offline document, which records something that
 * was already issued on paper — so the rule steps aside as soon as manual mode is
 * on. Service dates are unaffected: when the work was done is a separate fact from
 * when the document was issued.
 *
 * Wrap the form schema with this only for Portugal entities; every other country
 * keeps the plain not-in-the-future rule.
 */
export function withPortugalIssueDateValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const document = value as PortugalDateValues;
    if (document.pt?.manual === true) return;

    const date = normalizeDateOnlyInput(document.date ?? undefined);

    addCustomIssue(
      ctx,
      ["date"],
      messages.portugalIssueDateNotToday,
      !!date && compareDateOnly(date, getPortugalToday()) !== 0,
    );
  });
}

export function withEstimateIssueDateValidation<T extends z.ZodTypeAny>(
  schema: T,
  options: DocumentDateRuleOptions = {},
) {
  return schema.superRefine((value, ctx) => {
    const document = value as DocumentDateValues;
    applyBaseDocumentDateRules(document, ctx, options);

    const date = normalizeDateOnlyInput(document.date ?? undefined);
    const validTill = normalizeDateOnlyInput(document.date_valid_till ?? undefined);

    addCustomIssue(
      ctx,
      ["date_valid_till"],
      messages.validTillBeforeIssueDate,
      !!date && !!validTill && compareDateOnly(validTill, date) < 0,
    );
  });
}
