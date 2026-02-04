"use client";

import { formatDistanceToNow } from "date-fns";
import { useCallback, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/ui/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { AUTH_COOKIES } from "@/ui/lib/auth";
import { getCookie } from "@/ui/lib/browser-cookies";
import { cn } from "@/ui/lib/utils";
import { DataTable } from "../table/data-table";
import type { Column, FilterConfig, ListTableProps, TableQueryParams, TableQueryResponse } from "../table/types";
import { RequestLogDetail } from "./request-log-detail";

// Request log response type (internal endpoint, not in SDK)
export interface RequestLogResponse {
  id: string;
  entity_id: string;
  request_id: string;
  method: string;
  path: string;
  res_status: string | null;
  resource_type: string | null;
  resource_id: string | null;
  action: string | null;
  req_body: Record<string, unknown> | null;
  res_body: Record<string, unknown> | null;
  headers: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Get API base URL from environment
const getApiBaseUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_API_URL || import.meta.env.BUN_PUBLIC_API_URL || "";
  }
  return "";
};

export const REQUEST_LOGS_CACHE_KEY = "request-logs";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  POST: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  PATCH: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  PUT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

function StatusDot({ status }: { status: string | null }) {
  const statusCode = status ? Number.parseInt(status, 10) : 0;
  let color = "bg-gray-400";
  if (statusCode >= 200 && statusCode < 300) {
    color = "bg-green-500";
  } else if (statusCode >= 400 && statusCode < 500) {
    color = "bg-yellow-500";
  } else if (statusCode >= 500) {
    color = "bg-red-500";
  }
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color)} />;
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-medium font-mono text-xs",
        METHOD_COLORS[method] || "bg-gray-100 text-gray-700",
      )}
    >
      {method}
    </span>
  );
}

type RequestLogListTableProps = ListTableProps<RequestLogResponse> & {
  /** Environment filter for account-level queries */
  environment?: "live" | "sandbox";
  /** Show entity column (for account-level view) */
  showEntityColumn?: boolean;
  /** Selected log for detail panel */
  selectedLog?: RequestLogResponse | null;
  /** Callback when a log is selected */
  onSelectLog?: (log: RequestLogResponse | null) => void;
};

export function RequestLogListTable({
  queryParams,
  onChangeParams,
  entityId,
  environment,
  showEntityColumn = false,
  selectedLog,
  onSelectLog,
}: RequestLogListTableProps) {
  // Custom fetch function that handles both entity-scoped and account-scoped queries
  // Don't use useTableFetch since we need special handling for environment
  const handleFetch = useCallback(
    async (params: TableQueryParams): Promise<TableQueryResponse<RequestLogResponse>> => {
      const token = getCookie(AUTH_COOKIES.TOKEN);
      if (!token) throw new Error("Not authenticated");

      const queryParamsUrl = new URLSearchParams();

      // Entity or environment filter
      // For entity-scoped queries, use entity_id
      // For account-scoped queries, use environment (defaults to "live")
      if (entityId) {
        queryParamsUrl.set("entity_id", entityId);
      } else {
        queryParamsUrl.set("environment", environment || "live");
      }

      // Pagination
      if (params.limit) queryParamsUrl.set("limit", String(params.limit));
      if (params.next_cursor) queryParamsUrl.set("next_cursor", params.next_cursor);
      if (params.prev_cursor) queryParamsUrl.set("prev_cursor", params.prev_cursor);

      // Search maps to path filter
      if (params.search) queryParamsUrl.set("path", params.search);

      // HTTP method filter
      if (params.filter_method) queryParamsUrl.set("method", params.filter_method);

      // HTTP status code filter
      if (params.filter_http_status) queryParamsUrl.set("status", params.filter_http_status);

      // Date filters
      if (params.filter_date_from) queryParamsUrl.set("date_from", params.filter_date_from);
      if (params.filter_date_to) queryParamsUrl.set("date_to", params.filter_date_to);

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/request-logs?${queryParamsUrl.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch request logs: ${response.status}`);
      }

      return (await response.json()) as TableQueryResponse<RequestLogResponse>;
    },
    [entityId, environment],
  );

  const columns: Column<RequestLogResponse>[] = useMemo(() => {
    const cols: Column<RequestLogResponse>[] = [
      {
        id: "status_dot",
        header: "",
        className: "w-8",
        cell: (log) => <StatusDot status={log.res_status} />,
      },
      {
        id: "res_status",
        header: "Status",
        className: "w-16",
        cell: (log) => <span className="font-mono text-muted-foreground text-sm">{log.res_status || "—"}</span>,
      },
      {
        id: "method",
        header: "Method",
        className: "w-20",
        cell: (log) => <MethodBadge method={log.method} />,
      },
      {
        id: "path",
        header: "Path",
        cell: (log) => <span className="truncate font-mono text-sm">{log.path}</span>,
      },
    ];

    if (showEntityColumn) {
      cols.push({
        id: "entity_id",
        header: "Entity",
        className: "hidden md:table-cell",
        cell: (log) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="cursor-pointer rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs hover:bg-muted/80"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(log.entity_id);
                }}
              >
                {log.entity_id}
              </button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
        ),
      });
    } else {
      cols.push({
        id: "resource_id",
        header: "Resource",
        className: "hidden sm:table-cell",
        cell: (log) => <span className="text-muted-foreground text-xs">{log.resource_id || "—"}</span>,
      });
    }

    cols.push({
      id: "created_at",
      header: "Time",
      align: "right",
      sortable: true,
      sortField: "created_at",
      cell: (log) => (
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
        </span>
      ),
    });

    return cols;
  }, [showEntityColumn]);

  const filterConfig: FilterConfig = {
    dateFields: [{ id: "created_at", label: "Date" }],
    httpMethodFilter: true,
    httpStatusCodeFilter: true,
  };

  const cacheKey = entityId
    ? `${REQUEST_LOGS_CACHE_KEY}-${entityId}`
    : `${REQUEST_LOGS_CACHE_KEY}-account-${environment || "live"}`;

  return (
    <>
      <DataTable
        columns={columns}
        cacheKey={cacheKey}
        resourceName="request log"
        onFetch={handleFetch}
        queryParams={queryParams}
        onChangeParams={onChangeParams}
        entityId={entityId}
        filterConfig={filterConfig}
        onRowClick={(log) => onSelectLog?.(log)}
        defaultOrderBy="-created_at"
      />

      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && onSelectLog?.(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedLog && (
                <>
                  <MethodBadge method={selectedLog.method} />
                  <span className="font-mono text-sm">{selectedLog.path}</span>
                </>
              )}
            </SheetTitle>
          </SheetHeader>
          {selectedLog && <RequestLogDetail log={selectedLog} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
