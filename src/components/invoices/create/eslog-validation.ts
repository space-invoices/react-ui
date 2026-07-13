/**
 * Client-side e-SLOG 2.0 validation for invoice creation form
 *
 * Validates form data against e-SLOG requirements before submission.
 * Returns field-specific errors that can be displayed on form elements.
 */

import {
  isSupportedEInvoicingUnitCode,
  normalizeEInvoicingUnitCodeOverride,
  resolveEInvoicingUnitCode,
} from "@space-invoices/e-invoicing/unit-codes";
import type { FieldErrors, FieldValues } from "react-hook-form";
import type { Entity } from "@/ui/providers/entities-context";

const VALID_SI_TAX_RATES = [22, 9.5, 5, 0];
const DEFAULT_ESLOG_VALIDATION_OPTIONS = {
  requireIssuerBankAccount: true,
  requireBusinessRecipientTaxNumber: true,
  requireUjpRecipientRouting: false,
};
const UJP_BIC_8_PATTERN = /^[A-Z]{6}[A-Z2-9][A-NP-Z0-9]$/;
const UJP_BIC_PATTERN = /^[A-Z]{6}[A-Z2-9][A-NP-Z0-9][A-Z0-9]{3}$/;
const UJP_SI_IBAN_PATTERN = /^SI[0-9]{17}$/;

interface FormValues {
  number?: string;
  date?: string;
  currency_code?: string;
  calculation_mode?: "b2b_standard" | "b2c_gross_discount" | string | null;
  customer?: {
    name?: string;
    address?: string;
    post_code?: string;
    city?: string;
    country?: string;
    country_code?: string;
    tax_number?: string;
    company_number?: string | null;
    is_end_consumer?: boolean | null;
    bank_account?: {
      iban?: string | null;
      account_number?: string | null;
    } | null;
    bank_accounts?: Array<{
      iban?: string | null;
      bic?: string | null;
      account_number?: string | null;
    }> | null;
    ujp?: {
      receiver_identifier?: string | null;
      receiver_agent?: string | null;
      receiver_mailbox?: string | null;
    } | null;
  } | null;
  items?: Array<{
    type?: string | null;
    name?: string;
    quantity?: number;
    unit?: string | null;
    e_invoicing?: {
      unit_code?: string | null;
    } | null;
    price?: number;
    taxes?: Array<{ rate?: number }>;
  }>;
}

export interface EslogValidationOptions {
  /**
   * Require an issuer/entity bank account so generated e-SLOG XML can include
   * payment means and seller payment account data. Disable this if your host
   * app fills payment instructions outside the shared invoice form.
   */
  requireIssuerBankAccount?: boolean;
  /**
   * Require a customer tax number once customer data clearly represents a
   * business recipient. Disable this if your workflow completes tax data later.
   */
  requireBusinessRecipientTaxNumber?: boolean;
  /**
   * Require UJP package/envelope receiver data. This is stricter than generic
   * e-SLOG and should only be enabled for Slovenian UJP-oriented workflows.
   */
  requireUjpRecipientRouting?: boolean;
}

export interface EslogValidationError {
  field: string;
  message: string;
  params?: Record<string, number | string>;
}

type ResolvedEslogValidationOptions = typeof DEFAULT_ESLOG_VALIDATION_OPTIONS;

function resolveEslogValidationOptions(options?: EslogValidationOptions): ResolvedEslogValidationOptions {
  return { ...DEFAULT_ESLOG_VALIDATION_OPTIONS, ...options };
}

function normalizeUpper(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeIban(value: string | null | undefined): string {
  return normalizeUpper(value).replace(/\s/g, "");
}

function normalizeUjpBic(value: string | null | undefined): string {
  const bic = normalizeUpper(value).replace(/\s/g, "");
  return UJP_BIC_8_PATTERN.test(bic) ? `${bic}XXX` : bic;
}

function mod97(value: string): number {
  let remainder = 0;
  for (const char of value) {
    const code = char >= "A" && char <= "Z" ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of code) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder;
}

function isValidSlovenianIban(value: string | null | undefined): boolean {
  const iban = normalizeIban(value);
  if (!UJP_SI_IBAN_PATTERN.test(iban)) {
    return false;
  }

  return mod97(`${iban.slice(4)}${iban.slice(0, 4)}`) === 1 && mod97(iban.slice(4)) === 1;
}

function isValidUjpBic(value: string | null | undefined): boolean {
  return UJP_BIC_PATTERN.test(normalizeUjpBic(value));
}

function hasUsableBankAccount(
  party:
    | {
        bank_account?: { iban?: string | null; account_number?: string | null } | null;
        bank_accounts?: Array<{ iban?: string | null; bic?: string | null; account_number?: string | null }> | null;
      }
    | null
    | undefined,
): boolean {
  if (party?.bank_account?.iban?.trim()) {
    return true;
  }

  return party?.bank_accounts?.some((account) => account?.iban?.trim()) ?? false;
}

function hasUsableEntityBankAccount(entity: Entity): boolean {
  const settings = (entity.settings ?? {}) as {
    bank_accounts?: Array<{ iban?: string | null; bic?: string | null; account_number?: string | null }> | null;
  };

  return hasUsableBankAccount({ bank_accounts: settings.bank_accounts ?? [] });
}

function getDefaultEntityBankAccount(entity: Entity) {
  const settings = (entity.settings ?? {}) as {
    bank_accounts?: Array<{
      iban?: string | null;
      bic?: string | null;
      account_number?: string | null;
      is_default?: boolean | null;
    }> | null;
  };
  const bankAccounts = settings.bank_accounts ?? [];
  return bankAccounts.find((account) => account?.is_default === true) ?? bankAccounts[0];
}

function getCustomerUjpBankAccount(customer: NonNullable<FormValues["customer"]>) {
  const bankAccounts = customer.bank_accounts ?? [];
  return (
    bankAccounts.find((account) => account?.iban?.trim() && account?.bic?.trim()) ??
    bankAccounts.find((account) => account?.iban?.trim() || account?.bic?.trim())
  );
}

function isExplicitBusinessRecipient(customer: NonNullable<FormValues["customer"]>): boolean {
  if (customer.is_end_consumer === true) {
    return false;
  }

  return (
    Boolean(customer.tax_number?.trim()) || Boolean(customer.company_number?.trim()) || hasUsableBankAccount(customer)
  );
}

function pushEntityPrerequisiteErrors(
  errors: EslogValidationError[],
  entity: Entity,
  options: ResolvedEslogValidationOptions,
) {
  if (!entity.name?.trim()) {
    errors.push({
      field: "entity.name",
      message: "Entity name is required for e-SLOG. Update in Settings > Company.",
    });
  }

  if (!entity.address?.trim()) {
    errors.push({
      field: "entity.address",
      message: "Entity address is required for e-SLOG. Update in Settings > Company.",
    });
  }

  if (!entity.post_code?.trim()) {
    errors.push({
      field: "entity.post_code",
      message: "Entity postal code is required for e-SLOG. Update in Settings > Company.",
    });
  }

  if (!entity.city?.trim()) {
    errors.push({
      field: "entity.city",
      message: "Entity city is required for e-SLOG. Update in Settings > Company.",
    });
  }

  if (!entity.tax_number?.trim()) {
    errors.push({
      field: "entity.tax_number",
      message: "Entity tax number is required for e-SLOG. Update in Settings > Company.",
    });
  } else {
    const taxNumber = entity.tax_number.replace(/\D/g, "");
    if (taxNumber.length !== 8) {
      errors.push({
        field: "entity.tax_number",
        message: "Slovenian tax number must be 8 digits.",
      });
    }
  }

  if (options.requireIssuerBankAccount && !hasUsableEntityBankAccount(entity)) {
    errors.push({
      field: "entity.bank_accounts",
      message: "Entity bank account is required for e-SLOG payment instructions. Update in Settings > Company.",
    });
  }

  if (!options.requireUjpRecipientRouting) {
    return;
  }

  const entityBankAccount = getDefaultEntityBankAccount(entity);
  if (!entityBankAccount?.iban?.trim()) {
    errors.push({
      field: "entity.bank_accounts",
      message: "Entity IBAN is required for UJP package validation. Update in Settings > Company.",
    });
  } else if (!isValidSlovenianIban(entityBankAccount.iban)) {
    errors.push({
      field: "entity.bank_accounts",
      message: "Entity IBAN must be a valid Slovenian IBAN for UJP package validation.",
    });
  }

  if (!entityBankAccount?.bic?.trim()) {
    errors.push({
      field: "entity.bank_accounts",
      message: "Entity BIC is required for UJP package validation. Update in Settings > Company.",
    });
  } else if (!isValidUjpBic(entityBankAccount.bic)) {
    errors.push({
      field: "entity.bank_accounts",
      message: "Entity BIC must be a valid 8- or 11-character BIC for UJP package validation.",
    });
  }
}

function pushDocumentPrerequisiteErrors(errors: EslogValidationError[], values: FormValues, entity: Entity) {
  if (!values.date) {
    errors.push({
      field: "date",
      message: "Invoice date is required for e-SLOG.",
    });
  }

  if (!values.currency_code) {
    errors.push({
      field: "currency_code",
      message: "Currency is required for e-SLOG.",
    });
  } else if (values.currency_code !== "EUR" && entity.currency_code !== "EUR") {
    errors.push({
      field: "currency_code",
      message: "Entity currency must be EUR for e-SLOG when invoice uses a different currency.",
    });
  }
}

function pushCustomerPrerequisiteErrors(
  errors: EslogValidationError[],
  customer: FormValues["customer"],
  options: ResolvedEslogValidationOptions,
) {
  if (!customer || Object.keys(customer).length === 0) {
    return;
  }

  const hasAnyCustomerData = customer.name || customer.address || customer.tax_number || customer.city;

  if (hasAnyCustomerData && !customer.name?.trim()) {
    errors.push({
      field: "customer.name",
      message: "Customer name is required when customer is provided.",
    });
  }

  const explicitBusinessRecipient = isExplicitBusinessRecipient(customer);
  if (explicitBusinessRecipient && options.requireBusinessRecipientTaxNumber && !customer.tax_number?.trim()) {
    errors.push({
      field: "customer.tax_number",
      message: "Customer tax number is required for e-SLOG business recipients.",
    });
  }

  if (!options.requireUjpRecipientRouting) {
    return;
  }

  if (!customer.address?.trim()) {
    errors.push({
      field: "customer.address",
      message: "Customer address is required for UJP package validation.",
    });
  }

  if (!customer.post_code?.trim()) {
    errors.push({
      field: "customer.post_code",
      message: "Customer postal code is required for UJP package validation.",
    });
  }

  if (!customer.city?.trim()) {
    errors.push({
      field: "customer.city",
      message: "Customer city is required for UJP package validation.",
    });
  }

  if (!customer.tax_number?.trim() && !customer.company_number?.trim()) {
    errors.push({
      field: "customer.tax_number",
      message: "Customer tax number or company number is required for UJP package validation.",
    });
  }

  const customerBankAccount = getCustomerUjpBankAccount(customer);
  const customerIban = customerBankAccount?.iban?.trim();
  const customerBic = customerBankAccount?.bic?.trim();

  if (!customerIban && !customerBic) {
    errors.push({
      field: "customer.bank_accounts.0.iban",
      message: "Customer IBAN and BIC are required for UJP package validation.",
    });
    return;
  }

  if (!customerIban) {
    errors.push({
      field: "customer.bank_accounts.0.iban",
      message: "Customer IBAN is required for UJP package validation.",
    });
  } else if (!isValidSlovenianIban(customerIban)) {
    errors.push({
      field: "customer.bank_accounts.0.iban",
      message: "Customer IBAN must be a valid Slovenian IBAN for UJP package validation.",
    });
  }

  if (!customerBic) {
    errors.push({
      field: "customer.bank_accounts.0.bic",
      message: "Customer BIC is required for UJP package validation.",
    });
  } else if (!isValidUjpBic(customerBic)) {
    errors.push({
      field: "customer.bank_accounts.0.bic",
      message: "Customer BIC must be a valid 8- or 11-character BIC for UJP package validation.",
    });
  }
}

function pushLineItemPrerequisiteErrors(errors: EslogValidationError[], items: FormValues["items"]) {
  const lineItems = items?.filter((item) => item?.type !== "separator") ?? [];

  if (lineItems.length === 0) {
    errors.push({
      field: "items",
      message: "At least one line item is required for e-SLOG.",
    });
    return;
  }

  items?.forEach((item, index) => {
    if (item?.type === "separator") {
      return;
    }

    if (!item.name?.trim()) {
      errors.push({
        field: `items.${index}.name`,
        message: "Item name is required for e-SLOG.",
      });
    }

    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      errors.push({
        field: `items.${index}.quantity`,
        message: "Quantity must be greater than 0.",
      });
    }

    if (typeof item.price !== "number") {
      errors.push({
        field: `items.${index}.price`,
        message: "Price is required for e-SLOG.",
      });
    }

    const hasUnitCodeOverride = normalizeEInvoicingUnitCodeOverride(item.e_invoicing?.unit_code, "eslog") !== null;
    const unitCode = resolveEInvoicingUnitCode(item, "eslog");
    if (!hasUnitCodeOverride && !isSupportedEInvoicingUnitCode(unitCode)) {
      errors.push({
        field: `items.${index}.unit`,
        message: "Unsupported unit of measure for e-invoicing.",
      });
    }

    if (!item.taxes) {
      return;
    }

    for (const tax of item.taxes) {
      if (tax.rate !== undefined && !VALID_SI_TAX_RATES.includes(tax.rate)) {
        errors.push({
          field: `items.${index}.taxes`,
          message: "Invalid Slovenian tax rate {{rate}}%. Valid: {{validRates}}",
          params: {
            rate: tax.rate,
            validRates: `${VALID_SI_TAX_RATES.join(", ")}%`,
          },
        });
      }
    }
  });
}

/**
 * Validate user-fixable e-SLOG prerequisites for the shared create forms.
 *
 * This is intentionally not a full XML/profile validator. Generated XML,
 * cardinality, code-list, and monetary reconciliation checks belong to the API.
 */
export function validateEslogForm(
  values: FormValues,
  entity: Entity | null | undefined,
  options?: EslogValidationOptions,
): EslogValidationError[] {
  const errors: EslogValidationError[] = [];

  if (!entity) {
    return errors;
  }

  const resolvedOptions = resolveEslogValidationOptions(options);
  pushEntityPrerequisiteErrors(errors, entity, resolvedOptions);
  pushDocumentPrerequisiteErrors(errors, values, entity);
  pushCustomerPrerequisiteErrors(errors, values.customer, resolvedOptions);
  pushLineItemPrerequisiteErrors(errors, values.items);

  return errors;
}

/**
 * Check if there are any entity-level errors that require settings update
 */
export function hasEntityErrors(errors: EslogValidationError[]): boolean {
  return getEntityErrors(errors).length > 0;
}

/**
 * Get entity-level errors for display in a summary
 */
export function getEntityErrors(errors: EslogValidationError[]): EslogValidationError[] {
  return errors.filter((e) => e.field.startsWith("entity."));
}

/**
 * Get form field errors (non-entity errors)
 */
export function getFormFieldErrors(errors: EslogValidationError[]): EslogValidationError[] {
  const entityErrors = new Set(getEntityErrors(errors));
  return errors.filter((e) => !entityErrors.has(e));
}

/**
 * Customer prerequisite errors may target fields that are hidden while an
 * existing customer is selected. Use this to reveal the inline customer editor
 * after validation so users can fix the data without searching for the cause.
 */
export function hasCustomerFieldErrors(errors: FieldErrors<FieldValues> | undefined): boolean {
  const customerErrors = errors?.customer;

  if (!customerErrors || typeof customerErrors !== "object") {
    return false;
  }

  return Object.keys(customerErrors).length > 0;
}

function isFieldErrorLeaf(value: unknown): value is { type?: string; message?: string } {
  return !!value && typeof value === "object" && ("type" in value || "message" in value);
}

function setNestedFieldError(target: Record<string, any>, path: string, error: { type: string; message: string }) {
  const segments = path.split(".");
  let current: Record<string, any> = target;

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];
    const nextShouldBeArray = nextSegment !== undefined && /^\d+$/.test(nextSegment);
    const currentRecord = current as Record<string, any>;

    if (isLast) {
      currentRecord[segment] = error;
      return;
    }

    if (currentRecord[segment] == null) {
      currentRecord[segment] = nextShouldBeArray ? [] : {};
    }

    current = currentRecord[segment] as Record<string, any>;
  });
}

export function buildEslogFieldErrors<TFieldValues extends FieldValues>(
  errors: EslogValidationError[],
  translate: (key: string) => string,
): FieldErrors<TFieldValues> {
  const nestedErrors: Record<string, any> = {};

  for (const error of errors) {
    setNestedFieldError(nestedErrors, error.field, {
      type: "eslog",
      message: translateEslogValidationError(error, translate),
    });
  }

  return nestedErrors as FieldErrors<TFieldValues>;
}

export function mergeFieldErrors<TFieldValues extends FieldValues>(
  baseErrors: FieldErrors<TFieldValues>,
  extraErrors: FieldErrors<TFieldValues>,
): FieldErrors<TFieldValues> {
  if (!baseErrors || Object.keys(baseErrors).length === 0) {
    return extraErrors;
  }

  if (!extraErrors || Object.keys(extraErrors).length === 0) {
    return baseErrors;
  }

  const merged: Record<string, any> = Array.isArray(baseErrors) ? [...baseErrors] : { ...baseErrors };

  for (const [key, extraValue] of Object.entries(extraErrors)) {
    const baseValue = (merged as Record<string, any>)[key];

    if (baseValue == null) {
      merged[key] = extraValue;
      continue;
    }

    if (isFieldErrorLeaf(baseValue) || isFieldErrorLeaf(extraValue)) {
      merged[key] = baseValue;
      continue;
    }

    merged[key] = mergeFieldErrors(baseValue as FieldErrors<TFieldValues>, extraValue as FieldErrors<TFieldValues>);
  }

  return merged as FieldErrors<TFieldValues>;
}

export function translateEslogValidationError(error: EslogValidationError, translate: (key: string) => string): string {
  let message = translate(error.message);

  if (!error.params) {
    return message;
  }

  for (const [key, value] of Object.entries(error.params)) {
    message = message.replaceAll(`{{${key}}}`, String(value));
  }

  return message;
}
