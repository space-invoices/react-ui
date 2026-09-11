import { z } from "zod";

export const PT_OPERATOR_ID_MAX_LENGTH = 30;
export const PT_CORRECTION_REASON_MAX_LENGTH = 50;

export const PT_SERIES_ID_MESSAGE = "Select an active recovery series.";
export const PT_MANUAL_SERIES_CODE_MESSAGE = "Enter the series printed on the paper document.";
export const PT_MANUAL_SEQUENTIAL_NUMBER_MESSAGE = "Enter the number printed on the paper document.";
export const PT_MANUAL_SEQUENTIAL_NUMBER_FORMAT_MESSAGE =
  "Enter the number exactly as it is printed, digits only. Leading zeros are kept.";

/** Matches the API bound: a paper number is copied as digit text, so 20 digits is the ceiling. */
export const PT_MANUAL_SEQUENTIAL_NUMBER_MAX_LENGTH = 20;

/**
 * Digits with at least one non-zero digit. Any leading zeros are part of the printed
 * reference, so they are matched rather than stripped; "0", "-1", "1.5" and "1e3" are
 * not numbers printed on a Portuguese document and are rejected as typed.
 */
const PT_MANUAL_SEQUENTIAL_NUMBER_PATTERN = /^0*[1-9][0-9]*$/;

/**
 * The number printed on the paper original. Text is the storage form because it is the
 * only one that keeps "00001" distinct from "1"; the integer form stays accepted so
 * documents and integrations recorded before the text form remain readable and editable.
 */
export type PtManualSequentialNumber = string | number;

export function isPtManualSequentialNumber(value: unknown): value is PtManualSequentialNumber {
  if (typeof value === "number") return Number.isSafeInteger(value) && value >= 1;
  if (typeof value !== "string") return false;

  return value.length <= PT_MANUAL_SEQUENTIAL_NUMBER_MAX_LENGTH && PT_MANUAL_SEQUENTIAL_NUMBER_PATTERN.test(value);
}

/**
 * The error a stored entry shows, or null while it is blank or acceptable. The value is
 * read exactly as it was typed: a paper number is copied character for character, so
 * nothing here trims or rewrites it before deciding whether it is acceptable.
 */
export function getPtManualSequentialNumberError(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;

  return isPtManualSequentialNumber(value) ? null : PT_MANUAL_SEQUENTIAL_NUMBER_FORMAT_MESSAGE;
}

export const ptDocumentInputFormSchema = z
  .object({
    series_id: z.string().optional(),
    manual: z.boolean().optional(),
    /**
     * Held as typed, and checked in the refinement below rather than here. A rejected entry
     * that fails the base object skips every refinement with it, which would drop the
     * paper-series requirement at the same time and report neither on its own control.
     */
    manual_sequential_number: z.union([z.string(), z.number()]).nullish(),
    manual_series_code: z.string().min(1).max(35).optional(),
    /**
     * Non-secret label for whoever issued the document. The API defaults it from the
     * signed-in user or the API principal, so no routine form has to ask for it.
     */
    operator_id: z.string().max(PT_OPERATOR_ID_MAX_LENGTH).optional(),
    /** Why a Portuguese credit note is being issued. */
    correction_reason: z.string().max(PT_CORRECTION_REASON_MAX_LENGTH).optional(),
  })
  .partial()
  .superRefine((value, ctx) => {
    const sequentialNumber = value.manual_sequential_number;
    const hasSequentialNumber = sequentialNumber !== undefined && sequentialNumber !== null && sequentialNumber !== "";

    // A recovered document is issued into a recovery series, so the series the document
    // lands in has to be chosen rather than left to a default.
    if (value.manual === true && !value.series_id?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["series_id"],
        message: PT_SERIES_ID_MESSAGE,
      });
    }

    // A recovered document states which paper original it reproduces. Neither fact can be
    // guessed from the recovery series, so a blank or rejected entry has to block the form
    // rather than reach issuance as an invented series code or number.
    if (value.manual === true && !value.manual_series_code?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["manual_series_code"],
        message: PT_MANUAL_SERIES_CODE_MESSAGE,
      });
    }

    if (!hasSequentialNumber) {
      if (value.manual === true) {
        ctx.addIssue({
          code: "custom",
          path: ["manual_sequential_number"],
          message: PT_MANUAL_SEQUENTIAL_NUMBER_MESSAGE,
        });
      }

      return;
    }

    if (!isPtManualSequentialNumber(sequentialNumber)) {
      ctx.addIssue({
        code: "custom",
        path: ["manual_sequential_number"],
        message: PT_MANUAL_SEQUENTIAL_NUMBER_FORMAT_MESSAGE,
      });
    }
  });

export type PtDocumentInputForm = z.infer<typeof ptDocumentInputFormSchema>;

/**
 * Reasons Portuguese issuers commonly give on a credit note, stored in Portuguese
 * because that is the language the document and the tax authority read.
 *
 * These are suggestions only. Nothing here is preselected: the reason states what
 * actually happened, and the form is not entitled to decide that on the issuer's
 * behalf. `id` keys the localized gloss shown beside each suggestion.
 */
export const PT_CORRECTION_REASON_SUGGESTIONS = [
  { id: "billing_error", value: "Erro de faturação" },
  { id: "returned_goods", value: "Devolução de mercadoria" },
  { id: "price_correction", value: "Correção de preço" },
  { id: "commercial_discount", value: "Desconto comercial" },
  { id: "service_cancelled", value: "Cancelamento do serviço" },
] as const;

export type PtCorrectionReasonSuggestion = (typeof PT_CORRECTION_REASON_SUGGESTIONS)[number];

/**
 * Whether a Portuguese credit note states why it is being issued. The API accepts
 * either the dedicated reason field or a concise note on the document itself, so
 * an issuer who already explained it in the note is not asked twice.
 */
export function hasPortugalCorrectionReason(document: {
  pt?: Pick<PtDocumentInputForm, "correction_reason"> | null;
  note?: string | null;
}): boolean {
  if (document.pt?.correction_reason?.trim()) return true;

  const note = document.note?.trim() ?? "";

  return note.length > 0 && note.length <= PT_CORRECTION_REASON_MAX_LENGTH;
}

export const PT_CORRECTION_REASON_MESSAGE = "State why this credit note is being issued.";

/**
 * Portugal credit notes have to say why they exist. Wrap the credit-note form
 * schema with this for Portugal entities only; the message lands on the reason
 * control, which is where the issuer can act on it.
 */
export function withPortugalCorrectionReason<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const document = value as { pt?: Pick<PtDocumentInputForm, "correction_reason"> | null; note?: string | null };
    if (hasPortugalCorrectionReason(document)) return;

    ctx.addIssue({
      code: "custom",
      path: ["pt", "correction_reason"],
      message: PT_CORRECTION_REASON_MESSAGE,
    });
  });
}

export type PtDocumentNumberingType = "invoice" | "advance_invoice" | "credit_note" | "estimate";

export function formatPtManualDocumentNumber(
  documentType: PtDocumentNumberingType,
  manualSeriesCode: string,
  sequence: PtManualSequentialNumber,
) {
  const prefix = documentType === "credit_note" ? "NC" : documentType === "estimate" ? "OR" : "FT";
  return `${prefix}M ${manualSeriesCode}/${String(sequence)}`;
}

export function normalizePtDocumentInput(
  input: PtDocumentInputForm | null | undefined,
): PtDocumentInputForm | undefined {
  if (!input) return undefined;

  const normalized: PtDocumentInputForm = {};

  if (input.series_id?.trim()) normalized.series_id = input.series_id.trim();
  if (input.manual === true) normalized.manual = true;

  if (input.manual_series_code?.trim()) {
    normalized.manual_series_code = input.manual_series_code.trim();
  }

  // Sent in the form it arrived in: the API accepts text and the legacy integer, and text
  // keeps a printed leading zero on the document it was copied from. What was typed is what
  // is checked and what is sent, so an entry the form accepted cannot change on its way out.
  const sequentialNumber = input.manual_sequential_number;

  if (isPtManualSequentialNumber(sequentialNumber)) {
    normalized.manual_sequential_number = sequentialNumber;
  }

  if (input.operator_id?.trim()) normalized.operator_id = input.operator_id.trim();
  if (input.correction_reason?.trim()) normalized.correction_reason = input.correction_reason.trim();

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
