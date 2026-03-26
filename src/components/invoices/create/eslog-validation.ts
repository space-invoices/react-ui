/**
 * Client-side e-SLOG 2.0 validation for invoice creation form
 *
 * Validates form data against e-SLOG requirements before submission.
 * Returns field-specific errors that can be displayed on form elements.
 */

import type { FieldErrors, FieldValues } from "react-hook-form";
import type { Entity } from "@/ui/providers/entities-context";

// Valid Slovenian tax rates (%)
const VALID_SI_TAX_RATES = [22, 9.5, 5, 0];

interface FormValues {
  number?: string;
  date?: string;
  currency_code?: string;
  customer?: {
    name?: string;
    address?: string;
    post_code?: string;
    city?: string;
    country?: string;
    country_code?: string;
    tax_number?: string;
  } | null;
  items?: Array<{
    name?: string;
    quantity?: number;
    price?: number;
    taxes?: Array<{ rate?: number }>;
  }>;
}

interface ValidationError {
  field: string;
  message: string;
  params?: Record<string, number | string>;
}

/**
 * Validate form values against e-SLOG 2.0 requirements
 * Returns array of validation errors with field paths
 */
export function validateEslogForm(values: FormValues, entity: Entity | null | undefined): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!entity) {
    return errors;
  }

  // === ISSUER (Entity) VALIDATION ===
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

  if (entity.country_code !== "SI") {
    errors.push({
      field: "entity.country_code",
      message: "Entity must be from Slovenia (SI) for e-SLOG.",
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

  // === DOCUMENT VALIDATION ===
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
    // If invoice is not EUR, entity must be EUR so API can convert to _converted fields
    errors.push({
      field: "currency_code",
      message: "Entity currency must be EUR for e-SLOG when invoice uses a different currency.",
    });
  }

  // === CUSTOMER VALIDATION ===
  // Customer is optional, but if provided, name is required
  if (values.customer && Object.keys(values.customer).length > 0) {
    const hasAnyCustomerData =
      values.customer.name || values.customer.address || values.customer.tax_number || values.customer.city;

    if (hasAnyCustomerData && !values.customer.name?.trim()) {
      errors.push({
        field: "customer.name",
        message: "Customer name is required when customer is provided.",
      });
    }
  }

  // === LINE ITEMS VALIDATION ===
  if (!values.items || values.items.length === 0) {
    errors.push({
      field: "items",
      message: "At least one line item is required for e-SLOG.",
    });
  } else {
    values.items.forEach((item, index) => {
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

      // Validate tax rates
      if (item.taxes && item.taxes.length > 0) {
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
      }
    });
  }

  return errors;
}

/**
 * Check if there are any entity-level errors that require settings update
 */
export function hasEntityErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => e.field.startsWith("entity."));
}

/**
 * Get entity-level errors for display in a summary
 */
export function getEntityErrors(errors: ValidationError[]): ValidationError[] {
  return errors.filter((e) => e.field.startsWith("entity."));
}

/**
 * Get form field errors (non-entity errors)
 */
export function getFormFieldErrors(errors: ValidationError[]): ValidationError[] {
  return errors.filter((e) => !e.field.startsWith("entity."));
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
  errors: ValidationError[],
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

export function translateEslogValidationError(error: ValidationError, translate: (key: string) => string): string {
  let message = translate(error.message);

  if (!error.params) {
    return message;
  }

  for (const [key, value] of Object.entries(error.params)) {
    message = message.replaceAll(`{{${key}}}`, String(value));
  }

  return message;
}
