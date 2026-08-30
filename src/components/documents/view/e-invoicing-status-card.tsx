import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Send, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/ui/components/ui/alert";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

export type EInvoicingDocumentStatus = "not_sent" | "pending" | "submitted" | "delivered" | "failed" | "rejected";

type EInvoicingStatusCardProps = ComponentTranslationProps & {
  status: EInvoicingDocumentStatus;
  mode?: "invoice_delivery" | "transaction_reporting";
  detail?: string | null;
  actionError?: string | null;
  onSend?: () => void;
  onRetry?: () => void;
  onEdit?: () => void;
  isBusy?: boolean;
};

const translations = {
  en: {
    "French e-invoice delivery": "French e-invoice delivery",
    "French e-reporting": "French e-reporting",
    "Not sent": "Not sent",
    Pending: "Pending",
    Submitted: "Submitted",
    Delivered: "Delivered",
    Failed: "Failed",
    Rejected: "Rejected",
    "This invoice has not been sent electronically.": "This invoice has not been sent electronically.",
    "This transaction has not been reported electronically.": "This transaction has not been reported electronically.",
    "The provider outcome is pending. Do not resend until reconciliation finishes.":
      "The provider outcome is pending. Do not resend until reconciliation finishes.",
    "The provider accepted the e-invoice for delivery.": "The provider accepted the e-invoice for delivery.",
    "The provider accepted the compliance report.": "The provider accepted the compliance report.",
    "The electronic invoice was delivered.": "The electronic invoice was delivered.",
    "Retry the confirmed failed attempt. If validation still fails, edit the document first.":
      "Retry the confirmed failed attempt. If validation still fails, edit the document first.",
    "The document was rejected. Update it before sending again.":
      "The document was rejected. Update it before sending again.",
    "Send electronically": "Send electronically",
    Retry: "Retry",
    "Edit document": "Edit document",
  },
} as const;

export function EInvoicingStatusCard({
  status,
  mode = "invoice_delivery",
  detail,
  actionError,
  onSend,
  onRetry,
  onEdit,
  isBusy,
  ...i18nProps
}: EInvoicingStatusCardProps) {
  const t = createTranslation({ ...i18nProps, translations });
  const isReporting = mode === "transaction_reporting";
  const label = status === "not_sent" ? "Not sent" : `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  const description =
    status === "not_sent"
      ? isReporting
        ? "This transaction has not been reported electronically."
        : "This invoice has not been sent electronically."
      : status === "pending"
        ? "The provider outcome is pending. Do not resend until reconciliation finishes."
        : status === "submitted"
          ? isReporting
            ? "The provider accepted the compliance report."
            : "The provider accepted the e-invoice for delivery."
          : status === "delivered"
            ? "The electronic invoice was delivered."
            : status === "failed"
              ? "Retry the confirmed failed attempt. If validation still fails, edit the document first."
              : "The document was rejected. Update it before sending again.";
  const toneClass =
    status === "delivered" || status === "submitted"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      : status === "failed" || status === "rejected"
        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";

  return (
    <div className="space-y-3" data-testid="french-e-invoicing-status-card">
      <div className="flex items-center justify-between gap-2 font-medium text-sm">
        <span>{t(isReporting ? "French e-reporting" : "French e-invoice delivery")}</span>
        <Badge className={toneClass} data-status={status}>
          {status === "delivered" || status === "submitted" ? (
            <CheckCircle2 className="mr-1 h-3 w-3" />
          ) : status === "failed" || status === "rejected" ? (
            <XCircle className="mr-1 h-3 w-3" />
          ) : (
            <Clock className="mr-1 h-3 w-3" />
          )}
          {t(label)}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">{t(description)}</p>
      {detail ? <p className="break-words text-muted-foreground text-xs">{detail}</p> : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status === "not_sent" && onSend ? (
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onSend}>
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {t("Send electronically")}
          </Button>
        ) : null}
        {status === "failed" && onRetry ? (
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onRetry}>
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {t("Retry")}
          </Button>
        ) : null}
        {(status === "failed" || status === "rejected" || actionError) && onEdit ? (
          <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={onEdit}>
            {t("Edit document")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
