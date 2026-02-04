/**
 * Documents - Shared components for all document types (invoices, estimates, credit notes)
 */

export { default as DocumentAddItemForm } from "./create/document-add-item-form";
export { default as DocumentAddItemTaxRateField } from "./create/document-add-item-tax-rate-field";
// Create form components
export { DocumentDetailsSection } from "./create/document-details-section";
export { DocumentItemsSection } from "./create/document-items-section";
export { DocumentRecipientSection } from "./create/document-recipient-section";
export { LiveInvoicePreview } from "./create/live-preview";
export { MarkAsPaidSection } from "./create/mark-as-paid-section";
// Shared utilities
export { prepareDocumentSubmission } from "./create/prepare-document-submission";
export { useDocumentCustomerForm } from "./create/use-document-customer-form";
// Preview components
export { default as DocumentPreview } from "./document-preview";
export { ScaledDocumentPreview } from "./shared/scaled-document-preview";
export { useA4Scaling } from "./shared/use-a4-scaling";
// Types
export * from "./types";
// View components
export { DocumentActionsBar, DocumentDetailsCard, DocumentPaymentsList } from "./view";
