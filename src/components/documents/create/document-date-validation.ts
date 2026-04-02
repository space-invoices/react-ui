import { z } from "zod";
import { normalizeDateOnlyInput } from "../../../lib/date-only";

type DocumentDateValues = {
  date?: string | null;
  date_due?: string | null;
  date_valid_till?: string | null;
  date_service?: string | null;
  date_service_to?: string | null;
};

const messages = {
  dateInFuture: "Document date cannot be in the future.",
  serviceDateAfterIssueDate: "Service date cannot be later than the issue date.",
  serviceDateToAfterIssueDate: "Service period end date cannot be later than the issue date.",
  serviceDateToBeforeServiceDate: "Service period end date must be on or after the service start date.",
  dueDateBeforeIssueDate: "Due date must be on or after the issue date.",
  validTillBeforeIssueDate: "Valid until date must be on or after the issue date.",
} as const;

function compareDateOnly(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function getTodayDateOnly(): string {
  return normalizeDateOnlyInput(new Date().toISOString()) ?? "";
}

function addCustomIssue(
  ctx: z.RefinementCtx,
  path: string[],
  message: string,
  condition: boolean,
) {
  if (!condition) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  });
}

function applyBaseDocumentDateRules(value: DocumentDateValues, ctx: z.RefinementCtx) {
  const date = normalizeDateOnlyInput(value.date ?? undefined);
  addCustomIssue(ctx, ["date"], messages.dateInFuture, !!date && compareDateOnly(date, getTodayDateOnly()) > 0);
}

function applyInvoiceLikeServiceDateRules(value: DocumentDateValues, ctx: z.RefinementCtx) {
  const date = normalizeDateOnlyInput(value.date ?? undefined);
  const dateService = normalizeDateOnlyInput(value.date_service ?? undefined);
  const dateServiceTo = normalizeDateOnlyInput(value.date_service_to ?? undefined);

  addCustomIssue(
    ctx,
    ["date_service"],
    messages.serviceDateAfterIssueDate,
    !!date && !!dateService && compareDateOnly(dateService, date) > 0,
  );
  addCustomIssue(
    ctx,
    ["date_service_to"],
    messages.serviceDateToAfterIssueDate,
    !!date && !!dateServiceTo && compareDateOnly(dateServiceTo, date) > 0,
  );
  addCustomIssue(
    ctx,
    ["date_service_to"],
    messages.serviceDateToBeforeServiceDate,
    !!dateService && !!dateServiceTo && compareDateOnly(dateServiceTo, dateService) < 0,
  );
}

export function withInvoiceIssueDateValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const document = value as DocumentDateValues;
    applyBaseDocumentDateRules(document, ctx);
    applyInvoiceLikeServiceDateRules(document, ctx);

    const date = normalizeDateOnlyInput(document.date ?? undefined);
    const dateDue = normalizeDateOnlyInput(document.date_due ?? undefined);

    addCustomIssue(ctx, ["date_due"], messages.dueDateBeforeIssueDate, !!date && !!dateDue && compareDateOnly(dateDue, date) < 0);
  });
}

export function withCreditNoteIssueDateValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const document = value as DocumentDateValues;
    applyBaseDocumentDateRules(document, ctx);
    applyInvoiceLikeServiceDateRules(document, ctx);
  });
}

export function withEstimateIssueDateValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const document = value as DocumentDateValues;
    applyBaseDocumentDateRules(document, ctx);

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
