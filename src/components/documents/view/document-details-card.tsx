import type { AdvanceInvoice, CreditNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { Badge } from "@/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Separator } from "@/ui/components/ui/separator";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";

const translations = { sl, de, it, fr, es, pt, nl, pl, hr } as const;

// Document type union
type Document = Invoice | Estimate | CreditNote | AdvanceInvoice;
type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice";

interface DocumentDetailsCardProps extends ComponentTranslationProps {
  document: Document;
  documentType: DocumentType;
  /** Locale for date formatting */
  locale?: string;
}

/**
 * Format currency value
 */
function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(date: Date | string | null | undefined, locale: string): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Get payment status for invoice/advance invoice
 */
function getPaymentStatus(
  document: Invoice | AdvanceInvoice,
  t: (key: string) => string,
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  // Check voided_at - ensure it's a valid date, not just truthy
  if (document.voided_at && new Date(document.voided_at).getTime() > 0) {
    return { label: t("Voided"), variant: "secondary" };
  }
  if (document.paid_in_full) {
    return { label: t("Paid in full"), variant: "default" };
  }
  if (document.total_paid > 0) {
    return { label: t("Partially paid"), variant: "outline" };
  }
  return { label: t("Unpaid"), variant: "destructive" };
}

/**
 * Document Details Card Component
 *
 * Displays document metadata including:
 * - Document number and dates
 * - Customer information
 * - Totals breakdown
 * - Payment status (for invoices/advance invoices)
 */
export function DocumentDetailsCard({ document, documentType, locale = "en", ...i18nProps }: DocumentDetailsCardProps) {
  const t = createTranslation({ translations, locale, ...i18nProps });

  const currencyCode = document.currency_code;
  const fmt = (amount: number) => formatCurrency(amount, currencyCode, locale);
  const fmtDate = (date: Date | string | null | undefined) => formatDate(date, locale);

  // Type guards for document-specific fields
  const isInvoiceOrAdvance = documentType === "invoice" || documentType === "advance_invoice";
  const isEstimate = documentType === "estimate";
  const invoiceDoc = document as Invoice | AdvanceInvoice;
  const estimateDoc = document as Estimate;

  // Get customer name
  const customerName = document.customer?.name || "-";

  // Calculate tax total
  const taxTotal = document.total_with_tax - document.total;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          {t("Details")}
          {isInvoiceOrAdvance && (
            <Badge variant={getPaymentStatus(invoiceDoc, t).variant}>{getPaymentStatus(invoiceDoc, t).label}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="text-muted-foreground">{t("Number")}</div>
          <div className="text-right font-medium">{document.number}</div>

          <div className="text-muted-foreground">{t("Date")}</div>
          <div className="text-right">{fmtDate(document.date)}</div>

          {isInvoiceOrAdvance && (
            <>
              <div className="text-muted-foreground">{t("Due date")}</div>
              <div className="text-right">{fmtDate(invoiceDoc.date_due)}</div>
            </>
          )}

          {isInvoiceOrAdvance && (invoiceDoc as any).date_service && (
            <>
              <div className="text-muted-foreground">
                {(invoiceDoc as any).date_service_to ? t("Service period") : t("Service date")}
              </div>
              <div className="text-right">
                {(invoiceDoc as any).date_service_to
                  ? `${fmtDate((invoiceDoc as any).date_service)} - ${fmtDate((invoiceDoc as any).date_service_to)}`
                  : fmtDate((invoiceDoc as any).date_service)}
              </div>
            </>
          )}

          {isEstimate && estimateDoc.date_valid_till && (
            <>
              <div className="text-muted-foreground">{t("Valid until")}</div>
              <div className="text-right">{fmtDate(estimateDoc.date_valid_till)}</div>
            </>
          )}

          <div className="text-muted-foreground">{t("Customer")}</div>
          <div className="text-right">{customerName}</div>
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("Subtotal")}</span>
            <span>{fmt(document.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("Tax")}</span>
            <span>{fmt(taxTotal)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>{t("Total")}</span>
            <span>{fmt(document.total_with_tax)}</span>
          </div>

          {/* Payment info for invoices/advance invoices */}
          {isInvoiceOrAdvance && invoiceDoc.total_paid > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-green-600">
                <span>{t("Paid")}</span>
                <span>-{fmt(invoiceDoc.total_paid)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{t("Due")}</span>
                <span>{fmt(invoiceDoc.total_due)}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
