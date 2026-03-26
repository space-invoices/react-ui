import { z } from "zod";

export const ptDocumentInputFormSchema = z
  .object({
    series_id: z.string().optional(),
    manual: z.boolean().optional(),
    manual_sequential_number: z.number().int().gte(1).optional(),
    manual_series_code: z.string().min(1).max(35).optional(),
    operator_first_name: z.string().optional(),
    operator_last_name: z.string().optional(),
    operator_tax_number: z.string().optional(),
    account_first_name: z.string().optional(),
    account_last_name: z.string().optional(),
    account_tax_number: z.string().optional(),
  })
  .partial();

export type PtDocumentInputForm = z.infer<typeof ptDocumentInputFormSchema>;

export type PtDocumentNumberingType = "invoice" | "advance_invoice" | "credit_note" | "estimate";

export function formatPtManualDocumentNumber(
  documentType: PtDocumentNumberingType,
  manualSeriesCode: string,
  sequence: number,
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

  if (typeof input.manual_sequential_number === "number" && Number.isFinite(input.manual_sequential_number)) {
    normalized.manual_sequential_number = input.manual_sequential_number;
  }

  const operatorFirstName = input.operator_first_name?.trim() || input.account_first_name?.trim();
  const operatorLastName = input.operator_last_name?.trim() || input.account_last_name?.trim();
  const operatorTaxNumber = input.operator_tax_number?.trim() || input.account_tax_number?.trim();

  if (operatorFirstName) {
    normalized.operator_first_name = operatorFirstName;
    normalized.account_first_name = operatorFirstName;
  }
  if (operatorLastName) {
    normalized.operator_last_name = operatorLastName;
    normalized.account_last_name = operatorLastName;
  }
  if (operatorTaxNumber) {
    normalized.operator_tax_number = operatorTaxNumber;
    normalized.account_tax_number = operatorTaxNumber;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
