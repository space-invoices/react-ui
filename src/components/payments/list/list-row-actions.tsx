import type { Payment } from "@spaceinvoices/js-sdk";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

import { useDeletePayment } from "../payments.hooks";
import de from "./locales/de";
import sl from "./locales/sl";

const translations = {
  sl,
  de,
} as const;

type PaymentListRowActionsProps = {
  payment: Payment;
  entityId?: string;
  onViewInvoice?: (invoiceId: string) => void;
  onEditPayment?: (payment: Payment) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: string) => void;
} & ComponentTranslationProps;

export default function PaymentListRowActions({
  payment,
  entityId,
  onViewInvoice,
  onEditPayment,
  onDeleteSuccess,
  onDeleteError,
  ...i18nProps
}: PaymentListRowActionsProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { mutate: deletePayment, isPending: isDeleting } = useDeletePayment({
    entityId,
    onSuccess: () => {
      onDeleteSuccess?.();
    },
    onError: (error: Error) => {
      onDeleteError?.(error.message);
    },
  });

  const handleDelete = () => {
    deletePayment({ id: payment.id });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 cursor-pointer p-0" id="action-menu-trigger">
          <span className="sr-only">{t("Open menu")}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onEditPayment?.(payment)}>
            <Pencil className="h-4 w-4" />
            {t("Edit payment")}
          </DropdownMenuItem>
          {payment.invoice_id && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => onViewInvoice?.(payment.invoice_id!)}>
              <Eye className="h-4 w-4" />
              {t("View invoice")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? t("Deleting...") : t("Delete payment")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
