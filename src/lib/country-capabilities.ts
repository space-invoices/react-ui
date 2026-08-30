import type { AdvanceInvoice, CreditNote, DeliveryNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";

import type { PdfTemplateId } from "@/ui/components/documents/create/live-preview";
import type { Entity } from "@/ui/providers/entities-context";

export const PORTUGAL_COUNTRY_CODE = "PT";
export const ITALY_COUNTRY_CODE = "IT";
export const FRANCE_COUNTRY_CODE = "FR";
export const PORTUGAL_PDF_LOCALE = "pt-PT";
export const PORTUGAL_CANONICAL_PDF_TEMPLATE: PdfTemplateId = "classic";
const ACTIVE_ACCOUNT_COOKIE = "l.account";
const SUPPORT_ACCOUNT_ID = import.meta.env.VITE_SUPPORT_ACCOUNT_ID || "acc_000000000000000000000001";

export type CountryAwareDocument = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
export type CountryAwareDocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

type CountryEntity = Pick<Entity, "country_code" | "settings" | "country_rules"> | null | undefined;

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
  return isItalyEntity(entity) && hasCountryFeature(entity, "e_invoicing");
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
  return hasCountryFeature(entity, "e_invoicing");
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

function getCookieValue(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookiePrefix = `${name}=`;
  const rawCookie = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(cookiePrefix));

  if (!rawCookie) {
    return null;
  }
  return decodeURIComponent(rawCookie.slice(cookiePrefix.length));
}

export function hasPortugalUiAccess() {
  if (typeof document === "undefined") {
    return true;
  }

  const activeAccountId = getCookieValue(ACTIVE_ACCOUNT_COOKIE);
  return !!SUPPORT_ACCOUNT_ID && activeAccountId === SUPPORT_ACCOUNT_ID;
}

export function resolveDocumentPdfTemplate(entity: CountryEntity): PdfTemplateId {
  if (isPortugalEntity(entity) && hasPortugalUiAccess()) {
    return PORTUGAL_CANONICAL_PDF_TEMPLATE;
  }

  const settings = (entity?.settings as Record<string, unknown> | undefined) ?? {};
  return (settings.pdf_template as PdfTemplateId) || "modern";
}

export function getPortugalEditBlockedReason(entity: CountryEntity): string | undefined {
  if (!isPortugalEntity(entity) || !hasPortugalUiAccess()) {
    return undefined;
  }

  return "Issued Portugal documents cannot be edited. Void the document instead.";
}

export function getEntityCountryCapabilities(entity: CountryEntity) {
  const isPortugal = isPortugalEntity(entity) && hasPortugalUiAccess();
  const isSlovenia = isEntityInCountry(entity, "SI");
  const isItaly = isItalyEntity(entity);
  const isFrance = isFranceEntity(entity);
  const hasItalyFatturaPa = hasItalyFatturaPaSupport(entity);
  const isGermany = isEntityInCountry(entity, "DE");
  const hasEInvoicing = hasCountryFeature(entity, "e_invoicing");
  const hasFurs = hasCountryFeature(entity, "furs");
  const hasFina = hasCountryFeature(entity, "fina");
  const hasEslog = hasCountryFeature(entity, "eslog");
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
    hasEInvoicing,
    hasEuTaxRules,
    hasTaxClauseDefaults,
    hasUsTaxRateLookup,
    hasLayeredTaxRates,
    hasItalyFatturaPa,
    requiresItalyFatturaPaValidation: hasItalyFatturaPa,
    usesFixedPdfTemplate: isPortugal,
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
    allowTemplateSettings: !isPortugal,
    allowEmailSettings: !isPortugal,
    showTemplatesSettings: !isPortugal,
    showEmailSettings: !isPortugal,
    allowPdfTemplateSelection: !isPortugal,
    allowPdfLanguageSelection: !isPortugal,
    allowDocumentDrafts: !isPortugal,
    allowSavedItemFullEdit: !isPortugal,
    resolvedPdfTemplate: resolveDocumentPdfTemplate(entity),
    forcePdfLocale: isPortugal ? PORTUGAL_PDF_LOCALE : undefined,
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

  return {
    ...entityCapabilities,
    allowEmailSend: !entityCapabilities.isPortugal,
    allowSendEmail: !entityCapabilities.isPortugal,
    allowEditIssuedDocument: !entityCapabilities.isPortugal || isDraft,
    allowEditDocument: !entityCapabilities.isPortugal || isDraft,
    allowPaymentAction:
      (documentType === "invoice" || documentType === "advance_invoice" || documentType === "credit_note") &&
      !(entityCapabilities.isPortugal && documentType === "credit_note"),
    allowPaymentActions:
      (documentType === "invoice" || documentType === "advance_invoice" || documentType === "credit_note") &&
      !(entityCapabilities.isPortugal && documentType === "credit_note"),
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
