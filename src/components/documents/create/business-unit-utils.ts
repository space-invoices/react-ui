import type { LocalizedContentMap } from "@/ui/lib/document-content-translations";
import type { DocumentTypes } from "../types";

export type BusinessUnitSettingsTranslationsLike = {
  default_invoice_note?: LocalizedContentMap | null;
  default_invoice_payment_terms?: LocalizedContentMap | null;
  default_estimate_note?: LocalizedContentMap | null;
  default_estimate_payment_terms?: LocalizedContentMap | null;
  default_credit_note_note?: LocalizedContentMap | null;
  default_credit_note_payment_terms?: LocalizedContentMap | null;
  default_advance_invoice_note?: LocalizedContentMap | null;
  default_delivery_note_note?: LocalizedContentMap | null;
  document_footer?: LocalizedContentMap | null;
  default_document_signature?: LocalizedContentMap | null;
  tax_clause_defaults?: Record<string, LocalizedContentMap | null | undefined> | null;
};

export type BusinessUnitSettingsLike = {
  pdf_template?: "modern" | "classic" | "condensed" | "minimal" | "fashion" | null;
  primary_color?: string | null;
  logo_scale_percent?: number | null;
  email_defaults?: Record<string, string | null | undefined> | null;
  default_invoice_due_days?: number | null;
  default_estimate_valid_days?: number | null;
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
  translations?: BusinessUnitSettingsTranslationsLike | null;
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
  const mergeLocalizedValues = (base?: LocalizedContentMap | null, override?: LocalizedContentMap | null) => {
    if (!base && !override) return undefined;
    return {
      ...(base ?? {}),
      ...(override ?? {}),
    };
  };

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
    translations: {
      ...((entitySettings as any)?.translations ?? {}),
      ...(unitSettings.translations ?? {}),
      default_invoice_note: mergeLocalizedValues(
        (entitySettings as any)?.translations?.default_invoice_note,
        unitSettings.translations?.default_invoice_note,
      ),
      default_invoice_payment_terms: mergeLocalizedValues(
        (entitySettings as any)?.translations?.default_invoice_payment_terms,
        unitSettings.translations?.default_invoice_payment_terms,
      ),
      default_estimate_note: mergeLocalizedValues(
        (entitySettings as any)?.translations?.default_estimate_note,
        unitSettings.translations?.default_estimate_note,
      ),
      default_estimate_payment_terms: mergeLocalizedValues(
        (entitySettings as any)?.translations?.default_estimate_payment_terms,
        unitSettings.translations?.default_estimate_payment_terms,
      ),
      default_credit_note_note: mergeLocalizedValues(
        (entitySettings as any)?.translations?.default_credit_note_note,
        unitSettings.translations?.default_credit_note_note,
      ),
      default_credit_note_payment_terms: mergeLocalizedValues(
        (entitySettings as any)?.translations?.default_credit_note_payment_terms,
        unitSettings.translations?.default_credit_note_payment_terms,
      ),
      default_advance_invoice_note: mergeLocalizedValues(
        (entitySettings as any)?.translations?.default_advance_invoice_note,
        unitSettings.translations?.default_advance_invoice_note,
      ),
      default_delivery_note_note: mergeLocalizedValues(
        (entitySettings as any)?.translations?.default_delivery_note_note,
        unitSettings.translations?.default_delivery_note_note,
      ),
      document_footer: mergeLocalizedValues(
        (entitySettings as any)?.translations?.document_footer,
        unitSettings.translations?.document_footer,
      ),
      default_document_signature: mergeLocalizedValues(
        (entitySettings as any)?.translations?.default_document_signature,
        unitSettings.translations?.default_document_signature,
      ),
      tax_clause_defaults: {
        ...((entitySettings as any)?.translations?.tax_clause_defaults ?? {}),
        ...(unitSettings.translations?.tax_clause_defaults ?? {}),
        domestic: mergeLocalizedValues(
          (entitySettings as any)?.translations?.tax_clause_defaults?.domestic,
          unitSettings.translations?.tax_clause_defaults?.domestic,
        ),
        intra_eu_b2b: mergeLocalizedValues(
          (entitySettings as any)?.translations?.tax_clause_defaults?.intra_eu_b2b,
          unitSettings.translations?.tax_clause_defaults?.intra_eu_b2b,
        ),
        intra_eu_b2c: mergeLocalizedValues(
          (entitySettings as any)?.translations?.tax_clause_defaults?.intra_eu_b2c,
          unitSettings.translations?.tax_clause_defaults?.intra_eu_b2c,
        ),
        "3w_b2b": mergeLocalizedValues(
          (entitySettings as any)?.translations?.tax_clause_defaults?.["3w_b2b"],
          unitSettings.translations?.tax_clause_defaults?.["3w_b2b"],
        ),
        "3w_b2c": mergeLocalizedValues(
          (entitySettings as any)?.translations?.tax_clause_defaults?.["3w_b2c"],
          unitSettings.translations?.tax_clause_defaults?.["3w_b2c"],
        ),
        export: mergeLocalizedValues(
          (entitySettings as any)?.translations?.tax_clause_defaults?.export,
          unitSettings.translations?.tax_clause_defaults?.export,
        ),
      },
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
        translations: {
          note: settings?.translations?.default_invoice_note ?? {},
          payment_terms: settings?.translations?.default_invoice_payment_terms ?? {},
          footer: settings?.translations?.document_footer ?? {},
          signature: settings?.translations?.default_document_signature ?? {},
        },
      };
    case "estimate":
      return {
        note: settings?.default_estimate_note ?? "",
        payment_terms: settings?.default_estimate_payment_terms ?? "",
        footer: settings?.document_footer ?? "",
        signature: settings?.default_document_signature ?? "",
        translations: {
          note: settings?.translations?.default_estimate_note ?? {},
          payment_terms: settings?.translations?.default_estimate_payment_terms ?? {},
          footer: settings?.translations?.document_footer ?? {},
          signature: settings?.translations?.default_document_signature ?? {},
        },
      };
    case "credit_note":
      return {
        note: settings?.default_credit_note_note ?? "",
        payment_terms: settings?.default_credit_note_payment_terms ?? "",
        footer: settings?.document_footer ?? "",
        signature: settings?.default_document_signature ?? "",
        translations: {
          note: settings?.translations?.default_credit_note_note ?? {},
          payment_terms: settings?.translations?.default_credit_note_payment_terms ?? {},
          footer: settings?.translations?.document_footer ?? {},
          signature: settings?.translations?.default_document_signature ?? {},
        },
      };
    case "advance_invoice":
      return {
        note: settings?.default_advance_invoice_note ?? "",
        payment_terms: settings?.default_invoice_payment_terms ?? "",
        footer: settings?.document_footer ?? "",
        signature: settings?.default_document_signature ?? "",
        translations: {
          note:
            settings?.translations?.default_advance_invoice_note ?? settings?.translations?.default_invoice_note ?? {},
          payment_terms: {},
          footer: settings?.translations?.document_footer ?? {},
          signature: settings?.translations?.default_document_signature ?? {},
        },
      };
    case "delivery_note":
      return {
        note: settings?.default_delivery_note_note ?? "",
        payment_terms: "",
        footer: settings?.document_footer ?? "",
        signature: settings?.default_document_signature ?? "",
        translations: {
          note: settings?.translations?.default_delivery_note_note ?? {},
          payment_terms: {},
          footer: settings?.translations?.document_footer ?? {},
          signature: settings?.translations?.default_document_signature ?? {},
        },
      };
  }
}
