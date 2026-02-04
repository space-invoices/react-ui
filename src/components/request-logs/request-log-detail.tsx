"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { cn } from "../../lib/utils";
import type { RequestLogResponse } from "./request-log-list-table";

type TranslationFn = (key: string, fallback: string) => string;

const defaultT: TranslationFn = (_key, fallback) => fallback;

export interface RequestLogDetailProps {
  log: RequestLogResponse;
  /** Translation function - defaults to returning fallback */
  t?: TranslationFn;
}

/**
 * Try to unwrap response data that may be wrapped as { text: "json string" }
 */
function unwrapResponseData(data: unknown): unknown {
  if (
    data &&
    typeof data === "object" &&
    "text" in data &&
    Object.keys(data).length === 1 &&
    typeof (data as { text: unknown }).text === "string"
  ) {
    try {
      return JSON.parse((data as { text: string }).text);
    } catch {
      // Not valid JSON, return original
      return data;
    }
  }
  return data;
}

function JsonViewer({ data, label }: { data: unknown; label: string }) {
  const [copied, setCopied] = useState(false);
  // Unwrap { text: "json" } format if present
  const unwrappedData = unwrapResponseData(data);
  const jsonString = unwrappedData ? JSON.stringify(unwrappedData, null, 2) : null;

  const handleCopy = async () => {
    if (jsonString) {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (
    !unwrappedData ||
    (typeof unwrappedData === "object" && Object.keys(unwrappedData as Record<string, unknown>).length === 0)
  ) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-center text-muted-foreground text-sm">
        No {label.toLowerCase()} data
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-8 w-8 p-0"
        onClick={handleCopy}
        title="Copy to clipboard"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-4 font-mono text-sm">
        <JsonHighlight json={jsonString ?? ""} />
      </pre>
    </div>
  );
}

function JsonHighlight({ json }: { json: string }) {
  // Parse JSON into tokens for safe rendering
  const tokens: { type: string; value: string }[] = [];
  const lines = json.split("\n");

  for (const line of lines) {
    // Match key-value patterns
    const keyMatch = line.match(/^(\s*)"([^"]+)":/);
    if (keyMatch) {
      const [, indent, key] = keyMatch;
      const rest = line.slice(keyMatch[0].length);
      tokens.push({ type: "indent", value: indent });
      tokens.push({ type: "key", value: `"${key}"` });
      tokens.push({ type: "punctuation", value: ":" });

      // Parse value
      const valueMatch = rest.match(/^\s*(.+?)(,?)$/);
      if (valueMatch) {
        const [, value, comma] = valueMatch;
        tokens.push({ type: "space", value: " " });
        if (value.startsWith('"')) {
          tokens.push({ type: "string", value: value.replace(/,$/, "") });
        } else if (value === "true" || value === "false") {
          tokens.push({ type: "boolean", value });
        } else if (value === "null") {
          tokens.push({ type: "null", value });
        } else if (!Number.isNaN(Number(value.replace(/,$/, "")))) {
          tokens.push({ type: "number", value: value.replace(/,$/, "") });
        } else {
          tokens.push({ type: "other", value: value.replace(/,$/, "") });
        }
        if (comma) tokens.push({ type: "punctuation", value: comma });
      }
    } else {
      tokens.push({ type: "other", value: line });
    }
    tokens.push({ type: "newline", value: "\n" });
  }

  const colorMap: Record<string, string> = {
    key: "text-blue-600 dark:text-blue-400",
    string: "text-green-600 dark:text-green-400",
    number: "text-orange-600 dark:text-orange-400",
    boolean: "text-purple-600 dark:text-purple-400",
    null: "text-gray-500",
  };

  return (
    <code>
      {tokens.map((token, i) => (
        <span key={`${i}-${token.type}`} className={colorMap[token.type] || ""}>
          {token.value}
        </span>
      ))}
    </code>
  );
}

export function RequestLogDetail({ log, t = defaultT }: RequestLogDetailProps) {
  const createdAt = new Date(log.created_at);
  const statusCode = log.res_status ? Number.parseInt(log.res_status, 10) : 0;

  let statusColor = "text-gray-500";
  let statusBg = "bg-gray-100 dark:bg-gray-800";
  if (statusCode >= 200 && statusCode < 300) {
    statusColor = "text-green-700 dark:text-green-400";
    statusBg = "bg-green-100 dark:bg-green-900";
  } else if (statusCode >= 400 && statusCode < 500) {
    statusColor = "text-yellow-700 dark:text-yellow-400";
    statusBg = "bg-yellow-100 dark:bg-yellow-900";
  } else if (statusCode >= 500) {
    statusColor = "text-red-700 dark:text-red-400";
    statusBg = "bg-red-100 dark:bg-red-900";
  }

  return (
    <div className="space-y-6 p-4 pt-6">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4">
        <span className={cn("rounded-md px-2.5 py-1 font-medium font-mono text-sm", statusBg, statusColor)}>
          {log.res_status || "—"}
        </span>
        <div className="text-muted-foreground text-sm">
          <time dateTime={log.created_at} title={format(createdAt, "PPpp")}>
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </time>
          <span className="mx-2">•</span>
          <span>{format(createdAt, "PPpp")}</span>
        </div>
      </div>

      {/* Metadata */}
      {(log.resource_type || log.resource_id || log.action) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {log.resource_type && (
            <div>
              <span className="text-muted-foreground">{t("request-logs.detail.resource-type", "Resource")}:</span>{" "}
              <span className="font-medium">{log.resource_type}</span>
            </div>
          )}
          {log.resource_id && (
            <div>
              <span className="text-muted-foreground">{t("request-logs.detail.resource-id", "ID")}:</span>{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{log.resource_id}</code>
            </div>
          )}
          {log.action && (
            <div>
              <span className="text-muted-foreground">{t("request-logs.detail.action", "Action")}:</span>{" "}
              <span className="font-medium">{log.action}</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs for Request/Response/Headers */}
      <Tabs defaultValue="request" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="request">{t("request-logs.detail.request", "Request")}</TabsTrigger>
          <TabsTrigger value="response">{t("request-logs.detail.response", "Response")}</TabsTrigger>
          <TabsTrigger value="headers">{t("request-logs.detail.headers", "Headers")}</TabsTrigger>
        </TabsList>
        <TabsContent value="request" className="mt-4">
          <JsonViewer data={log.req_body} label="Request body" />
        </TabsContent>
        <TabsContent value="response" className="mt-4">
          <JsonViewer data={log.res_body} label="Response body" />
        </TabsContent>
        <TabsContent value="headers" className="mt-4">
          <JsonViewer data={log.headers} label="Headers" />
        </TabsContent>
      </Tabs>

      {/* Request ID */}
      <RequestIdDisplay requestId={log.request_id} t={t} />
    </div>
  );
}

function RequestIdDisplay({ requestId, t }: { requestId: string; t: (key: string, fallback: string) => string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(requestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 border-t pt-4 text-muted-foreground text-xs">
      <span>{t("request-logs.detail.request-id", "Request ID")}:</span>
      <code className="font-mono">{requestId}</code>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy} title="Copy to clipboard">
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}
