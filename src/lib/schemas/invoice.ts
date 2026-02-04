/**
 * Invoice form schema.
 *
 * Requires: ./shared.ts
 */
import type { CreateInvoiceBody } from "@spaceinvoices/js-sdk";
import { z } from "zod";
import { customerSchema, lineItemSchema, transformItemsForApi } from "./shared";

export const invoiceFormSchema = z.object({
  number: z.string().max(100).optional(),
  date: z.string().optional(),
  date_due: z.string().optional(),
  customer_id: z.string().nullish(),
  customer: customerSchema,
  items: z.array(lineItemSchema).min(1),
  note: z.string().nullish(),
  payment_terms: z.string().nullish(),
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

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

/** Convert form values to API request */
export function toCreateInvoiceRequest(values: InvoiceFormValues): CreateInvoiceBody {
  return {
    ...values,
    items: transformItemsForApi(values.items ?? []),
  } as CreateInvoiceBody;
}
