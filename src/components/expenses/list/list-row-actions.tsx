import type { Expense } from "@spaceinvoices/js-sdk";

import { Ban, CheckCircle2, Copy, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { memo } from "react";
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

type ExpenseListRowActionsProps = {
  expense: Expense;
  onView?: (expense: Expense) => void;
  onEdit?: (expense: Expense) => void;
  onMarkPaid?: (expense: Expense) => void;
  onDeleteDraft?: (expense: Expense) => void;
  onVoid?: (expense: Expense) => void;
} & ComponentTranslationProps;

export default memo(function ExpenseListRowActions({
  expense,
  onView,
  onEdit,
  onMarkPaid,
  onDeleteDraft,
  onVoid,
  ...i18nProps
}: ExpenseListRowActionsProps) {
  const t = createTranslation({ ...i18nProps });

  const isVoided = !!expense.voided_at;
  const canEdit = !!onEdit && !isVoided;
  const canMarkPaid = !!onMarkPaid && !expense.is_draft && !isVoided && !expense.paid_in_full;
  const canDeleteDraft = !!onDeleteDraft && expense.is_draft;
  const canVoid = !!onVoid && !expense.is_draft && !isVoided;
  const hasDestructive = canDeleteDraft || canVoid;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 cursor-pointer p-0" aria-label={t("Open menu")}>
          <span className="sr-only">{t("Open menu")}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(expense.id)}>
            <Copy className="h-4 w-4" />
            {t("Copy expense ID")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {onView && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => onView(expense)}>
              <Eye className="h-4 w-4" />
              {t("View")}
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit?.(expense)}>
              <Pencil className="h-4 w-4" />
              {t("Edit")}
            </DropdownMenuItem>
          )}
          {canMarkPaid && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => onMarkPaid?.(expense)}>
              <CheckCircle2 className="h-4 w-4" />
              {t("Mark as paid")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {hasDestructive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {canDeleteDraft && (
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => onDeleteDraft?.(expense)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("Delete draft")}
                </DropdownMenuItem>
              )}
              {canVoid && (
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => onVoid?.(expense)}
                >
                  <Ban className="h-4 w-4" />
                  {t("Void")}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
