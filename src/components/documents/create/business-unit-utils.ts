import type { DocumentTypes } from "../types";

export type BusinessUnitSettingsLike = {
  pdf_template?: "modern" | "classic" | "condensed" | "minimal" | "fashion" | null;
  primary_color?: string | null;
  logo_scale_percent?: number | null;
  email_defaults?: Record<string, string | null | undefined> | null;
  default_invoice_note?: string | null;
  default_invoice_payment_terms?: string | null;
  default_estimate_note?: string | null;
  default_estimate_payment_terms?: string | null;
  default_credit_note_note?: string | null;
  default_credit_note_payment_terms?: string | null;
  default_advance_invoice_note?: string | null;
  default_delivery_note_note?: string | null;
  document_footer?: string | null;
  default_document_signature?: string | null;
  bank_accounts?: Array<Record<string, unknown>> | null;
  delivery_note_hide_prices?: boolean | null;
  credit_note_negative_values?: boolean | null;
  show_payment_amounts?: boolean | null;
  tax_clause_defaults?: Record<string, string | null | undefined> | null;
};

export type BusinessUnitOption = {
  id: string;
  name: string;
  is_active?: boolean | null;
  deleted_at?: string | null;
  settings?: BusinessUnitSettingsLike | null;
};

export function isBusinessUnitArchived(unit: BusinessUnitOption | null | undefined) {
  return !!unit?.deleted_at || unit?.is_active === false;
}

export function getBusinessUnitById(
  businessUnits: BusinessUnitOption[] | null | undefined,
  businessUnitId: string | null | undefined,
) {
  if (!businessUnitId) return null;
  return businessUnits?.find((unit) => unit.id === businessUnitId) ?? null;
}

export function getVisibleBusinessUnitOptions(
  businessUnits: BusinessUnitOption[] | null | undefined,
  currentBusinessUnitId?: string | null,
) {
  const units = businessUnits ?? [];
  const activeUnits = units.filter((unit) => !isBusinessUnitArchived(unit));

  if (!currentBusinessUnitId) {
    return activeUnits;
  }

  const currentUnit = getBusinessUnitById(units, currentBusinessUnitId);
  if (!currentUnit || !isBusinessUnitArchived(currentUnit)) {
    return activeUnits;
  }

  return [...activeUnits, currentUnit];
}

export function shouldShowBusinessUnitSelector(
  businessUnits: BusinessUnitOption[] | null | undefined,
  currentBusinessUnitId?: string | null,
) {
  return getVisibleBusinessUnitOptions(businessUnits, currentBusinessUnitId).length > 0;
}

export function mergeEntityAndBusinessUnitSettings<
  TEntitySettings extends BusinessUnitSettingsLike | Record<string, any> | null | undefined,
>(entitySettings: TEntitySettings, businessUnit?: BusinessUnitOption | null) {
  const unitSettings = businessUnit?.settings ?? {};

  return {
    ...(entitySettings ?? {}),
    ...unitSettings,
    email_defaults: {
      ...((entitySettings as any)?.email_defaults ?? {}),
      ...(unitSettings.email_defaults ?? {}),
    },
    tax_clause_defaults: {
      ...((entitySettings as any)?.tax_clause_defaults ?? {}),
      ...(unitSettings.tax_clause_defaults ?? {}),
    },
    bank_accounts:
      unitSettings.bank_accounts && unitSettings.bank_accounts.length > 0
        ? unitSettings.bank_accounts
        : ((entitySettings as any)?.bank_accounts ?? []),
  };
}

export function getDocumentDefaultFields(
  documentType: DocumentTypes,
  settings: BusinessUnitSettingsLike | Record<string, any> | null | undefined,
) {
  switch (documentType) {
    case "invoice":
      return {
        note: settings?.default_invoice_note ?? "",
        payment_terms: settings?.default_invoice_payment_terms ?? "",
        footer: settings?.document_footer ?? "",
        signature: settings?.default_document_signature ?? "",
      };
    case "estimate":
      return {
        note: settings?.default_estimate_note ?? "",
        payment_terms: settings?.default_estimate_payment_terms ?? "",
        footer: settings?.document_footer ?? "",
        signature: settings?.default_document_signature ?? "",
      };
    case "credit_note":
      return {
        note: settings?.default_credit_note_note ?? "",
        payment_terms: settings?.default_credit_note_payment_terms ?? "",
        footer: settings?.document_footer ?? "",
        signature: settings?.default_document_signature ?? "",
      };
    case "advance_invoice":
      return {
        note: settings?.default_advance_invoice_note ?? "",
        payment_terms: settings?.default_invoice_payment_terms ?? "",
        footer: settings?.document_footer ?? "",
        signature: settings?.default_document_signature ?? "",
      };
    case "delivery_note":
      return {
        note: settings?.default_delivery_note_note ?? "",
        payment_terms: "",
        footer: settings?.document_footer ?? "",
        signature: settings?.default_document_signature ?? "",
      };
  }
}
