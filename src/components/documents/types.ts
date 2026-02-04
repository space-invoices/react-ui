/**
 * Shared document types for invoices, estimates, credit notes, and advance invoices
 */

export type DocumentTypes = "invoice" | "estimate" | "credit_note" | "advance_invoice";

export interface DocumentConfig {
  type: DocumentTypes;
  apiEndpoint: string;
  cacheKey: string;
  dateFieldName: "date_due" | "date_valid_till" | null;
  dateFieldLabel: string | null;
  singularName: string;
  pluralName: string;
}

export const DOCUMENT_CONFIGS: Record<DocumentTypes, DocumentConfig> = {
  invoice: {
    type: "invoice",
    apiEndpoint: "invoices",
    cacheKey: "invoices",
    dateFieldName: "date_due",
    dateFieldLabel: "Due Date",
    singularName: "Invoice",
    pluralName: "Invoices",
  },
  estimate: {
    type: "estimate",
    apiEndpoint: "estimates",
    cacheKey: "estimates",
    dateFieldName: "date_valid_till",
    dateFieldLabel: "Valid Until",
    singularName: "Estimate",
    pluralName: "Estimates",
  },
  credit_note: {
    type: "credit_note",
    apiEndpoint: "credit-notes",
    cacheKey: "credit-notes",
    dateFieldName: null, // Credit notes don't have a due date
    dateFieldLabel: null,
    singularName: "Credit Note",
    pluralName: "Credit Notes",
  },
  advance_invoice: {
    type: "advance_invoice",
    apiEndpoint: "advance-invoices",
    cacheKey: "advance-invoices",
    dateFieldName: "date_due",
    dateFieldLabel: "Due Date",
    singularName: "Advance Invoice",
    pluralName: "Advance Invoices",
  },
} as const;

/**
 * Get document configuration by type
 */
export function getDocumentConfig(type: DocumentTypes): DocumentConfig {
  return DOCUMENT_CONFIGS[type];
}
