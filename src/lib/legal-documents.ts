/**
 * Customer-facing legal documents and their current versions.
 *
 * Deliberate duplicate of `apps/api/src/lib/legal-documents.ts` so browser
 * bundles do not import API code. When a new Terms of Service or Data
 * Processing Agreement version is published, bump both files together.
 */

export const LEGAL_DOCUMENTS_BASE_URL = "https://spaceinvoices.com";

export type LegalDocumentType = "terms" | "dpa";

export interface LegalDocumentDefinition {
  /** Version identifier as published on the document page. */
  version: string;
  /** Public URL of the current document. */
  url: string;
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentType, LegalDocumentDefinition> = {
  terms: { version: "2026-09-05", url: `${LEGAL_DOCUMENTS_BASE_URL}/terms` },
  dpa: { version: "1.0", url: `${LEGAL_DOCUMENTS_BASE_URL}/dpa` },
} as const;

/** Public legal pages linked from the account Legal card. */
export const LEGAL_PAGE_URLS = {
  terms: LEGAL_DOCUMENTS.terms.url,
  privacy: `${LEGAL_DOCUMENTS_BASE_URL}/privacy`,
  dpa: LEGAL_DOCUMENTS.dpa.url,
  subProcessors: `${LEGAL_DOCUMENTS_BASE_URL}/sub-processors`,
} as const;
