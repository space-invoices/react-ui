import type {
  AdvanceInvoice,
  CalculateDocumentPreview,
  CreateAdvanceInvoice,
  CreateCreditNote,
  CreateDeliveryNote,
  CreateEstimate,
  CreateInvoice,
  CreditNote,
  DeliveryNote,
  Estimate,
  Invoice,
} from "@spaceinvoices/js-sdk";
import {
  advanceInvoices,
  creditNotes,
  customers,
  deliveryNotes,
  documents,
  estimates,
  invoices,
} from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { canUseCustomerAsBuyer } from "@/ui/components/customers/customer-roles";
import { mergeEntityAndBusinessUnitSettings } from "@/ui/components/documents/create/business-unit-utils";
import { buildCustomCreateTemplateFromDocument } from "@/ui/components/documents/create/custom-create-template";
import { toDocumentFormItem } from "@/ui/components/documents/create/document-form-item";
import { totalsDifferByCents } from "@/ui/components/documents/create/preserved-expected-total";
import { toLocalDateOnlyString } from "@/ui/lib/date-only";
import { useEntities } from "@/ui/providers/entities-context";
import { resolveDuplicateDates, stripSourceTypeDefaultText } from "./duplicate-document-carry-over";

const DUPLICATE_TIMING_EVENT = "si:duplicate-timing";

function emitDuplicateDebug(detail: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DUPLICATE_TIMING_EVENT, { detail }));
}

export type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
type CreateRequest = CreateInvoice | CreateEstimate | CreateCreditNote | CreateAdvanceInvoice | CreateDeliveryNote;
type CreateRequestWithBusinessUnit = CreateRequest & {
  business_unit_id?: string | null;
  business_unit?: unknown | null;
  _duplicate_source_id?: string;
  _duplicate_target_type?: DocumentType;
};

function normalizeCustomTemplateItems(
  sourceItems: any[] | undefined,
  formItems: any[] | undefined,
  templateItems: any[] | undefined,
): any[] {
  return (templateItems ?? []).map((templateItem, index) => {
    const sourceItem = sourceItems?.[index];
    const formItem = formItems?.[index];
    const translations = formItem?.translations ?? sourceItem?.translations ?? undefined;

    if (templateItem?.type === "separator") {
      return {
        ...templateItem,
        translations,
      };
    }

    const usesGrossPrice = sourceItem?.gross_price !== null && sourceItem?.gross_price !== undefined;
    const effectivePrice = formItem?.price;

    return {
      ...templateItem,
      translations,
      price: usesGrossPrice ? undefined : effectivePrice,
      gross_price: usesGrossPrice ? effectivePrice : undefined,
    };
  });
}

function shouldCheckForPreservedTotal(document: any): boolean {
  return document?.creation_source === "custom" || Math.abs(document?.rounding_correction ?? 0) > 0;
}

function buildCalculatePayload(values: Partial<CreateRequestWithBusinessUnit>): CalculateDocumentPreview | null {
  if (!values.items?.length) {
    return null;
  }

  return {
    items: values.items,
    customer_id: (values as any).customer_id,
    customer: (values as any).customer,
    business_unit_id: values.business_unit_id,
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
 * Customer fields a document snapshot carries; also the fields refreshed from the live record.
 *
 * Includes the e-invoicing routing data (`peppol_scheme_id`, `e_invoicing` with its buyer
 * reference, `ujp`) and bank accounts: document create does not backfill an explicitly supplied
 * customer snapshot, so anything omitted here is dropped from the duplicated document and can
 * fail mandatory e-invoice validation.
 */
const CUSTOMER_SNAPSHOT_FIELDS = [
  "name",
  "email",
  "address",
  "address_2",
  "post_code",
  "city",
  "state",
  "country",
  "country_code",
  "tax_number",
  "tax_number_2",
  "company_number",
  "phone",
  "peppol_id",
  "peppol_scheme_id",
  "is_end_consumer",
  "bank_account",
  "bank_accounts",
  "e_invoicing",
  "ujp",
] as const;

export function pickCustomerSnapshotFields(customer: Record<string, any> | null | undefined) {
  if (!customer) return undefined;
  const picked: Record<string, unknown> = {};
  for (const field of CUSTOMER_SNAPSHOT_FIELDS) {
    picked[field] = customer[field];
  }
  return picked;
}

/**
 * Overlay the live customer record on the document's frozen snapshot.
 *
 * The new document should be issued to the customer's current details, but a field the live
 * record does not expose keeps the snapshot value so nothing is silently dropped.
 */
function mergeCustomerWithLiveRecord(
  snapshot: Record<string, unknown> | undefined,
  live: Record<string, any> | null | undefined,
) {
  if (!live) return snapshot;
  const merged: Record<string, unknown> = { ...(snapshot ?? {}) };
  for (const field of CUSTOMER_SNAPSHOT_FIELDS) {
    if (Object.hasOwn(live, field)) {
      merged[field] = live[field];
    }
  }
  return merged;
}

export type ResolvedDuplicateCustomer = {
  customer?: Record<string, unknown>;
  customerId?: string;
};

/**
 * Resolve which customer details a duplicate should start from.
 *
 * A linked customer is refreshed from the live record so re-issues do not carry an address or
 * tax number the customer has since changed.
 *
 * Re-issuing to an archived client should still reach that client. Document create rejects an
 * archived `customer_id` outright ("Customer <id> not found"), so an archived, removed, or
 * no-longer-buyer customer keeps the snapshot for display and drops the id, which is what lets
 * the document be created at all. Do not "fix" this by passing the id back through until the
 * API accepts archived customer ids.
 *
 * Whether the archived record is then re-attached is the API's decision, and it is only
 * guaranteed when the snapshot carries a tax or company number: create's customer matching keys
 * on those and does not filter archived rows. Without either identifier a new customer record is
 * created instead, and a supplier-only contact can still be matched despite being rejected here.
 * Closing that gap needs the API to accept (and restore) an archived customer id.
 *
 * Transient fetch failures keep the existing link and snapshot untouched.
 */
export async function resolveDuplicateCustomer(
  source: Record<string, any>,
  entityId: string,
): Promise<ResolvedDuplicateCustomer> {
  const snapshot = pickCustomerSnapshotFields(source.customer);
  const customerId = source.customer_id as string | undefined;

  if (!customerId) {
    return { customer: snapshot };
  }

  try {
    const response = await customers.list({ query: JSON.stringify({ id: customerId }), entity_id: entityId });
    const live = (response?.data?.[0] ?? null) as Record<string, any> | null;

    // The list excludes archived customers, so a missing row means archived or gone; both
    // cases drop the id and let document create re-attach the customer from the snapshot.
    if (!live || live.deleted_at || !canUseCustomerAsBuyer(live)) {
      return { customer: snapshot };
    }

    return { customerId, customer: mergeCustomerWithLiveRecord(snapshot, live) };
  } catch {
    // A transient lookup failure must not silently unlink the customer, so the document's own
    // snapshot is used. Submission then saves it like any other recipient, which can write
    // historical values back over the live customer - pre-existing behaviour for every
    // duplicate, tracked separately rather than papered over with a form-level marker that a
    // later recipient change would carry into unrelated submissions.
    return { customerId, customer: snapshot };
  }
}

/**
 * Transform a source document into form-compatible initial values
 * Copies relevant fields and resets computed/generated ones
 */
function transformDocumentForDuplication(
  source: Document,
  targetType: DocumentType,
  options: {
    customer?: ResolvedDuplicateCustomer;
    settings?: Record<string, any> | null;
  } = {},
): Partial<CreateRequestWithBusinessUnit> {
  const items = source.items?.map((item) => toDocumentFormItem(item as any));

  const resolvedCustomer = options.customer ?? {
    customer: pickCustomerSnapshotFields(source.customer as Record<string, any> | null | undefined),
    customerId: source.customer_id ?? undefined,
  };
  const customerData = resolvedCustomer.customer;

  // When converting to a different type, link back to the source document
  const sourceType = getDocumentTypeFromId(source.id);
  const isConversion = !!sourceType && sourceType !== targetType;

  const date = toLocalDateOnlyString(new Date());
  const carriedDates = resolveDuplicateDates({
    source: source as any,
    sourceType,
    targetType,
    newDate: date,
  });

  // Build base duplicate data
  const baseData: Partial<CreateRequestWithBusinessUnit> = {
    _duplicate_source_id: source.id,
    _duplicate_target_type: targetType,
    // Only the id: the unit snapshot is re-taken at create so it cannot go stale.
    business_unit_id: (source as any).business_unit_id ?? undefined,
    // Customer - always pass both customer_id AND customer data when available
    // The form needs customer data for display, even when customer_id is set
    ...(resolvedCustomer.customerId ? { customer_id: resolvedCustomer.customerId } : {}),
    ...(customerData ? { customer: customerData } : {}),
    // Items (cast needed: separator items omit financial fields like quantity)
    items: items as any,
    // Currency
    currency_code: source.currency_code,
    calculation_mode: (source as any).calculation_mode ?? undefined,
    // Notes
    note: source.note,
    payment_terms: source.payment_terms,
    // A reference is often an order/PO number for that one document, but it is just as often
    // a standing contract or cost centre. Carry it either way and leave removing it to the
    // user, who can see the field, rather than silently clearing something they would have
    // to retype from the source document.
    reference: (source as any).reference,
    signature: (source as any).signature,
    tax_clause: (source as any).tax_clause,
    footer: (source as any).footer,
    translations: (source as any).translations ?? undefined,
    date,
    ...carriedDates,
    // Number - leave empty for auto-generation
    // Do NOT copy: number, totals, taxes, payments, furs, eslog, vies, shareable_id
    // Link back to source document when converting (e.g., delivery note → invoice)
    // Skip linking if source is a draft (drafts have no number/fiscalization)
    ...(isConversion && !(source as any).is_draft ? { linked_documents: [source.id] } : {}),
  };

  // Type-specific presentation fields only apply when the target is that same type.
  if (sourceType === "estimate" && targetType === "estimate") {
    const sourceDoc = source as Estimate & { title_type?: "estimate" | "proforma_invoice" | null };
    if (sourceDoc.title_type) {
      (baseData as CreateEstimate).title_type = sourceDoc.title_type;
    }
  }

  if (sourceType === "delivery_note" && targetType === "delivery_note") {
    const sourceDoc = source as DeliveryNote & { hide_prices?: boolean | null };
    if (sourceDoc.hide_prices !== undefined && sourceDoc.hide_prices !== null) {
      (baseData as CreateDeliveryNote).hide_prices = sourceDoc.hide_prices;
    }
  }

  return stripSourceTypeDefaultText(baseData, {
    sourceType,
    targetType,
    settings: options.settings,
  });
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
  initialValues: Partial<CreateRequestWithBusinessUnit> | undefined;
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

      const customer = await resolveDuplicateCustomer(source as any, activeEntity.id);
      const settings = mergeEntityAndBusinessUnitSettings(
        (activeEntity as any)?.settings,
        (source as any).business_unit ?? null,
      );

      const initialValues = transformDocumentForDuplication(source, targetType, { customer, settings });
      if ((source as any).creation_source === "custom") {
        const customCreateTemplate = buildCustomCreateTemplateFromDocument(source);
        customCreateTemplate.items = normalizeCustomTemplateItems(
          source.items as any[] | undefined,
          initialValues.items as any[],
          customCreateTemplate.items,
        );
        (initialValues as any)._custom_create_template = customCreateTemplate;
      }
      if (shouldCheckForPreservedTotal(source)) {
        const calculatePayload = buildCalculatePayload(initialValues);
        if (calculatePayload) {
          try {
            const calculated = await documents.calculateDocumentPreview(
              calculatePayload,
              { type: targetType },
              { entity_id: activeEntity.id },
            );
            if (totalsDifferByCents(calculated.total_with_tax, (source as any).total_with_tax)) {
              (initialValues as any)._preserved_expected_total_with_tax = (source as any).total_with_tax;
            }
          } catch {
            // Keep duplicate prefill data even if preview validation is temporarily unavailable.
          }
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
