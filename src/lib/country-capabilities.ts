import type { AdvanceInvoice, CreditNote, DeliveryNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";

import type { PdfTemplateId } from "@/ui/components/documents/create/live-preview";
import type { Entity } from "@/ui/providers/entities-context";

export const PORTUGAL_COUNTRY_CODE = "PT";
export const PORTUGAL_PDF_LOCALE = "pt-PT";
export const PORTUGAL_CANONICAL_PDF_TEMPLATE: PdfTemplateId = "classic";
const ACTIVE_ACCOUNT_COOKIE = "l.account";
const SUPPORT_ACCOUNT_ID = import.meta.env.VITE_SUPPORT_ACCOUNT_ID || "acc_000000000000000000000001";

export type CountryAwareDocument = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
export type CountryAwareDocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

type CountryEntity = Pick<Entity, "country_code" | "settings"> | null | undefined;

export function isPortugalEntity(entity: CountryEntity): boolean {
  return entity?.country_code === PORTUGAL_COUNTRY_CODE;
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
  const isSlovenia = entity?.country_code === "SI";

  return {
    isPortugal,
    isSlovenia,
    usesFixedPdfTemplate: isPortugal,
    showPtSaftExport: isPortugal,
    showSloveniaVodExport: isSlovenia,
    showPtAtcudSettings: isPortugal,
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
    isDraft,
  };
}

export const getCountryUiCapabilities = getEntityCountryCapabilities;
export const getDocumentUiCapabilities = getDocumentCountryCapabilities;
