"use client";

import type { AdvanceInvoice, CreditNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/ui/lib/utils";
import { useEntitiesOptional } from "@/ui/providers/entities-context";
import { useSDK } from "@/ui/providers/sdk-provider";
import { ScaledDocumentPreview } from "./scaled-document-preview";
import { useA4Scaling } from "./use-a4-scaling";

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice;

/**
 * Get API path segment from shareable ID prefix
 * Shareable IDs are prefixed with document type: inv_share_, est_share_, cre_share_, adv_share_
 */
function getDocTypePathFromShareableId(shareableId: string): string {
  if (shareableId.startsWith("inv_share_")) return "invoices";
  if (shareableId.startsWith("est_share_")) return "estimates";
  if (shareableId.startsWith("cre_share_")) return "credit-notes";
  if (shareableId.startsWith("adv_share_")) return "advance-invoices";
  // Fallback to invoices for backwards compatibility
  return "invoices";
}

type DocumentPreviewDisplayProps = {
  /** The document to display (invoice, estimate, credit note, or advance invoice) */
  document: Document;
  template?: "modern";
  className?: string;
  apiBaseUrl?: string;
  /** Locale for document rendering (e.g., "en-US", "sl-SI"). Uses user's UI language. */
  locale?: string;
  /** Whether this is a public view (no auth required) */
  isPublicView?: boolean;
  /** Shareable ID for public view (required when isPublicView is true) */
  shareableId?: string;
};

/**
 * Document Preview Display Component
 *
 * Fetches and displays the HTML preview of a saved document.
 * Works with any document type (invoice, estimate, credit note, advance invoice).
 * Document type is auto-detected from the ID prefix.
 */
export function DocumentPreviewDisplay({
  document,
  template,
  className,
  apiBaseUrl,
  locale,
  isPublicView = false,
  shareableId,
}: DocumentPreviewDisplayProps) {
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const entitiesContext = useEntitiesOptional();
  const activeEntity = entitiesContext?.activeEntity;
  const { sdk } = useSDK();

  const { containerRef, contentRef, scale, contentHeight, A4_WIDTH_PX } = useA4Scaling(previewHtml);

  useEffect(() => {
    const fetchPreview = async () => {
      // For public view, use per-type shareable HTML endpoint
      if (isPublicView && shareableId && apiBaseUrl) {
        setIsLoading(true);
        setError(null);
        try {
          // Determine document type from shareable ID prefix
          const docTypePath = getDocTypePathFromShareableId(shareableId);
          const response = await fetch(
            `${apiBaseUrl}/${docTypePath}/shareable/${shareableId}/html${locale ? `?locale=${locale}` : ""}`,
          );
          if (!response.ok) {
            throw new Error("Failed to load preview");
          }
          const html = await response.text();
          setPreviewHtml(html);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load preview");
          setPreviewHtml("");
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Authenticated view - require entity context and SDK
      if (!document?.id || !activeEntity?.id || !sdk) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch the rendered HTML by document ID using SDK wrapper
        // Document type is auto-detected from ID prefix (inv_, est_, cre_, adv_)
        const html = await sdk.invoices.renderHtml(document.id, { template, locale }, { entity_id: activeEntity.id });

        setPreviewHtml(html);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load preview");
        setPreviewHtml("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [document?.id, activeEntity?.id, template, apiBaseUrl, locale, isPublicView, shareableId, sdk]);

  return (
    <div ref={containerRef} className={cn("relative h-full", className)}>
      {/* Loading state */}
      {isLoading && (
        <div className="flex h-full items-center justify-center rounded-lg border bg-muted/50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading preview...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex h-full items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-semibold text-destructive">Preview Error</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state - no preview available */}
      {!previewHtml && !error && !isLoading && (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/30">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Document Preview</p>
              <p className="text-muted-foreground/70 text-sm">Preview will appear here</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview - Scoped HTML injection with A4 scaling */}
      {previewHtml && !error && !isLoading && (
        <ScaledDocumentPreview
          htmlContent={previewHtml}
          scale={scale}
          contentHeight={contentHeight}
          A4_WIDTH_PX={A4_WIDTH_PX}
          contentRef={contentRef}
          entityUpdatedAt={activeEntity?.updated_at ? new Date(activeEntity.updated_at) : null}
        />
      )}
    </div>
  );
}

/** @deprecated Use DocumentPreviewDisplay instead */
export const InvoicePreviewDisplay = DocumentPreviewDisplay;
