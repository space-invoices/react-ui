/**
 * Advance invoice form schema.
 *
 * Requires: ./shared.ts
 */
import type { CreateAdvanceInvoice } from "@spaceinvoices/js-sdk";
import { z } from "zod";
import { customerSchema, lineItemSchema, transformItemsForApi } from "./shared";

// Advance invoices don't have payment_terms - they are documents requesting payment
export const advanceInvoiceFormSchema = z.object({
  number: z.string().max(100).optional(),
  date: z.string().optional(),
  customer_id: z.string().nullish(),
  customer: customerSchema,
  items: z.array(lineItemSchema).min(1),
  note: z.string().nullish(),
  currency_code: z.string().max(3).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  linked_documents: z.array(z.string()).optional(),
  furs: z
    .object({
      business_premise_name: z.string().optional(),
      electronic_device_name: z.string().optional(),
      operator_tax_number: z.string().optional(),
      operator_label: z.string().optional(),
      skip: z.boolean().optional(),
    })
    .optional(),
  eslog: z.object({ validation_enabled: z.boolean().optional() }).optional(),
  bank_account_index: z.number().optional(),
});

export type AdvanceInvoiceFormValues = z.infer<typeof advanceInvoiceFormSchema>;

/** Convert form values to API request */
export function toCreateAdvanceInvoiceRequest(values: AdvanceInvoiceFormValues): CreateAdvanceInvoice {
  return {
    ...values,
    items: transformItemsForApi(values.items ?? []),
  } as CreateAdvanceInvoice;
}
