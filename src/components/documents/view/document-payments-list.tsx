import type { Payment } from "@spaceinvoices/js-sdk";
import { payments as paymentsApi } from "@spaceinvoices/js-sdk";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { actionMenuTooltipProps, Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { getPaymentTypeLabel } from "@/ui/lib/payment-display";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { getSavedDocumentPreviewQueryPrefix } from "../shared/document-preview-display";
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

type DocumentType = "invoice" | "credit_note" | "advance_invoice";

interface DocumentPaymentsListProps extends ComponentTranslationProps {
  documentId: string;
  documentType: DocumentType;
  entityId: string;
  currencyCode: string;
  payments?: Payment[];
  /** Locale for formatting */
  locale?: string;
  /** Callback when Add Payment is clicked */
  onAddPayment?: () => void;
  /** Callback when Edit Payment is clicked */
  onEditPayment?: (payment: Payment) => void;
  /** Callback on successful delete */
  onDeleteSuccess?: () => void;
  /** Callback on delete error */
  onDeleteError?: (error: string) => void;
  addDisabledReason?: string;
  editDisabledReason?: string;
  deleteDisabledReason?: string;
  variant?: "card" | "inline";
}

function isAppliedAdvancePayment(payment: Payment): boolean {
  return payment.type === "advance" && !!payment.invoice_id && !!payment.advance_invoice_id;
}

function isAppliedCreditNotePayment(payment: Payment): boolean {
  return payment.type === "credit_note" && !!payment.invoice_id && !!payment.credit_note_id;
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
function formatDate(date: Date | string | null, locale: string): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Document Payments List Component
 *
 * Displays a list of payments for a document with CRUD actions:
 * - View payments with date, amount, type
 * - Add new payment
 * - Edit existing payment
 * - Delete payment with confirmation
 */
export function DocumentPaymentsList({
  documentId,
  documentType,
  entityId,
  currencyCode,
  payments: prefetchedPayments,
  locale = "en",
  onAddPayment,
  onEditPayment,
  onDeleteSuccess,
  onDeleteError,
  addDisabledReason,
  editDisabledReason,
  deleteDisabledReason,
  variant = "card",
  ...i18nProps
}: DocumentPaymentsListProps) {
  const t = createTranslation({ translations, locale, ...i18nProps });
  const queryClient = useQueryClient();

  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Build the filter based on document type
  const getFilter = () => {
    if (documentType === "invoice") {
      return { invoice_id: documentId };
    }
    if (documentType === "advance_invoice") {
      return { advance_invoice_id: documentId };
    }
    if (documentType === "credit_note") {
      return { credit_note_id: documentId };
    }
    return {};
  };

  // Fetch payments for this document
  // SDK list methods return { data: Payment[], pagination: ... }
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["payments", documentType, documentId, entityId],
    queryFn: async () => {
      const response = await paymentsApi.list({
        entity_id: entityId,
        query: JSON.stringify(getFilter()),
        order_by: "-date",
      });

      return response.data;
    },
    enabled: !prefetchedPayments && !!entityId && !!documentId,
    staleTime: 30_000,
    gcTime: 600_000,
    refetchOnWindowFocus: false,
  });

  const payments = (prefetchedPayments ?? paymentsData ?? []).filter((payment) =>
    documentType === "advance_invoice" ? !isAppliedAdvancePayment(payment) : true,
  );

  /**
   * Handle payment deletion
   */
  const handleDelete = async () => {
    if (!paymentToDelete) return;

    setIsDeleting(true);
    try {
      await paymentsApi.delete(paymentToDelete.id, { entity_id: entityId });

      // Invalidate this document's payments and document view
      queryClient.invalidateQueries({ queryKey: ["payments", documentType, documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents", documentType, documentId] });
      queryClient.invalidateQueries({ queryKey: getSavedDocumentPreviewQueryPrefix(documentId) });

      onDeleteSuccess?.();
    } catch (error) {
      console.error("Failed to delete payment:", error);
      onDeleteError?.(t("Delete failed"));
    } finally {
      setIsDeleting(false);
      setPaymentToDelete(null);
    }
  };

  /**
   * Get payment type label
   */
  const getTypeLabel = (type: string): string => {
    return getPaymentTypeLabel(type, t);
  };

  const fmt = (amount: number) => formatCurrency(amount, currencyCode, locale);
  const fmtDate = (date: Date | string | null) => formatDate(date, locale);

  const addPaymentButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={addDisabledReason ? undefined : onAddPayment}
      className="cursor-pointer"
      disabled={!!addDisabledReason}
    >
      <Plus className="mr-1 h-4 w-4" />
      {t("Add payment")}
    </Button>
  );

  const renderDisabledAction = (item: ReactNode, reason?: string, side: "left" | "top" = "left") => {
    if (!reason) return item;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{item}</div>
        </TooltipTrigger>
        <TooltipContent side={side} {...actionMenuTooltipProps}>
          {reason}
        </TooltipContent>
      </Tooltip>
    );
  };

  const headerContent = (
    <div
      className={
        variant === "inline" ? "flex items-center justify-between" : "flex flex-row items-center justify-between"
      }
    >
      <h3
        className={variant === "inline" ? "font-medium text-sm" : "font-semibold text-lg leading-none tracking-tight"}
      >
        {t("Payments")} {payments.length > 0 && `(${payments.length})`}
      </h3>
      {renderDisabledAction(addPaymentButton, addDisabledReason)}
    </div>
  );

  const bodyContent = isLoading ? (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : payments.length === 0 ? (
    <p className="py-4 text-center text-muted-foreground text-sm">{t("No payments")}</p>
  ) : (
    <div className="space-y-2">
      {payments.map((payment) =>
        (() => {
          const appliedAdvance = isAppliedAdvancePayment(payment);
          const appliedCreditNote = isAppliedCreditNotePayment(payment);
          const managedReason = appliedAdvance
            ? t("Applied advance payments are managed automatically.")
            : appliedCreditNote
              ? t("Applied credit note payments are managed automatically.")
              : undefined;
          const paymentEditDisabledReason = managedReason ?? editDisabledReason;
          const paymentDeleteDisabledReason = managedReason ?? deleteDisabledReason;

          return (
            <div key={payment.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-sm">{fmtDate(payment.date)}</span>
                <span className="font-medium">{fmt(payment.amount)}</span>
                <span className="text-muted-foreground text-sm">{getTypeLabel(payment.type)}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 cursor-pointer p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {renderDisabledAction(
                    <DropdownMenuItem
                      onClick={paymentEditDisabledReason ? undefined : () => onEditPayment?.(payment)}
                      className="cursor-pointer"
                      disabled={!!paymentEditDisabledReason}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("Edit")}
                    </DropdownMenuItem>,
                    paymentEditDisabledReason,
                  )}
                  {renderDisabledAction(
                    <DropdownMenuItem
                      onClick={paymentDeleteDisabledReason ? undefined : () => setPaymentToDelete(payment)}
                      className="cursor-pointer text-destructive focus:text-destructive"
                      disabled={!!paymentDeleteDisabledReason}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("Delete")}
                    </DropdownMenuItem>,
                    paymentDeleteDisabledReason,
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })(),
      )}
    </div>
  );

  const deleteDialog = (
    <Dialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Delete payment")}</DialogTitle>
          <DialogDescription>{t("Delete payment confirmation")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isDeleting}
            onClick={() => setPaymentToDelete(null)}
            className="cursor-pointer"
          >
            {t("Cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="cursor-pointer">
            {t("Delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (variant === "inline") {
    return (
      <>
        <div>
          {headerContent}
          <div className="mt-3">{bodyContent}</div>
        </div>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">
            {t("Payments")} {payments.length > 0 && `(${payments.length})`}
          </CardTitle>
          {renderDisabledAction(addPaymentButton, addDisabledReason)}
        </CardHeader>
        <CardContent>{bodyContent}</CardContent>
      </Card>
      {deleteDialog}
    </>
  );
}
