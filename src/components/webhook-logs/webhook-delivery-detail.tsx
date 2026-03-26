"use client";

import { format, formatDistanceToNow } from "date-fns";
import { AlertCircle, Check, Copy } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { getDateFnsLocale } from "@/ui/lib/date-fns-locale";
import { cn } from "../../lib/utils";
import type { WebhookDeliveryResponse } from "./webhook-delivery-list-table";

type TranslationFn = (key: string) => string;

const defaultT: TranslationFn = (key) => key;

export interface WebhookDeliveryDetailProps {
  delivery: WebhookDeliveryResponse;
  t?: TranslationFn;
  /** Locale used for relative date formatting */
  locale?: string;
}

function JsonViewer({ data, noDataLabel, t }: { data: unknown; noDataLabel: string; t: TranslationFn }) {
  const [copied, setCopied] = useState(false);
  const jsonString = data ? JSON.stringify(data, null, 2) : null;

  const handleCopy = async () => {
    if (jsonString) {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!data || (typeof data === "object" && Object.keys(data as Record<string, unknown>).length === 0)) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-center text-muted-foreground text-sm">
        {t(noDataLabel)}
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
        title={t("Copy to clipboard")}
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
  const tokens: { key: string; type: string; value: string }[] = [];
  const lines = json.split("\n");
  let tokenKey = 0;

  const pushToken = (type: string, value: string) => {
    tokens.push({ key: `${type}:${tokenKey}`, type, value });
    tokenKey += 1;
  };

  for (const line of lines) {
    const keyMatch = line.match(/^(\s*)"([^"]+)":/);
    if (keyMatch) {
      const [, indent, key] = keyMatch;
      const rest = line.slice(keyMatch[0].length);
      pushToken("indent", indent);
      pushToken("key", `"${key}"`);
      pushToken("punctuation", ":");

      const valueMatch = rest.match(/^\s*(.+?)(,?)$/);
      if (valueMatch) {
        const [, value, comma] = valueMatch;
        pushToken("space", " ");
        if (value.startsWith('"')) {
          pushToken("string", value.replace(/,$/, ""));
        } else if (value === "true" || value === "false") {
          pushToken("boolean", value);
        } else if (value === "null") {
          pushToken("null", value);
        } else if (!Number.isNaN(Number(value.replace(/,$/, "")))) {
          pushToken("number", value.replace(/,$/, ""));
        } else {
          pushToken("other", value.replace(/,$/, ""));
        }
        if (comma) pushToken("punctuation", comma);
      }
    } else {
      pushToken("other", line);
    }
    pushToken("newline", "\n");
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
      {tokens.map((token) => (
        <span key={token.key} className={colorMap[token.type] || ""}>
          {token.value}
        </span>
      ))}
    </code>
  );
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  success: {
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900",
  },
  failed: {
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900",
  },
  pending: {
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900",
  },
};

export function WebhookDeliveryDetail({ delivery, t = defaultT, locale }: WebhookDeliveryDetailProps) {
  const createdAt = new Date(delivery.created_at);
  const dateLocale = getDateFnsLocale(locale);
  const styles = STATUS_STYLES[delivery.status] ?? {
    color: "text-gray-500",
    bg: "bg-gray-100 dark:bg-gray-800",
  };

  return (
    <div className="space-y-6 p-4 pt-6">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4">
        <span className={cn("rounded-md px-2.5 py-1 font-medium text-sm capitalize", styles.bg, styles.color)}>
          {t(delivery.status)}
        </span>
        <div className="text-muted-foreground text-sm">
          <time dateTime={delivery.created_at} title={format(createdAt, "PPpp")}>
            {formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocale })}
          </time>
          <span className="mx-2">•</span>
          <span>{format(createdAt, "PPpp")}</span>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">{t("Event")}:</span>{" "}
          <span className="font-medium">{delivery.event_type}</span>
        </div>
        {delivery.webhook_url && (
          <div>
            <span className="text-muted-foreground">{t("URL")}:</span>{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{delivery.webhook_url}</code>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{t("Attempt")}:</span>{" "}
          <span className="font-medium">
            {delivery.attempt}/{delivery.max_attempts}
          </span>
        </div>
        {delivery.duration_ms != null && (
          <div>
            <span className="text-muted-foreground">{t("Duration")}:</span>{" "}
            <span className="font-medium">{delivery.duration_ms}ms</span>
          </div>
        )}
        {delivery.response_status != null && (
          <div>
            <span className="text-muted-foreground">{t("Response")}:</span>{" "}
            <span className="font-medium">{delivery.response_status}</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {delivery.error_message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{delivery.error_message}</AlertDescription>
        </Alert>
      )}

      {/* Tabs for Request Body / Response */}
      <Tabs defaultValue="request" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="request">{t("Request body")}</TabsTrigger>
          <TabsTrigger value="response">{t("Response")}</TabsTrigger>
        </TabsList>
        <TabsContent value="request" className="mt-4">
          <JsonViewer data={delivery.request_body} noDataLabel="No request body data" t={t} />
        </TabsContent>
        <TabsContent value="response" className="mt-4">
          {delivery.response_body ? (
            <div className="space-y-2">
              {delivery.response_status != null && (
                <div className="text-muted-foreground text-sm">
                  {t("Status")}: <span className="font-medium font-mono">{delivery.response_status}</span>
                </div>
              )}
              <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-4 font-mono text-sm">
                {delivery.response_body}
              </pre>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-center text-muted-foreground text-sm">
              {t("No response data")}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delivery ID */}
      <DeliveryIdDisplay deliveryId={delivery.id} t={t} />
    </div>
  );
}

function DeliveryIdDisplay({ deliveryId, t }: { deliveryId: string; t: TranslationFn }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(deliveryId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 border-t pt-4 text-muted-foreground text-xs">
      <span>{t("Delivery ID")}:</span>
      <code className="font-mono">{deliveryId}</code>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy} title={t("Copy to clipboard")}>
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}
