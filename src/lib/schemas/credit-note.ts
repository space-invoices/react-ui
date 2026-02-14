/**
 * Credit note form schema.
 *
 * Requires: ./shared.ts
 */
import type { CreateCreditNote } from "@spaceinvoices/js-sdk";
import { z } from "zod";
import { customerSchema, lineItemSchema, transformItemsForApi } from "./shared";

export const creditNoteFormSchema = z.object({
  number: z.string().max(100).optional(),
  date: z.string().optional(),
  customer_id: z.string().nullish(),
  customer: customerSchema,
  items: z.array(lineItemSchema).min(1),
  note: z.string().nullish(),
  payment_terms: z.string().nullish(),
  currency_code: z.string().max(3).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  linked_documents: z.array(z.string()).optional(),
  eslog: z.object({ validation_enabled: z.boolean().optional() }).optional(),
});

export type CreditNoteFormValues = z.infer<typeof creditNoteFormSchema>;

/** Convert form values to API request */
export function toCreateCreditNoteRequest(values: CreditNoteFormValues): CreateCreditNote {
  return {
    ...values,
    items: transformItemsForApi(values.items ?? []),
  } as CreateCreditNote;
}
