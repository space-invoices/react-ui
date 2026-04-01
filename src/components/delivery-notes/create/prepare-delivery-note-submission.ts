import type { CreateDeliveryNoteRequest } from "@spaceinvoices/js-sdk";
import type { CreateDeliveryNoteSchema } from "@/ui/generated/schemas";
import {
  buildDocumentBasePayload,
  cleanupEmptyCustomerId,
  prepareDocumentCustomerData,
  prepareDocumentItems,
  prepareDocumentSubmission,
} from "../../documents/create/prepare-document-submission";
import type { CustomerData } from "../../documents/create/use-document-customer-form";

/** Map of item index to gross price mode */
type PriceModesMap = Record<number, boolean>;

type PrepareOptions = {
  originalCustomer: CustomerData | null;
  /** Map of item index to gross price mode (collected from component state) */
  priceModes?: PriceModesMap;
  /** Whether to save as draft (skips numbering) */
  isDraft?: boolean;
  /** Whether to hide prices on the delivery note */
  hidePrices?: boolean;
};

/**
 * Prepares delivery note form data for API submission
 * Handles customer data transformation (no payment data for delivery notes)
 */
export function prepareDeliveryNoteSubmission(
  values: CreateDeliveryNoteSchema,
  options: PrepareOptions,
): CreateDeliveryNoteRequest {
  const baseSubmission = prepareDocumentSubmission(values, {
    originalCustomer: options.originalCustomer,
    documentType: "delivery_note",
    priceModes: options.priceModes,
    isDraft: options.isDraft,
  }) as CreateDeliveryNoteRequest;

  return {
    ...baseSubmission,
    ...(options.hidePrices !== undefined && { hide_prices: options.hidePrices }),
  };
}

export function prepareDeliveryNoteUpdateSubmission(
  values: CreateDeliveryNoteSchema,
  options: Pick<PrepareOptions, "originalCustomer" | "priceModes" | "hidePrices">,
): Record<string, unknown> {
  const nextValues: any = {
    ...values,
    customer: values.customer ? { ...values.customer } : values.customer,
    items: values.items
      ? values.items.map((item: any) => ({ ...item, taxes: item?.taxes ? [...item.taxes] : item?.taxes }))
      : values.items,
  };

  prepareDocumentCustomerData(nextValues, {
    originalCustomer: options.originalCustomer,
    wasCustomerFormShown: true,
  });
  cleanupEmptyCustomerId(nextValues);
  nextValues.items = prepareDocumentItems(nextValues.items, options.priceModes ?? {});

  return {
    ...buildDocumentBasePayload(nextValues, {
      documentType: "delivery_note",
    }),
    ...(options.hidePrices !== undefined ? { hide_prices: options.hidePrices } : {}),
  };
}
