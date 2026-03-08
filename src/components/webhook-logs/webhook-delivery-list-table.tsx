"use client";

import { formatDistanceToNow } from "date-fns";
import { useCallback, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/ui/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { AUTH_COOKIES } from "@/ui/lib/auth";
import { getCookie } from "@/ui/lib/browser-cookies";
import { getClientHeaders } from "@/ui/lib/client-headers";
import { getDateFnsLocale } from "@/ui/lib/date-fns-locale";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { DataTable } from "../table/data-table";
import { withTableTranslations } from "../table/locales";
import type { Column, FilterConfig, ListTableProps, TableQueryParams, TableQueryResponse } from "../table/types";
import translations from "./locales";
import { WebhookDeliveryDetail } from "./webhook-delivery-detail";

export interface WebhookDeliveryResponse {
  id: string;
  webhook_id: string;
  entity_id: string;
  event_type: string;
  status: string;
  request_body: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  attempt: number;
  max_attempts: number;
  next_retry_at: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
  webhook_url: string | null;
}

const getApiBaseUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_API_URL || import.meta.env.BUN_PUBLIC_API_URL || "";
  }
  return "";
};

export const WEBHOOK_LOGS_CACHE_KEY = "webhook-logs";
const mergedTranslations = withTableTranslations(translations);

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-500",
  failed: "bg-red-500",
  pending: "bg-yellow-500",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
};

function StatusDot({ status }: { status: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", STATUS_COLORS[status] || "bg-gray-400")} />;
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-medium text-xs capitalize",
        STATUS_BADGE_COLORS[status] || "bg-gray-100 text-gray-700",
      )}
    >
      {t(status)}
    </span>
  );
}

type WebhookDeliveryListTableProps = ListTableProps<WebhookDeliveryResponse> & {
  environment?: "live" | "sandbox";
  showEntityColumn?: boolean;
  selectedDelivery?: WebhookDeliveryResponse | null;
  onSelectDelivery?: (delivery: WebhookDeliveryResponse | null) => void;
  /** Translation function */
  t?: (key: string) => string;
  /** Locale used for relative date formatting */
  locale?: string;
};

export function WebhookDeliveryListTable({
  queryParams,
  onChangeParams,
  entityId,
  environment,
  showEntityColumn = false,
  selectedDelivery,
  onSelectDelivery,
  t = (key) => key,
  locale,
}: WebhookDeliveryListTableProps) {
  const translate = createTranslation({ t, locale, translations: mergedTranslations });

  const handleFetch = useCallback(
    async (params: TableQueryParams): Promise<TableQueryResponse<WebhookDeliveryResponse>> => {
      const token = getCookie(AUTH_COOKIES.TOKEN);
      if (!token) throw new Error("Not authenticated");

      const queryParamsUrl = new URLSearchParams();

      if (entityId) {
        queryParamsUrl.set("entity_id", entityId);
      } else {
        queryParamsUrl.set("environment", environment || "live");
      }

      if (params.limit) queryParamsUrl.set("limit", String(params.limit));
      if (params.next_cursor) queryParamsUrl.set("next_cursor", params.next_cursor);
      if (params.prev_cursor) queryParamsUrl.set("prev_cursor", params.prev_cursor);

      // Search maps to event_type filter
      if (params.search) queryParamsUrl.set("event_type", params.search);

      // Status filter (reuse http_status field for webhook status)
      if (params.filter_http_status) queryParamsUrl.set("status", params.filter_http_status);

      // Date filters
      if (params.filter_date_from) queryParamsUrl.set("date_from", params.filter_date_from);
      if (params.filter_date_to) queryParamsUrl.set("date_to", params.filter_date_to);

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/webhook-logs?${queryParamsUrl.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...getClientHeaders("ui"),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch webhook logs: ${response.status}`);
      }

      return (await response.json()) as TableQueryResponse<WebhookDeliveryResponse>;
    },
    [entityId, environment],
  );

  const columns: Column<WebhookDeliveryResponse>[] = useMemo(() => {
    const dateLocale = getDateFnsLocale(locale);
    const cols: Column<WebhookDeliveryResponse>[] = [
      {
        id: "status_dot",
        header: "",
        className: "w-8",
        cell: (d) => <StatusDot status={d.status} />,
      },
      {
        id: "status",
        header: translate("Status"),
        className: "w-24",
        cell: (d) => <StatusBadge status={d.status} t={translate} />,
      },
      {
        id: "event_type",
        header: translate("Event"),
        cell: (d) => <span className="truncate font-mono text-sm">{d.event_type}</span>,
      },
      {
        id: "webhook_url",
        header: translate("URL"),
        className: "hidden md:table-cell",
        cell: (d) => (
          <span className="truncate text-muted-foreground text-sm" title={d.webhook_url ?? undefined}>
            {d.webhook_url ? truncateUrl(d.webhook_url) : "—"}
          </span>
        ),
      },
    ];

    if (showEntityColumn) {
      cols.push({
        id: "entity_id",
        header: translate("Entity"),
        className: "hidden lg:table-cell",
        cell: (d) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="cursor-pointer rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs hover:bg-muted/80"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(d.entity_id);
                }}
              >
                {d.entity_id}
              </button>
            </TooltipTrigger>
            <TooltipContent>{translate("Copy")}</TooltipContent>
          </Tooltip>
        ),
      });
    }

    cols.push(
      {
        id: "duration_ms",
        header: translate("Duration"),
        className: "hidden sm:table-cell w-20",
        align: "right",
        cell: (d) => (
          <span className="text-muted-foreground text-xs">{d.duration_ms != null ? `${d.duration_ms}ms` : "—"}</span>
        ),
      },
      {
        id: "created_at",
        header: translate("Time"),
        align: "right",
        cell: (d) => (
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: dateLocale })}
          </span>
        ),
      },
    );

    return cols;
  }, [locale, showEntityColumn, translate]);

  const filterConfig: FilterConfig = {
    dateFields: [{ id: "created_at", label: translate("Date") }],
  };

  const cacheKey = entityId
    ? `${WEBHOOK_LOGS_CACHE_KEY}-${entityId}`
    : `${WEBHOOK_LOGS_CACHE_KEY}-account-${environment || "live"}`;

  return (
    <>
      <DataTable
        columns={columns}
        cacheKey={cacheKey}
        resourceName="webhook delivery"
        onFetch={handleFetch}
        queryParams={queryParams}
        onChangeParams={onChangeParams}
        entityId={entityId}
        filterConfig={filterConfig}
        onRowClick={(d) => onSelectDelivery?.(d)}
        t={translate}
      />

      <Sheet open={!!selectedDelivery} onOpenChange={(open) => !open && onSelectDelivery?.(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedDelivery && (
                <>
                  <StatusBadge status={selectedDelivery.status} t={translate} />
                  <span className="font-mono text-sm">{selectedDelivery.event_type}</span>
                </>
              )}
            </SheetTitle>
          </SheetHeader>
          {selectedDelivery && <WebhookDeliveryDetail delivery={selectedDelivery} t={translate} locale={locale} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function truncateUrl(url: string, maxLength = 40): string {
  try {
    const parsed = new URL(url);
    const display = parsed.hostname + parsed.pathname;
    return display.length > maxLength ? `${display.slice(0, maxLength)}…` : display;
  } catch {
    return url.length > maxLength ? `${url.slice(0, maxLength)}…` : url;
  }
}
