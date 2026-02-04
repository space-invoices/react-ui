/**
 * Form schemas for document creation.
 *
 * For copy-paste usage, grab the specific schema file you need + shared.ts:
 * - shared.ts (required) - common building blocks
 * - invoice.ts - invoice form
 * - credit-note.ts - credit note form
 * - estimate.ts - estimate form
 * - advance-invoice.ts - advance invoice form
 */

export * from "./advance-invoice";
export * from "./credit-note";
export * from "./estimate";
// Document-specific schemas
export * from "./invoice";
// Shared building blocks
export * from "./shared";
