/**
 * Estimate form schema.
 *
 * Requires: ./shared.ts
 */
import type { CreateEstimate } from "@spaceinvoices/js-sdk";
import { z } from "zod";
import { customerSchema, lineItemSchema, transformItemsForApi } from "./shared";

export const estimateFormSchema = z.object({
  number: z.string().max(100).optional(),
  date: z.string().optional(),
  date_valid_till: z.string().optional(),
  customer_id: z.string().nullish(),
  customer: customerSchema,
  items: z.array(lineItemSchema).min(1),
  note: z.string().nullish(),
  payment_terms: z.string().nullish(),
  currency_code: z.string().max(3).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type EstimateFormValues = z.infer<typeof estimateFormSchema>;

/** Convert form values to API request */
export function toCreateEstimateRequest(values: EstimateFormValues): CreateEstimate {
  return {
    ...values,
    items: transformItemsForApi(values.items ?? []),
  } as CreateEstimate;
}
