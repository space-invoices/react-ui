import type {
  AdvanceInvoice,
  CreateAdvanceInvoiceRequest,
  CreateCreditNoteRequest,
  CreateDeliveryNoteRequest,
  CreateEstimateRequest,
  CreateInvoiceRequest,
  CreditNote,
  DeliveryNote,
  Estimate,
  Invoice,
} from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";

import { useEntities } from "@/ui/providers/entities-context";
import { useSDK } from "@/ui/providers/sdk-provider";

export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
type CreateRequest =
  | CreateInvoiceRequest
  | CreateEstimateRequest
  | CreateCreditNoteRequest
  | CreateAdvanceInvoiceRequest
  | CreateDeliveryNoteRequest;

/**
 * Get document type from ID prefix
 */
export function getDocumentTypeFromId(id: string): DocumentType | null {
  if (id.startsWith("inv_")) return "invoice";
  if (id.startsWith("est_")) return "estimate";
  if (id.startsWith("cn_")) return "credit_note";
  if (id.startsWith("adv_")) return "advance_invoice";
  if (id.startsWith("dn_")) return "delivery_note";
  return null;
}

/**
 * Get allowed target types for duplication/conversion
 */
export function getAllowedDuplicateTargets(sourceType: DocumentType): DocumentType[] {
  switch (sourceType) {
    case "invoice":
      return ["invoice", "credit_note"];
    case "estimate":
      return ["estimate", "invoice"];
    case "credit_note":
      return ["credit_note"];
    case "advance_invoice":
      return ["advance_invoice", "invoice"];
    case "delivery_note":
      return ["delivery_note"];
    default:
      return [];
  }
}

/**
 * Transform a source document into form-compatible initial values
 * Copies relevant fields and resets computed/generated ones
 */
function transformDocumentForDuplication(source: Document, _targetType: DocumentType): Partial<CreateRequest> {
  // Transform items - copy only the fields needed for creation
  // Use type assertion for items since all document item types share the same shape
  const sourceItems = source.items as Array<{
    name: string;
    description: string | null;
    quantity: number;
    price: number;
    gross_price?: number | null;
    taxes: Array<{ tax_id?: string }>;
  }>;
  const items = sourceItems?.map((item) => ({
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    // Use gross_price if set, otherwise use price. The form uses is_gross_price as a UI toggle.
    price: item.gross_price ?? item.price,
    // Copy tax references (tax_id), not computed tax data
    taxes: item.taxes?.map((tax) => ({ tax_id: tax.tax_id })),
    // Derive is_gross_price from whether gross_price is set
    gross_price: item.gross_price ?? undefined,
  }));

  // Build customer data - always copy if available (form needs this for display)
  const customerData = source.customer
    ? {
        name: source.customer.name,
        address: source.customer.address,
        address_2: source.customer.address_2,
        city: source.customer.city,
        post_code: source.customer.post_code,
        country: source.customer.country,
        country_code: source.customer.country_code,
        tax_number: source.customer.tax_number,
        email: source.customer.email,
      }
    : undefined;

  // Build base duplicate data
  const baseData: Partial<CreateRequest> = {
    // Customer - always pass both customer_id AND customer data when available
    // The form needs customer data for display, even when customer_id is set
    ...(source.customer_id ? { customer_id: source.customer_id } : {}),
    ...(customerData ? { customer: customerData } : {}),
    // Items
    items,
    // Currency
    currency_code: source.currency_code,
    // Notes
    note: source.note,
    payment_terms: source.payment_terms,
    // Date - use today's date as ISO string
    date: new Date().toISOString(),
    // Number - leave empty for auto-generation
    // Do NOT copy: number, totals, taxes, payments, furs, eslog, vies, shareable_id
  };

  return baseData;
}

export type UseDuplicateDocumentOptions = {
  /** Source document ID to duplicate from */
  sourceId: string | undefined;
  /** Target document type (may differ from source for conversions) */
  targetType: DocumentType;
  /** Whether to enable the query */
  enabled?: boolean;
};

export type UseDuplicateDocumentResult = {
  /** Transformed initial values for the form */
  initialValues: Partial<CreateRequest> | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Source document type */
  sourceType: DocumentType | null;
};

/**
 * Hook to fetch and transform a document for duplication
 *
 * @example
 * ```tsx
 * const { initialValues, isLoading } = useDuplicateDocument({
 *   sourceId: searchParams.duplicateFrom,
 *   targetType: 'invoice',
 * });
 * ```
 */
export function useDuplicateDocument({
  sourceId,
  targetType,
  enabled = true,
}: UseDuplicateDocumentOptions): UseDuplicateDocumentResult {
  const { sdk } = useSDK();
  const { activeEntity } = useEntities();

  const sourceType = sourceId ? getDocumentTypeFromId(sourceId) : null;

  const query = useQuery({
    queryKey: ["duplicate-document", sourceId, targetType, activeEntity?.id],
    queryFn: async () => {
      if (!sourceId || !activeEntity?.id || !sourceType) {
        throw new Error("Source document ID and entity ID are required");
      }

      // Fetch source document based on its type
      let source: Document;
      if (sourceType === "invoice") {
        source = await sdk.invoices.get(sourceId, undefined, { entity_id: activeEntity.id });
      } else if (sourceType === "estimate") {
        source = await sdk.estimates.get(sourceId, undefined, { entity_id: activeEntity.id });
      } else if (sourceType === "advance_invoice") {
        source = await sdk.advanceInvoices.get(sourceId, undefined, { entity_id: activeEntity.id });
      } else if (sourceType === "delivery_note") {
        source = await sdk.deliveryNotes.get(sourceId, undefined, { entity_id: activeEntity.id });
      } else {
        // Credit note
        source = await sdk.creditNotes.get(sourceId, undefined, { entity_id: activeEntity.id });
      }

      if (!source) {
        throw new Error("Source document not found");
      }

      return transformDocumentForDuplication(source, targetType);
    },
    enabled: enabled && !!sourceId && !!activeEntity?.id && !!sourceType,
  });

  return {
    initialValues: query.data,
    isLoading: query.isLoading,
    error: query.error,
    sourceType,
  };
}
