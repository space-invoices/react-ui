"use client";

// Re-export from the new list table component
// Legacy component alias - deprecated, use RequestLogListTable instead
export {
  REQUEST_LOGS_CACHE_KEY,
  RequestLogListTable,
  RequestLogListTable as RequestLogsPage,
  type RequestLogResponse,
} from "./request-log-list-table";
