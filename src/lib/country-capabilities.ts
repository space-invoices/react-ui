import type {
  AdvanceInvoice,
  CountryCapabilities,
  CreditNote,
  DeliveryNote,
  Estimate,
  Invoice,
} from "@spaceinvoices/js-sdk";

import type { PdfTemplateId } from "@/ui/components/documents/create/live-preview";
import { countryCapabilityDefaults } from "@/ui/generated/schemas/country-capability-defaults";
import type { Entity } from "@/ui/providers/entities-context";

export const PORTUGAL_COUNTRY_CODE = "PT";
export const ITALY_COUNTRY_CODE = "IT";
export const FRANCE_COUNTRY_CODE = "FR";
export const PORTUGAL_PDF_LOCALE = "pt-PT";
export const PORTUGAL_CANONICAL_PDF_TEMPLATE: PdfTemplateId = "classic";
export type CountryAwareDocument = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
export type CountryAwareDocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

/** Every outgoing document type any country supports, from the generated country-rules table. */
export const OUTGOING_DOCUMENT_TYPES: readonly string[] = countryCapabilityDefaults.defaults.document_types;

type CountryEntity = Pick<Entity, "country_code" | "settings" | "country_rules"> | null | undefined;

/**
 * Server-owned country availability, as returned on `entity.country_rules.capabilities`.
 * The server is the only authority: plans, white-label configuration and user roles may
 * narrow these further, but nothing in the UI may widen them.
 */
export type CountryCapabilitySnapshot = CountryCapabilities;

/** The boolean operations of a capability snapshot (everything except `document_types`). */
export type CountryOperation = keyof Omit<CountryCapabilitySnapshot, "document_types">;

/**
 * Fallback for a payload that predates the capability snapshot. `capabilities` is optional
 * only for version compatibility; it is never a signal that an operation is allowed. The
 * country policy comes from the generated country-rules table, so the API stays the single
 * owner of it.
 */
function getDefaultCapabilities(entity: CountryEntity): CountryCapabilitySnapshot {
  const countryCode = entity?.country_code?.trim().toUpperCase();
  const overrides = countryCapabilityDefaults.overrides as Record<string, CountryCapabilitySnapshot | undefined>;
  const override = countryCode ? overrides[countryCode] : undefined;
  const base = (override ?? countryCapabilityDefaults.defaults) as CountryCapabilitySnapshot;

  return {
    ...base,
    document_types: [...base.document_types],
    // The generated table carries no per-country e-invoicing availability, so a country
    // without an override keeps deriving it from country_rules.features.
    ...(override ? {} : { e_invoicing: hasCountryFeature(entity, "e_invoicing") }),
  };
}

/**
 * Resolve the country capability snapshot for an entity, filling in per key so a partial
 * payload (an older API version that only sends some keys) still gets the conservative
 * fallback for the keys it omits instead of dropping to "everything allowed".
 */
export function getCountryCapabilitySnapshot(entity: CountryEntity): CountryCapabilitySnapshot {
  const fallback = getDefaultCapabilities(entity);
  const snapshot = entity?.country_rules?.capabilities as Partial<CountryCapabilitySnapshot> | undefined;
  if (!snapshot) {
    return fallback;
  }

  const resolved = { ...fallback };
  for (const key of Object.keys(fallback) as (keyof CountryCapabilitySnapshot)[]) {
    const value = snapshot[key];
    if (key === "document_types") {
      if (Array.isArray(value)) resolved.document_types = [...(value as string[])];
      continue;
    }
    if (typeof value === "boolean") {
      resolved[key as CountryOperation] = value;
    }
  }
  return resolved;
}

/** Whether the entity's country supports a given product operation. */
export function hasCountryCapability(entity: CountryEntity, operation: CountryOperation): boolean {
  return getCountryCapabilitySnapshot(entity)[operation] === true;
}

/** The outgoing document types the entity's country supports for issuance. */
export function getSupportedCountryDocumentTypes(entity: CountryEntity): string[] {
  return getCountryCapabilitySnapshot(entity).document_types;
}

/**
 * True when the country supports fewer outgoing document types than this UI can create.
 * Countries with the full set keep today's behaviour, including for unrecognised route
 * params, so nothing changes for the ordinary non-restricted consumers.
 */
export function hasRestrictedCountryDocumentTypes(entity: CountryEntity): boolean {
  const supported = getSupportedCountryDocumentTypes(entity);
  return OUTGOING_DOCUMENT_TYPES.some((documentType) => !supported.includes(documentType));
}

/**
 * Whether a document type may be created for this entity's country. In a country with a
 * restricted list an unrecognised type counts as unsupported, so an unknown creation target
 * is never offered there.
 */
export function isCountryDocumentTypeSupported(
  entity: CountryEntity,
  documentType: string | null | undefined,
): boolean {
  if (!hasRestrictedCountryDocumentTypes(entity)) {
    return true;
  }
  return !!documentType && getSupportedCountryDocumentTypes(entity).includes(documentType);
}

/**
 * The API stores `country_code` as the client sent it, with no case normalization, so
 * a strict comparison would silently treat a "pt" entity as non-Portuguese and drop it
 * out of every country-gated behaviour below.
 */
function isEntityInCountry(entity: CountryEntity, countryCode: string): boolean {
  return entity?.country_code?.trim().toUpperCase() === countryCode;
}

export function isPortugalEntity(entity: CountryEntity): boolean {
  return isEntityInCountry(entity, PORTUGAL_COUNTRY_CODE);
}

export function isItalyEntity(entity: CountryEntity): boolean {
  return isEntityInCountry(entity, ITALY_COUNTRY_CODE);
}

export function isFranceEntity(entity: CountryEntity): boolean {
  return isEntityInCountry(entity, FRANCE_COUNTRY_CODE);
}

function hasCountryFeature(entity: CountryEntity, feature: string): boolean {
  return !!entity?.country_rules?.features?.includes(feature as any);
}

export function hasItalyFatturaPaSupport(entity: CountryEntity): boolean {
  return isItalyEntity(entity) && hasCountryCapability(entity, "e_invoicing");
}

export function hasUsTaxRateLookupSupport(entity: CountryEntity): boolean {
  return hasCountryFeature(entity, "us_tax_rate_lookup");
}

function hasUpnQrSupport(entity: CountryEntity): boolean {
  return isEntityInCountry(entity, "SI") && hasCountryFeature(entity, "upn_qr");
}

function hasHub3QrSupport(entity: CountryEntity): boolean {
  return isEntityInCountry(entity, "HR") && hasCountryFeature(entity, "hub3_qr");
}

function hasEpcQrSupport(entity: CountryEntity): boolean {
  return hasCountryFeature(entity, "epc_qr");
}

function isGermanStandardEnabled(entity: CountryEntity, standard: "xrechnung" | "zugferd"): boolean {
  const settings = (entity?.settings as Record<string, any> | undefined) ?? {};
  return settings[standard]?.enabled === true;
}

function isGermanStandardValidationRequired(entity: CountryEntity, standard: "xrechnung" | "zugferd"): boolean {
  return isGermanStandardEnabled(entity, standard);
}

export function hasPeppolSendingSupport(entity: CountryEntity): boolean {
  return hasCountryCapability(entity, "e_invoicing");
}

export function isPeppolSendingEnabled(entity: CountryEntity): boolean {
  const settings = (entity?.settings as Record<string, any> | undefined) ?? {};
  return hasPeppolSendingSupport(entity) && settings.e_invoicing?.enabled === true;
}

export function isPeppolAutoSendingEnabled(entity: CountryEntity): boolean {
  const settings = (entity?.settings as Record<string, any> | undefined) ?? {};
  return (
    isPeppolSendingEnabled(entity) &&
    (settings.e_invoicing?.auto_send === true || isFranceEmissionRequiredForUi(entity))
  );
}

export function isFranceEmissionRequiredForUi(entity: CountryEntity, now = new Date()): boolean {
  if (!isFranceEntity(entity)) return false;
  const settings = (entity?.settings as Record<string, any> | undefined) ?? {};
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((parts, part) => {
      parts[part.type] = part.value;
      return parts;
    }, {});
  const dateInFrance = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  return settings.e_invoicing?.france_2026_emission_applicable === true || dateInFrance >= "2027-09-01";
}

export function resolveDocumentPdfTemplate(entity: CountryEntity): PdfTemplateId {
  if (isPortugalEntity(entity) && !hasCountryCapability(entity, "pdf_templates")) {
    return PORTUGAL_CANONICAL_PDF_TEMPLATE;
  }

  const settings = (entity?.settings as Record<string, unknown> | undefined) ?? {};
  return (settings.pdf_template as PdfTemplateId) || "modern";
}

export function getPortugalEditBlockedReason(entity: CountryEntity): string | undefined {
  if (!isPortugalEntity(entity) || hasCountryCapability(entity, "issued_document_edit")) {
    return undefined;
  }

  return "Issued Portugal documents cannot be edited. Void the document instead.";
}

export function getEntityCountryCapabilities(entity: CountryEntity) {
  const capabilities = getCountryCapabilitySnapshot(entity);
  const isPortugal = isPortugalEntity(entity);
  const isSlovenia = isEntityInCountry(entity, "SI");
  const isItaly = isItalyEntity(entity);
  const isFrance = isFranceEntity(entity);
  const hasItalyFatturaPa = hasItalyFatturaPaSupport(entity);
  const isGermany = isEntityInCountry(entity, "DE");
  const hasEInvoicing = capabilities.e_invoicing === true;
  const hasFurs = hasCountryFeature(entity, "furs");
  const hasFina = hasCountryFeature(entity, "fina");
  const hasEslog = hasCountryFeature(entity, "eslog");
  const hasSiArticle76a = isSlovenia && hasCountryFeature(entity, "si_article_76a");
  const hasEuTaxRules = hasCountryFeature(entity, "eu_tax_rules");
  const hasTaxClauseDefaults = hasCountryFeature(entity, "tax_clause_defaults");
  const hasUsTaxRateLookup = hasUsTaxRateLookupSupport(entity);
  const hasLayeredTaxRates = ((entity?.country_rules as any)?.max_taxes_per_item ?? 1) > 1;
  const showUpnQrSettings = hasUpnQrSupport(entity);
  const showHub3QrSettings = hasHub3QrSupport(entity);
  const showEpcQrSettings = hasEpcQrSupport(entity);
  const xrechnungEnabled = isGermany && hasEInvoicing && isGermanStandardEnabled(entity, "xrechnung");
  const zugferdEnabled = isGermany && hasEInvoicing && isGermanStandardEnabled(entity, "zugferd");
  const germanEInvoicingEnabled = xrechnungEnabled || zugferdEnabled;
  const peppolSendingEnabled = isPeppolSendingEnabled(entity);
  const peppolAutoSendingEnabled = isPeppolAutoSendingEnabled(entity);
  const franceEmissionRequired = isFranceEmissionRequiredForUi(entity);

  return {
    isPortugal,
    isSlovenia,
    isItaly,
    isFrance,
    isGermany,
    hasFurs,
    hasFina,
    hasEslog,
    hasSiArticle76a,
    hasEInvoicing,
    hasEuTaxRules,
    hasTaxClauseDefaults,
    hasUsTaxRateLookup,
    hasLayeredTaxRates,
    hasItalyFatturaPa,
    requiresItalyFatturaPaValidation: hasItalyFatturaPa,
    usesFixedPdfTemplate: !capabilities.pdf_templates,
    showPtSaftExport: isPortugal,
    showSloveniaVodExport: isSlovenia,
    showPeppolSendingSettings: hasPeppolSendingSupport(entity),
    showPeppolSendingControls: peppolSendingEnabled,
    showPeppolAutoSendControls: peppolAutoSendingEnabled,
    peppolSendingEnabled,
    peppolAutoSendingEnabled,
    franceEmissionRequired,
    showGermanEInvoicingExports: germanEInvoicingEnabled,
    showXRechnungExport: xrechnungEnabled,
    showZugferdExport: zugferdEnabled,
    requiresGermanEInvoicingValidation:
      (isGermany && hasEInvoicing && isGermanStandardValidationRequired(entity, "xrechnung")) ||
      (isGermany && hasEInvoicing && isGermanStandardValidationRequired(entity, "zugferd")),
    requiresXRechnungValidation: isGermany && hasEInvoicing && isGermanStandardValidationRequired(entity, "xrechnung"),
    requiresZugferdValidation: isGermany && hasEInvoicing && isGermanStandardValidationRequired(entity, "zugferd"),
    showPtAtcudSettings: isPortugal,
    showUpnQrSettings,
    showHub3QrSettings,
    showEpcQrSettings,
    countryCapabilities: capabilities,
    supportedDocumentTypes: capabilities.document_types,
    allowTemplateSettings: capabilities.pdf_templates,
    allowEmailSettings: capabilities.document_email,
    showTemplatesSettings: capabilities.pdf_templates,
    showEmailSettings: capabilities.document_email,
    allowPdfTemplateSelection: capabilities.pdf_templates,
    allowPdfLanguageSelection: capabilities.pdf_languages,
    allowDocumentDrafts: capabilities.document_drafts,
    allowCustomDocumentCreate: capabilities.custom_document_create,
    allowManualDocumentRecovery: capabilities.manual_document_recovery,
    allowRecurringInvoices: capabilities.recurring_invoices,
    allowIssuedDocumentEdit: capabilities.issued_document_edit,
    allowCreditNotePayments: capabilities.credit_note_payments,
    allowOrderReissue: capabilities.order_reissue,
    allowSavedItemFullEdit: !isPortugal,
    resolvedPdfTemplate: resolveDocumentPdfTemplate(entity),
    forcePdfLocale: isPortugal && !capabilities.pdf_languages ? PORTUGAL_PDF_LOCALE : undefined,
  };
}

export function getDocumentCountryCapabilities(
  entity: CountryEntity,
  documentType: CountryAwareDocumentType,
  document?: Partial<CountryAwareDocument> | null,
) {
  const entityCapabilities = getEntityCountryCapabilities(entity);
  const isDraft = document?.is_draft === true;
  const xrechnungValid = (document as any)?.xrechnung?.validation_status === "valid";
  const zugferdValid = (document as any)?.zugferd?.validation_status === "valid";
  const xrechnungValidationBlocksDownload = entityCapabilities.requiresXRechnungValidation && !xrechnungValid;
  const zugferdValidationBlocksDownload = entityCapabilities.requiresZugferdValidation && !zugferdValid;
  const germanEInvoicingValidationBlocksDownload = xrechnungValidationBlocksDownload || zugferdValidationBlocksDownload;
  const supportsGermanEInvoicingExport =
    !isDraft &&
    (documentType === "invoice" || documentType === "credit_note") &&
    entityCapabilities.showGermanEInvoicingExports;

  const supportsPayments =
    documentType === "invoice" || documentType === "advance_invoice" || documentType === "credit_note";
  const allowPaymentAction =
    supportsPayments && (documentType !== "credit_note" || entityCapabilities.allowCreditNotePayments);

  return {
    ...entityCapabilities,
    allowEmailSend: entityCapabilities.allowEmailSettings,
    allowSendEmail: entityCapabilities.allowEmailSettings,
    allowEditIssuedDocument: entityCapabilities.allowIssuedDocumentEdit || isDraft,
    allowEditDocument: entityCapabilities.allowIssuedDocumentEdit || isDraft,
    allowCreateDocumentType: isCountryDocumentTypeSupported(entity, documentType),
    allowPaymentAction,
    allowPaymentActions: allowPaymentAction,
    forceDocumentPdfLocale: entityCapabilities.forcePdfLocale,
    showXRechnungExport: supportsGermanEInvoicingExport && entityCapabilities.showXRechnungExport,
    showZugferdExport: supportsGermanEInvoicingExport && entityCapabilities.showZugferdExport,
    germanEInvoicingValidationBlocksDownload,
    xrechnungValidationBlocksDownload,
    zugferdValidationBlocksDownload,
    isDraft,
  };
}

export const getCountryUiCapabilities = getEntityCountryCapabilities;
export const getDocumentUiCapabilities = getDocumentCountryCapabilities;
