"use client";

import type { AdvanceInvoice, CreditNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FileText } from "lucide-react";
import { useEffect, useMemo } from "react";
import { getClientHeaders } from "@/ui/lib/client-headers";
import { cn } from "@/ui/lib/utils";
import { useEntitiesOptional } from "@/ui/providers/entities-context";
import { useSDK } from "@/ui/providers/sdk-provider";
import { DocumentPreviewSkeleton } from "./document-preview-skeleton";
import { ScaledDocumentPreview } from "./scaled-document-preview";
import { useA4Scaling } from "./use-a4-scaling";

const SAVED_PREVIEW_TIMING_EVENT = "si:saved-preview-timing";
const SAVED_DOCUMENT_PREVIEW_QUERY_KEY = "document-preview-html";
const SAVED_DOCUMENT_PREVIEW_STALE_TIME = 1000 * 60 * 5;
const SAVED_DOCUMENT_PREVIEW_GC_TIME = 1000 * 60 * 30;

function emitSavedPreviewDebug(detail: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAVED_PREVIEW_TIMING_EVENT, { detail }));
}

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

export function getSavedDocumentPreviewQueryKey({
  documentId,
  documentUpdatedAt,
  entityId,
  template,
  isPublicView,
  shareableId,
}: {
  documentId: string;
  documentUpdatedAt?: string | null;
  entityId?: string | null;
  template?: "modern" | "classic" | "condensed" | "minimal" | "fashion";
  isPublicView?: boolean;
  shareableId?: string | null;
}) {
  return [
    SAVED_DOCUMENT_PREVIEW_QUERY_KEY,
    documentId,
    documentUpdatedAt ?? null,
    entityId ?? null,
    template ?? null,
    isPublicView ?? false,
    shareableId ?? null,
  ] as const;
}

type DocumentPreviewDisplayProps = {
  /** The document to display (invoice, estimate, credit note, or advance invoice) */
  document: Document;
  template?: "modern" | "classic" | "condensed" | "minimal" | "fashion";
  className?: string;
  apiBaseUrl?: string;
  /** Locale for document rendering (e.g., "en-US", "sl-SI"). Uses user's UI language. */
  locale?: string;
  /** Whether this is a public view (no auth required) */
  isPublicView?: boolean;
  /** Shareable ID for public view (required when isPublicView is true) */
  shareableId?: string;
  /** Translation function for UI strings */
  t?: (key: string) => string;
  /** Document type label for display (e.g., "Invoice", "Estimate") */
  documentTypeLabel?: string;
  /** Whether preview fetching is currently allowed */
  fetchEnabled?: boolean;
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
  locale: _locale,
  isPublicView = false,
  shareableId,
  t: tProp,
  documentTypeLabel,
  fetchEnabled = true,
}: DocumentPreviewDisplayProps) {
  const t = tProp ?? ((key: string) => key);
  const entitiesContext = useEntitiesOptional();
  const activeEntity = entitiesContext?.activeEntity;
  const { sdk } = useSDK();
  const documentId = document?.id;
  const documentUpdatedAt = document?.updated_at ?? null;

  const queryKey = useMemo(() => {
    return getSavedDocumentPreviewQueryKey({
      documentId: documentId ?? shareableId ?? "",
      documentUpdatedAt,
      entityId: activeEntity?.id,
      template,
      isPublicView,
      shareableId,
    });
  }, [activeEntity?.id, documentId, documentUpdatedAt, isPublicView, shareableId, template]);

  const prerequisitesReady = isPublicView ? !!shareableId && !!apiBaseUrl : !!documentId && !!activeEntity?.id && !!sdk;

  const previewQuery = useQuery({
    queryKey,
    enabled: fetchEnabled && prerequisitesReady,
    staleTime: SAVED_DOCUMENT_PREVIEW_STALE_TIME,
    gcTime: SAVED_DOCUMENT_PREVIEW_GC_TIME,
    queryFn: async ({ signal }) => {
      const abortController = new AbortController();
      const abortRequest = () => abortController.abort();
      signal.addEventListener("abort", abortRequest, { once: true });

      try {
        if (isPublicView && shareableId && apiBaseUrl) {
          const docTypePath = getDocTypePathFromShareableId(shareableId);
          const response = await fetch(`${apiBaseUrl}/${docTypePath}/shareable/${shareableId}/html`, {
            headers: getClientHeaders("ui"),
            signal: abortController.signal,
          });
          if (!response.ok) {
            throw new Error("Failed to load preview");
          }
          return await response.text();
        }

        if (!documentId || !activeEntity?.id || !sdk) {
          throw new Error("Preview context unavailable");
        }

        const startedAt = performance.now();
        emitSavedPreviewDebug({
          stage: "request_started",
          documentId,
        });

        const html = await sdk.invoices.renderHtml(
          documentId,
          { template },
          {
            entity_id: activeEntity.id,
            signal: abortController.signal,
          },
        );

        emitSavedPreviewDebug({
          stage: "request_succeeded",
          documentId,
          elapsedMs: Number((performance.now() - startedAt).toFixed(1)),
        });

        return html;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          emitSavedPreviewDebug({
            stage: "request_aborted",
            documentId,
          });
        } else {
          emitSavedPreviewDebug({
            stage: "request_failed",
            documentId,
            message: err instanceof Error ? err.message : "Failed to load preview",
          });
        }
        throw err;
      } finally {
        signal.removeEventListener("abort", abortRequest);
      }
    },
  });

  const previewHtml = previewQuery.data ?? "";
  const error = previewQuery.error instanceof Error ? previewQuery.error.message : null;
  const isWaitingForFetch = prerequisitesReady && !fetchEnabled && !previewHtml && !error;
  const isLoading = previewQuery.isPending || isWaitingForFetch;
  const { containerRef, contentRef, scale, contentHeight, A4_WIDTH_PX } = useA4Scaling(previewHtml);

  useEffect(() => {
    if (isPublicView || prerequisitesReady) return;

    emitSavedPreviewDebug({
      stage: "skipped",
      reason: "missing_context",
      documentId,
      hasEntityId: !!activeEntity?.id,
      hasSdk: !!sdk,
    });
  }, [activeEntity?.id, documentId, isPublicView, prerequisitesReady, sdk]);

  return (
    <div ref={containerRef} className={cn("relative min-h-full", className)}>
      {/* Loading state */}
      {isLoading && <DocumentPreviewSkeleton />}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex h-full items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-semibold text-destructive">{t("Preview Error")}</p>
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
              <p className="font-medium text-muted-foreground">{documentTypeLabel || t("Document Preview")}</p>
              <p className="text-muted-foreground/70 text-sm">{t("Preview will appear here")}</p>
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
