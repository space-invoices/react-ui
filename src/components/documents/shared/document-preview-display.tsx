"use client";

import {
  type AdvanceInvoice,
  type CreditNote,
  type DeliveryNote,
  type Estimate,
  type Invoice,
  invoices,
} from "@spaceinvoices/js-sdk";
import { getClientHeaders } from "@spaceinvoices/js-sdk/client-headers";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FileText } from "lucide-react";
import { useEffect, useMemo } from "react";
import { getEntityCountryCapabilities } from "@/ui/lib/country-capabilities";
import { cn } from "@/ui/lib/utils";
import { useEntitiesOptional } from "@/ui/providers/entities-context";
import { useSpaceInvoicesRuntimeOptional } from "@/ui/providers/space-invoices-provider";
import { getDocumentConfigFromShareableId } from "../types";
import { DocumentPreviewSkeleton } from "./document-preview-skeleton";
import { ScaledDocumentPreview } from "./scaled-document-preview";
import { useA4Scaling } from "./use-a4-scaling";

const SAVED_PREVIEW_TIMING_EVENT = "si:saved-preview-timing";
const SAVED_DOCUMENT_PREVIEW_QUERY_KEY = "document-preview-html";
const SAVED_DOCUMENT_PREVIEW_RENDERER_VERSION = "html-preview-v16";
const SAVED_DOCUMENT_PREVIEW_STALE_TIME = 1000 * 60 * 5;
const SAVED_DOCUMENT_PREVIEW_GC_TIME = 1000 * 60 * 30;

function emitSavedPreviewDebug(detail: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAVED_PREVIEW_TIMING_EVENT, { detail }));
}

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
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
    SAVED_DOCUMENT_PREVIEW_RENDERER_VERSION,
    documentUpdatedAt ?? null,
    entityId ?? null,
    template ?? null,
    isPublicView ?? false,
    shareableId ?? null,
  ] as const;
}

export function getSavedDocumentPreviewQueryPrefix(documentId: string) {
  return [SAVED_DOCUMENT_PREVIEW_QUERY_KEY, documentId] as const;
}

type DocumentPreviewDisplayProps = {
  /** The document to display (invoice, estimate, credit note, or advance invoice) */
  document: Document;
  template?: "modern" | "classic" | "condensed" | "minimal" | "fashion";
  className?: string;
  apiBaseUrl?: string;
  /** Language for translated labels in public preview rendering. */
  language?: string;
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
  /** When true, keep the preview card fixed and scroll only the PDF viewport inside it */
  containedScroll?: boolean;
};

/**
 * Document Preview Display Component
 *
 * Fetches and displays the HTML preview of a saved document.
 * Saved previews use backend/entity defaults for document output.
 * Public previews may pass a language override while leaving formatting locale to the backend default.
 * Works with any document type (invoice, estimate, credit note, advance invoice).
 * Document type is auto-detected from the ID prefix.
 */
export function DocumentPreviewDisplay({
  document,
  template,
  className,
  apiBaseUrl,
  language,
  isPublicView = false,
  shareableId,
  t: tProp,
  documentTypeLabel,
  fetchEnabled = true,
  containedScroll = false,
}: DocumentPreviewDisplayProps) {
  const t = tProp ?? ((key: string) => key);
  const entitiesContext = useEntitiesOptional();
  const activeEntity = entitiesContext?.activeEntity;
  const runtime = useSpaceInvoicesRuntimeOptional();
  const countryCapabilities = getEntityCountryCapabilities(activeEntity);
  const documentId = document?.id;
  const documentUpdatedAt = document?.updated_at ?? null;
  const effectiveTemplate = countryCapabilities.allowPdfTemplateSelection
    ? template
    : countryCapabilities.resolvedPdfTemplate;

  const queryKey = useMemo(() => {
    return getSavedDocumentPreviewQueryKey({
      documentId: documentId ?? shareableId ?? "",
      documentUpdatedAt,
      entityId: activeEntity?.id,
      template: effectiveTemplate,
      isPublicView,
      shareableId,
    });
  }, [activeEntity?.id, documentId, documentUpdatedAt, effectiveTemplate, isPublicView, shareableId]);

  const prerequisitesReady = isPublicView
    ? !!shareableId && !!apiBaseUrl
    : !!documentId && !!activeEntity?.id && !!runtime?.hasAccessToken;

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
          const params = language ? `?${new URLSearchParams({ language }).toString()}` : "";
          const response = await fetch(
            `${apiBaseUrl}/${getDocumentConfigFromShareableId(shareableId).apiEndpoint}/shareable/${shareableId}/html${params}`,
            {
              headers: getClientHeaders("ui"),
              signal: abortController.signal,
            },
          );
          if (!response.ok) {
            throw new Error("Failed to load preview");
          }
          return await response.text();
        }

        if (!documentId || !activeEntity?.id || !runtime?.hasAccessToken) {
          throw new Error("Preview context unavailable");
        }

        const startedAt = performance.now();
        emitSavedPreviewDebug({
          stage: "request_started",
          documentId,
        });

        const html = await invoices.renderHtml(
          documentId,
          { template: effectiveTemplate },
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
  const { containerRef, scale, A4_WIDTH_PX } = useA4Scaling(previewHtml);

  useEffect(() => {
    if (isPublicView || prerequisitesReady) return;

    emitSavedPreviewDebug({
      stage: "skipped",
      reason: "missing_context",
      documentId,
      hasEntityId: !!activeEntity?.id,
      hasRuntimeToken: !!runtime?.hasAccessToken,
    });
  }, [activeEntity?.id, documentId, isPublicView, prerequisitesReady, runtime?.hasAccessToken]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", containedScroll ? "flex h-full min-h-0 flex-col" : null, className)}
    >
      {/* Loading state */}
      {isLoading && <DocumentPreviewSkeleton />}

      {/* Error state */}
      {error && !isLoading && (
        <div
          className={cn(
            "flex h-full items-center justify-center rounded-lg p-8",
            isPublicView ? "border border-border/70 bg-muted/20" : "border border-destructive/50 bg-destructive/10",
          )}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertCircle className={cn("h-8 w-8", isPublicView ? "text-muted-foreground" : "text-destructive")} />
            <p className={cn("font-semibold", isPublicView ? "text-foreground" : "text-destructive")}>
              {t("Preview Error")}
            </p>
            <p className="text-muted-foreground text-sm">{isPublicView ? t("Preview unavailable") : error}</p>
            {!isPublicView && <p className="text-muted-foreground text-sm">{error}</p>}
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
          A4_WIDTH_PX={A4_WIDTH_PX}
          containedScroll={containedScroll}
        />
      )}
    </div>
  );
}

/** @deprecated Use DocumentPreviewDisplay instead */
export const InvoicePreviewDisplay = DocumentPreviewDisplay;
