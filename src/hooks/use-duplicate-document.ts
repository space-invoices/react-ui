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
import { buildCustomCreateTemplateFromDocument } from "@/ui/components/documents/create/custom-create-template";
import { totalsDifferByCents } from "@/ui/components/documents/create/preserved-expected-total";
import { useEntities } from "@/ui/providers/entities-context";
import { advanceInvoices } from "../../../js-sdk/src/sdk/advance-invoices";
import { creditNotes } from "../../../js-sdk/src/sdk/credit-notes";
import { deliveryNotes } from "../../../js-sdk/src/sdk/delivery-notes";
import { documents } from "../../../js-sdk/src/sdk/documents";
import { estimates } from "../../../js-sdk/src/sdk/estimates";
import { invoices } from "../../../js-sdk/src/sdk/invoices";

const DUPLICATE_TIMING_EVENT = "si:duplicate-timing";

function emitDuplicateDebug(detail: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DUPLICATE_TIMING_EVENT, { detail }));
}

export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
type CreateRequest =
  | CreateInvoiceRequest
  | CreateEstimateRequest
  | CreateCreditNoteRequest
  | CreateAdvanceInvoiceRequest
  | CreateDeliveryNoteRequest;

function shouldCheckForPreservedTotal(document: any): boolean {
  return document?.creation_source === "custom" || Math.abs(document?.rounding_correction ?? 0) > 0;
}

function buildCalculatePayload(values: Partial<CreateRequest>) {
  return {
    items: values.items,
    customer_id: (values as any).customer_id,
    customer: (values as any).customer,
    currency_code: (values as any).currency_code,
    date: (values as any).date,
    calculation_mode: (values as any).calculation_mode,
  };
}

/**
 * Get document type from ID prefix
 */
export function getDocumentTypeFromId(id: string): DocumentType | null {
  if (id.startsWith("inv_")) return "invoice";
  if (id.startsWith("est_")) return "estimate";
  if (id.startsWith("cre_") || id.startsWith("cn_")) return "credit_note";
  if (id.startsWith("adv_")) return "advance_invoice";
  if (id.startsWith("del_")) return "delivery_note";
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
      return ["delivery_note", "invoice"];
    default:
      return [];
  }
}

/**
 * Transform a source document into form-compatible initial values
 * Copies relevant fields and resets computed/generated ones
 */
function transformDocumentForDuplication(source: Document, targetType: DocumentType): Partial<CreateRequest> {
  // Transform items - preserve the full editable item shape so duplicate flows
  // stay in parity with the originating document forms.
  const sourceItems = source.items as Array<{
    type?: string | null;
    item_id?: string | null;
    name: string;
    description: string | null;
    quantity?: number | null;
    price?: number | null;
    gross_price?: number | null;
    unit?: string | null;
    classification?: string | null;
    taxes: Array<{ tax_id?: string }>;
    discounts?: Array<{ value: number; type?: string | null }>;
  }>;
  const items = sourceItems?.map((item) => ({
    type: item.type ?? undefined,
    name: item.name,
    description: item.description,
    // Separator items skip financial fields
    ...(item.type !== "separator"
      ? {
          item_id: item.item_id ?? undefined,
          quantity: item.quantity ?? 1,
          unit: item.unit ?? undefined,
          classification: item.classification ?? undefined,
          // Use a single effective form price field while preserving the original
          // gross-price mode for hydration.
          price: item.gross_price ?? item.price ?? undefined,
          // Copy tax references (tax_id), not computed tax data
          taxes: item.taxes?.map((tax) => ({ tax_id: tax.tax_id })),
          // Derive is_gross_price from whether gross_price is set
          gross_price: item.gross_price ?? undefined,
          discounts:
            item.discounts?.map((discount) => ({
              value: discount.value,
              type: discount.type ?? undefined,
            })) ?? [],
        }
      : {}),
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

  // When converting to a different type, link back to the source document
  const sourceType = getDocumentTypeFromId(source.id);
  const isConversion = sourceType && sourceType !== targetType;

  // Build base duplicate data
  const baseData: Partial<CreateRequest> = {
    // Customer - always pass both customer_id AND customer data when available
    // The form needs customer data for display, even when customer_id is set
    ...(source.customer_id ? { customer_id: source.customer_id } : {}),
    ...(customerData ? { customer: customerData } : {}),
    // Items (cast needed: separator items omit financial fields like quantity)
    items: items as any,
    // Currency
    currency_code: source.currency_code,
    calculation_mode: (source as any).calculation_mode ?? undefined,
    // Notes
    note: source.note,
    payment_terms: source.payment_terms,
    reference: (source as any).reference,
    signature: (source as any).signature,
    tax_clause: (source as any).tax_clause,
    footer: (source as any).footer,
    // Date - use today's date as ISO string
    date: new Date().toISOString(),
    // Number - leave empty for auto-generation
    // Do NOT copy: number, totals, taxes, payments, furs, eslog, vies, shareable_id
    // Link back to source document when converting (e.g., delivery note → invoice)
    // Skip linking if source is a draft (drafts have no number/fiscalization)
    ...(isConversion && !(source as any).is_draft ? { linked_documents: [source.id] } : {}),
  };
  // Copy service dates when source is an invoice (available on invoices and credit notes)
  if (sourceType === "invoice" || sourceType === "credit_note") {
    const sourceDoc = source as any;
    if (sourceDoc.date_service) {
      (baseData as any).date_service = sourceDoc.date_service;
    }
    if (sourceDoc.date_service_to) {
      (baseData as any).date_service_to = sourceDoc.date_service_to;
    }
  }

  if (sourceType === "estimate") {
    const sourceDoc = source as Estimate & { title_type?: "estimate" | "quote" | null };
    if (sourceDoc.title_type) {
      (baseData as CreateEstimateRequest).title_type = sourceDoc.title_type;
    }
  }

  if (sourceType === "delivery_note") {
    const sourceDoc = source as DeliveryNote & { hide_prices?: boolean | null };
    if (sourceDoc.hide_prices !== undefined && sourceDoc.hide_prices !== null) {
      (baseData as CreateDeliveryNoteRequest).hide_prices = sourceDoc.hide_prices;
    }
  }

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

export type LinkedDocumentSummary = {
  id: string;
  type: string;
  number: string;
  date: string;
  total_with_tax: number;
  currency_code: string;
};

export type UseDuplicateDocumentResult = {
  /** Transformed initial values for the form */
  initialValues: Partial<CreateRequest> | undefined;
  /** Source documents linked to this document (populated for conversions) */
  sourceDocuments: LinkedDocumentSummary[];
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
  const { activeEntity } = useEntities();

  const sourceType = sourceId ? getDocumentTypeFromId(sourceId) : null;

  const query = useQuery({
    queryKey: ["duplicate-document", sourceId, targetType, activeEntity?.id],
    queryFn: async () => {
      if (!sourceId || !activeEntity?.id || !sourceType) {
        throw new Error("Source document ID and entity ID are required");
      }

      const startedAt = performance.now();
      emitDuplicateDebug({
        stage: "request_started",
        sourceId,
        sourceType,
        targetType,
      });
      // Fetch source document based on its type
      let source: Document;
      if (sourceType === "invoice") {
        source = await invoices.get(sourceId, undefined, { entity_id: activeEntity.id });
      } else if (sourceType === "estimate") {
        source = await estimates.get(sourceId, undefined, { entity_id: activeEntity.id });
      } else if (sourceType === "advance_invoice") {
        source = await advanceInvoices.get(sourceId, undefined, { entity_id: activeEntity.id });
      } else if (sourceType === "delivery_note") {
        source = await deliveryNotes.get(sourceId, undefined, { entity_id: activeEntity.id });
      } else {
        // Credit note
        source = await creditNotes.get(sourceId, undefined, { entity_id: activeEntity.id });
      }

      if (!source) {
        throw new Error("Source document not found");
      }

      const initialValues = transformDocumentForDuplication(source, targetType);
      if ((source as any).creation_source === "custom") {
        (initialValues as any)._custom_create_template = buildCustomCreateTemplateFromDocument(source);
      }
      if (shouldCheckForPreservedTotal(source)) {
        const calculated = await documents.calculateDocumentPreview(
          buildCalculatePayload(initialValues),
          { type: targetType },
          { entity_id: activeEntity.id },
        );
        if (totalsDifferByCents(calculated.total_with_tax, (source as any).total_with_tax)) {
          (initialValues as any)._preserved_expected_total_with_tax = (source as any).total_with_tax;
        }
      }

      // Build source document summaries for conversions (different source → target type)
      const isConversion = sourceType !== targetType;
      const sourceDocuments: LinkedDocumentSummary[] =
        isConversion && !(source as any).is_draft
          ? [
              {
                id: source.id,
                type: sourceType,
                number: (source as any).number || "",
                date: (source as any).date || "",
                total_with_tax: (source as any).total_with_tax ?? 0,
                currency_code: (source as any).currency_code || "",
              },
            ]
          : [];

      emitDuplicateDebug({
        stage: "request_succeeded",
        sourceId,
        sourceType,
        targetType,
        elapsedMs: Number((performance.now() - startedAt).toFixed(1)),
      });

      return { initialValues, sourceDocuments };
    },
    enabled: enabled && !!sourceId && !!activeEntity?.id && !!sourceType,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    initialValues: query.data?.initialValues,
    sourceDocuments: query.data?.sourceDocuments ?? [],
    isLoading: query.isLoading,
    error: query.error,
    sourceType,
  };
}
