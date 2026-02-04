/**
 * Shared form schema building blocks.
 *
 * These are reusable across document forms (invoice, estimate, credit note, etc.)
 * Copy this file along with any document-specific schema you need.
 */
import { z } from "zod";

/** Customer schema - for inline customer data on documents */
export const customerSchema = z
  .object({
    name: z.string().nullish(),
    email: z.string().email().nullish(),
    address: z.string().nullish(),
    address_2: z.string().nullish(),
    post_code: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    country: z.string().nullish(),
    country_code: z.string().nullish(),
    tax_number: z.string().nullish(),
    save_customer: z.boolean().optional(),
  })
  .nullish();

export type CustomerFormData = z.infer<typeof customerSchema>;

/** Tax schema for line items */
export const taxSchema = z.object({
  rate: z.number().optional(),
  tax_id: z.string().optional(),
  classification: z.string().optional(),
  reverse_charge: z.boolean().optional(),
  amount: z.number().optional(),
});

export type TaxFormData = z.infer<typeof taxSchema>;

/** Discount schema for line items */
export const discountSchema = z.object({
  value: z.number().min(0),
  type: z.enum(["percent", "amount"]).optional().default("percent"),
});

export type DiscountFormData = z.infer<typeof discountSchema>;

/**
 * Line item schema with UI-only is_gross_price flag.
 *
 * The `is_gross_price` field is UI-only - when true, the `price` field
 * contains the gross (tax-inclusive) price and should be sent as `gross_price`
 * to the API instead of `price`.
 */
export const lineItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  price: z.number().optional(),
  gross_price: z.number().optional(),
  quantity: z.number(),
  unit: z.string().nullish(),
  taxes: z.array(taxSchema).optional(),
  discounts: z.array(discountSchema).max(5).optional(),
  metadata: z.unknown().optional(),
  /** UI-only: when true, price field contains gross (tax-inclusive) price */
  is_gross_price: z.boolean().optional().default(false),
});

export type LineItemFormData = z.infer<typeof lineItemSchema>;

/**
 * Transform line items for API submission.
 * Converts is_gross_price flag to proper price/gross_price fields.
 */
export function transformItemsForApi<T extends LineItemFormData>(items: T[]) {
  return items.map(({ is_gross_price, price, ...item }) => ({
    ...item,
    ...(is_gross_price ? { gross_price: price } : { price }),
  }));
}
