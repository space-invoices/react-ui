import type { Payment } from "@spaceinvoices/js-sdk";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";
import de from "./locales/de";
import sl from "./locales/sl";

const translations = { de, sl } as const;

type DocumentType = "invoice" | "credit_note" | "advance_invoice";

interface DocumentPaymentsListProps extends ComponentTranslationProps {
  documentId: string;
  documentType: DocumentType;
  entityId: string;
  currencyCode: string;
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
  locale = "en",
  onAddPayment,
  onEditPayment,
  onDeleteSuccess,
  onDeleteError,
  ...i18nProps
}: DocumentPaymentsListProps) {
  const t = createTranslation({ translations, locale, ...i18nProps });
  const { sdk } = useSDK();
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
      if (!sdk) throw new Error("SDK not initialized");

      const response = await sdk.payments.list({
        entity_id: entityId,
        query: JSON.stringify(getFilter()),
        order_by: "-date",
      });

      return response.data;
    },
    enabled: !!sdk && !!entityId && !!documentId,
  });

  const payments = paymentsData || [];

  /**
   * Handle payment deletion
   */
  const handleDelete = async () => {
    if (!paymentToDelete || !sdk) return;

    setIsDeleting(true);
    try {
      await sdk.payments.delete(paymentToDelete.id, { entity_id: entityId });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });

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
    const labels: Record<string, string> = {
      cash: t("cash"),
      bank_transfer: t("bank_transfer"),
      card: t("card"),
      check: t("check"),
      credit_note: t("credit_note"),
      other: t("other"),
      advance: t("advance_invoice"),
    };
    return labels[type] || type;
  };

  const fmt = (amount: number) => formatCurrency(amount, currencyCode, locale);
  const fmtDate = (date: Date | string | null) => formatDate(date, locale);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">
            {t("Payments")} {payments.length > 0 && `(${payments.length})`}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onAddPayment} className="cursor-pointer">
            <Plus className="mr-1 h-4 w-4" />
            {t("Add payment")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : payments.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">{t("No payments")}</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
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
                      <DropdownMenuItem onClick={() => onEditPayment?.(payment)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("Edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPaymentToDelete(payment)}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("Delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
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
    </>
  );
}
