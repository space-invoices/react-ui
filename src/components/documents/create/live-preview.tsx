"use client";

import type { CreateInvoiceRequest } from "@spaceinvoices/js-sdk";
import { advanceInvoices, creditNotes, deliveryNotes, estimates, invoices } from "@spaceinvoices/js-sdk";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/ui/lib/utils";
import { useEntities } from "@/ui/providers/entities-context";
import { DocumentPreviewSkeleton } from "../shared/document-preview-skeleton";
import { ScaledDocumentPreview } from "../shared/scaled-document-preview";
import { useA4Scaling } from "../shared/use-a4-scaling";
import type { DocumentTypes } from "../types";
import { filterUnresolvedTaxes, normalizeDocumentPreviewDates } from "./prepare-preview-data";

const LIVE_PREVIEW_TIMING_EVENT = "si:live-preview-timing";
const LIVE_PREVIEW_DEBOUNCE_MS = 300;
const LIVE_PREVIEW_REQUEST_TIMEOUT_MS = 15_000;

function emitLivePreviewDebug(detail: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LIVE_PREVIEW_TIMING_EVENT, { detail }));
}

export type PdfTemplateId = "modern" | "classic" | "condensed" | "minimal" | "fashion";

type LiveInvoicePreviewProps = {
  data: Partial<CreateInvoiceRequest>;
  currency?: string;
  template?: PdfTemplateId;
  className?: string;
  apiBaseUrl?: string;
  getAuthToken?: () => string | undefined;
  /** Fixed scale to use instead of dynamic scaling. Useful to prevent layout shifts. */
  fixedScale?: number;
  /** Translation function for UI strings */
  t?: (key: string) => string;
  /** Document type label for display (e.g., "Invoice", "Estimate") */
  documentTypeLabel?: string;
  /** Document type to determine which render endpoint to use */
  documentType?: DocumentTypes;
  /** Skip debounce for the first non-empty preview request. */
  eagerFirstPreview?: boolean;
  /** QR settings overrides for preview (before saving) */
  qrOverrides?: {
    upn_qr_enabled?: boolean;
    upn_qr_display_mode?: "qr_only" | "full_slip";
    epc_qr_enabled?: boolean;
    hub3_qr_enabled?: boolean;
    hub3_qr_purpose_code?: string;
    hub3_qr_reference_model?: string;
  };
};

type PreviewRequest = {
  key: string;
  data: Record<string, any>;
  itemCount: number;
};

/**
 * Live Invoice Preview Component
 *
 * Generates a real-time HTML preview of an invoice as the user fills out the form.
 * Uses debouncing to avoid excessive API calls and shows loading states.
 *
 * Features:
 * - Debounced API requests (300ms delay after user stops typing)
 * - Loading skeleton while fetching preview
 * - Error handling with fallback display
 * - Fully styled HTML with scoped CSS (prevents style leakage)
 */
export function LiveInvoicePreview({
  data,
  currency: _currency = "EUR",
  template,
  className,
  fixedScale,
  t: tProp,
  documentTypeLabel: _documentTypeLabel,
  documentType = "invoice",
  eagerFirstPreview = false,
  qrOverrides,
}: LiveInvoicePreviewProps) {
  const t = useMemo(() => tProp ?? ((key: string) => key), [tProp]);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshPending, setIsRefreshPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeEntity } = useEntities();
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestKeyRef = useRef<string | null>(null);
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const hasDispatchedFirstPreviewRef = useRef(false);

  const { containerRef, scale: dynamicScale, A4_WIDTH_PX } = useA4Scaling(previewHtml);
  const scale = fixedScale ?? dynamicScale;
  const activeEntityId = activeEntity?.id;
  const activeEntityName = activeEntity?.name;
  const activeEntityAddress = activeEntity?.address;
  const activeEntityAddress2 = activeEntity?.address_2;
  const activeEntityPostCode = activeEntity?.post_code;
  const activeEntityCity = activeEntity?.city;
  const activeEntityState = activeEntity?.state;
  const activeEntityCountry = activeEntity?.country;
  const activeEntityTaxNumber = activeEntity?.tax_number;
  const activeEntityIssuer = useMemo(
    () =>
      activeEntityId
        ? {
            name: activeEntityName,
            address: activeEntityAddress,
            address_2: activeEntityAddress2,
            post_code: activeEntityPostCode,
            city: activeEntityCity,
            state: activeEntityState,
            country: activeEntityCountry,
            tax_number: activeEntityTaxNumber,
          }
        : null,
    [
      activeEntityAddress,
      activeEntityAddress2,
      activeEntityCity,
      activeEntityCountry,
      activeEntityId,
      activeEntityName,
      activeEntityPostCode,
      activeEntityState,
      activeEntityTaxNumber,
    ],
  );

  const buildPreviewRequest = useCallback(
    (invoiceData: Partial<CreateInvoiceRequest>): PreviewRequest | null => {
      if (!invoiceData.items || invoiceData.items.length === 0) return null;

      // Prepare preview data with active entity as issuer (if not already set)
      // Exclude 'number' as it's auto-generated by the render endpoint
      const { number: _number, ...invoiceDataWithoutNumber } = invoiceData as any;
      const previewData = normalizeDocumentPreviewDates({
        ...invoiceDataWithoutNumber,
        // Filter out unresolved tax_ids (race condition: form may add
        // { tax_id: undefined } before the tax dropdown auto-selects a value)
        items: filterUnresolvedTaxes(invoiceData.items),
        ...(activeEntityIssuer && (invoiceData.issuer || !(invoiceData as any).business_unit_id)
          ? {
              issuer: {
                ...activeEntityIssuer,
                ...invoiceData.issuer,
              },
            }
          : {}),
      });

      const normalizedQrOverrides = {
        upn_qr_enabled: qrOverrides?.upn_qr_enabled,
        upn_qr_display_mode: qrOverrides?.upn_qr_display_mode,
        epc_qr_enabled: qrOverrides?.epc_qr_enabled,
        hub3_qr_enabled: qrOverrides?.hub3_qr_enabled,
        hub3_qr_purpose_code: qrOverrides?.hub3_qr_purpose_code,
        hub3_qr_reference_model: qrOverrides?.hub3_qr_reference_model,
      };

      return {
        key: JSON.stringify({
          documentType,
          template,
          qrOverrides: normalizedQrOverrides,
          entityId: activeEntityId ?? null,
          previewData,
        }),
        data: previewData,
        itemCount: previewData.items?.length ?? 0,
      };
    },
    [
      activeEntityId,
      activeEntityIssuer,
      documentType,
      template,
      qrOverrides?.upn_qr_enabled,
      qrOverrides?.upn_qr_display_mode,
      qrOverrides?.epc_qr_enabled,
      qrOverrides?.hub3_qr_enabled,
      qrOverrides?.hub3_qr_purpose_code,
      qrOverrides?.hub3_qr_reference_model,
    ],
  );

  const previewRequest = useMemo(() => buildPreviewRequest(data), [buildPreviewRequest, data]);
  const previewRequestKey = previewRequest?.key ?? null;
  const latestPreviewRequestRef = useRef<PreviewRequest | null>(null);
  latestPreviewRequestRef.current = previewRequest;

  /**
   * Fetch preview from API
   */
  const fetchPreview = useCallback(
    async (request: PreviewRequest) => {
      if (lastRequestKeyRef.current === request.key) {
        if (inFlightRequestKeyRef.current !== request.key) {
          setIsLoading(false);
        }
        setIsRefreshPending(false);
        emitLivePreviewDebug({
          stage: "deduped",
          documentType,
          itemCount: request.itemCount,
        });
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setIsRefreshPending(false);
      setError(null);
      lastRequestKeyRef.current = request.key;
      inFlightRequestKeyRef.current = request.key;

      let didTimeout = false;
      const timeoutId = setTimeout(() => {
        didTimeout = true;
        abortController.abort();
      }, LIVE_PREVIEW_REQUEST_TIMEOUT_MS);

      try {
        if (!activeEntityId) {
          throw new Error("Authentication required");
        }
        const startedAt = performance.now();
        emitLivePreviewDebug({
          stage: "request_started",
          documentType,
          itemCount: request.itemCount,
          template,
        });

        // Call the render API using the appropriate SDK method for the document type
        // Frontend preview requests intentionally avoid locale/language overrides.
        // Backend/entity defaults drive document formatting and default output language.
        const renderParams: Record<string, any> = { partial: "true" as const, template };
        if (qrOverrides?.upn_qr_enabled !== undefined) {
          renderParams.upn_qr_enabled = qrOverrides.upn_qr_enabled ? "true" : "false";
          if (qrOverrides.upn_qr_display_mode) {
            renderParams.upn_qr_display_mode = qrOverrides.upn_qr_display_mode;
          }
        }
        if (qrOverrides?.epc_qr_enabled !== undefined) {
          renderParams.epc_qr_enabled = qrOverrides.epc_qr_enabled ? "true" : "false";
        }
        if (qrOverrides?.hub3_qr_enabled !== undefined) {
          renderParams.hub3_qr_enabled = qrOverrides.hub3_qr_enabled ? "true" : "false";
          if (qrOverrides.hub3_qr_purpose_code) {
            renderParams.hub3_qr_purpose_code = qrOverrides.hub3_qr_purpose_code;
          }
          if (qrOverrides.hub3_qr_reference_model) {
            renderParams.hub3_qr_reference_model = qrOverrides.hub3_qr_reference_model;
          }
        }
        const requestOpts = { entity_id: activeEntityId, signal: abortController.signal };
        let html: string;
        switch (documentType) {
          case "estimate":
            html = await estimates.renderEstimatePreview(request.data as any, renderParams, requestOpts);
            break;
          case "credit_note":
            html = await creditNotes.renderCreditNotePreview(request.data as any, renderParams, requestOpts);
            break;
          case "advance_invoice":
            html = await advanceInvoices.renderAdvanceInvoicePreview(request.data as any, renderParams, requestOpts);
            break;
          case "delivery_note":
            html = await deliveryNotes.renderDeliveryNotePreview(request.data as any, renderParams, requestOpts);
            break;
          default:
            html = await invoices.renderInvoicePreview(request.data as any, renderParams, requestOpts);
            break;
        }

        setPreviewHtml(html);
        setError(null);
        emitLivePreviewDebug({
          stage: "request_succeeded",
          documentType,
          itemCount: request.itemCount,
          elapsedMs: Number((performance.now() - startedAt).toFixed(1)),
        });
      } catch (err) {
        // Ignore abort errors (they're expected when user keeps typing)
        if (err instanceof Error && err.name === "AbortError") {
          if (didTimeout) {
            if (abortControllerRef.current !== abortController) {
              return;
            }
            const message = t("Preview request timed out");
            setError(message);
            setPreviewHtml("");
            lastRequestKeyRef.current = null;
            emitLivePreviewDebug({
              stage: "request_timeout",
              documentType,
              timeoutMs: LIVE_PREVIEW_REQUEST_TIMEOUT_MS,
            });
            return;
          }
          emitLivePreviewDebug({
            stage: "request_aborted",
            documentType,
          });
          return;
        }

        // Ignore 422 validation errors - expected while user is still filling the form
        if (err instanceof Error && "status" in err && (err as any).status === 422) {
          emitLivePreviewDebug({
            stage: "request_validation_error",
            documentType,
            status: 422,
          });
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to generate preview");
        setPreviewHtml("");
        lastRequestKeyRef.current = null;
        emitLivePreviewDebug({
          stage: "request_failed",
          documentType,
          message: err instanceof Error ? err.message : "Failed to generate preview",
        });
      } finally {
        clearTimeout(timeoutId);
        // Only the latest request owns the loading state. Older requests may
        // finish after being aborted by a newer preview request.
        if (abortControllerRef.current === abortController) {
          setIsLoading(false);
          abortControllerRef.current = null;
          inFlightRequestKeyRef.current = null;
        }
      }
    },
    [
      activeEntityId,
      template,
      documentType,
      qrOverrides?.upn_qr_enabled,
      qrOverrides?.upn_qr_display_mode,
      qrOverrides?.epc_qr_enabled,
      qrOverrides?.hub3_qr_enabled,
      qrOverrides?.hub3_qr_purpose_code,
      qrOverrides?.hub3_qr_reference_model,
      t,
    ],
  );

  /**
   * Debounced preview fetch
   * Waits briefly after user stops typing before fetching
   */
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const currentPreviewRequest = latestPreviewRequestRef.current;

    if (!currentPreviewRequest) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setPreviewHtml("");
      lastRequestKeyRef.current = null;
      inFlightRequestKeyRef.current = null;
      setIsRefreshPending(false);
      setIsLoading(false);
      emitLivePreviewDebug({
        stage: "skipped",
        reason: "no_items",
        documentType,
        itemCount: 0,
      });
      return;
    }

    if (lastRequestKeyRef.current === currentPreviewRequest.key) {
      setIsRefreshPending(false);
      return;
    }

    const shouldFetchImmediately =
      eagerFirstPreview && !hasDispatchedFirstPreviewRef.current && previewRequestKey !== null;

    if (shouldFetchImmediately) {
      setIsRefreshPending(false);
      hasDispatchedFirstPreviewRef.current = true;
      fetchPreview(currentPreviewRequest);
    } else {
      setIsRefreshPending(true);
      // Set new timeout
      debounceTimeoutRef.current = setTimeout(() => {
        const latestPreviewRequest = latestPreviewRequestRef.current;
        if (!latestPreviewRequest) return;
        setIsRefreshPending(false);
        hasDispatchedFirstPreviewRef.current = true;
        fetchPreview(latestPreviewRequest);
      }, LIVE_PREVIEW_DEBOUNCE_MS);
    }

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [documentType, eagerFirstPreview, fetchPreview, previewRequestKey]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      lastRequestKeyRef.current = null;
      inFlightRequestKeyRef.current = null;
    };
  }, []);

  const showSkeleton = (!previewHtml && !error) || (isLoading && !previewHtml);
  const showRefreshBadge = !!previewHtml && (isRefreshPending || isLoading);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      data-testid="live-preview"
      data-demo="marketing-demo-live-preview"
    >
      {/* Error state */}
      {error && !isLoading && (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
          <div className="text-center">
            <p className="font-semibold text-destructive">{t("Preview Error")}</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Skeleton: shown on initial load and when loading without existing preview */}
      {showSkeleton && <DocumentPreviewSkeleton />}

      {/* Preview - Scoped HTML injection with A4 scaling */}
      {previewHtml && !error && (
        <div className="relative">
          {showRefreshBadge && (
            <div className="absolute top-4 right-4 z-20">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-muted-foreground text-xs shadow-sm">
                <Loader2 className={cn("size-3.5", (isRefreshPending || isLoading) && "animate-spin")} />
                <span>{isLoading ? t("Updating preview...") : t("Refreshing preview...")}</span>
              </div>
            </div>
          )}
          {isLoading && <div className="absolute inset-0 z-10 rounded-lg bg-background/35 backdrop-blur-[1.5px]" />}
          <div
            className={cn(isLoading && "opacity-75 transition-opacity duration-200")}
            data-demo="marketing-demo-totals-root"
          >
            <ScaledDocumentPreview htmlContent={previewHtml} scale={scale} A4_WIDTH_PX={A4_WIDTH_PX} />
          </div>
        </div>
      )}
    </div>
  );
}
