import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { cn } from "@/ui/lib/utils";
import {
  createEmptyPaymentRow,
  type DraftPaymentRow,
  derivePaymentRowAmounts,
  getDisplayPaymentAmount,
  getRecordedPaymentTotal,
} from "./payment-rows";

// Regular payment types (excluding special types like credit_note and advance)
const regularPaymentTypes = ["cash", "bank_transfer", "card", "check", "other"] as const;

// Labels for payment types (used for translations)
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  check: "Check",
  other: "Other",
};

type MarkAsPaidSectionProps = {
  /** Whether the document is marked as paid */
  checked: boolean;
  /** Called when the checkbox changes */
  onCheckedChange: (checked: boolean) => void;
  /** Selected payment types */
  paymentRows: DraftPaymentRow[];
  /** Called when payment rows change */
  onPaymentRowsChange: (values: DraftPaymentRow[]) => void;
  /** Current document total used for derived payment suggestions */
  documentTotal: number;
  /** Translation function */
  t: (key: string) => string;
  /** Always show payment type selector (e.g. for FINA fiscalization) */
  alwaysShowPaymentType?: boolean;
  /** Force paid state — hides the checkbox and always shows payment selectors */
  forced?: boolean;
  validationMessage?: string;
  requireFullPayment?: boolean;
};

export function MarkAsPaidSection({
  checked,
  onCheckedChange,
  paymentRows,
  onPaymentRowsChange,
  documentTotal,
  t,
  alwaysShowPaymentType,
  forced,
  validationMessage,
  requireFullPayment,
}: MarkAsPaidSectionProps) {
  const showPaymentTypes = forced || checked || alwaysShowPaymentType;
  const showPaymentAmounts = paymentRows.length > 1;
  const derivedAmounts = derivePaymentRowAmounts(paymentRows, documentTotal);
  const recordedTotal = getRecordedPaymentTotal(paymentRows, documentTotal);
  const remainingTotal = Math.max(0, Math.round((documentTotal - recordedTotal) * 100) / 100);

  return (
    <div className={cn("flex flex-col gap-4 rounded-md border p-4", showPaymentTypes && "gap-3")}>
      {forced ? (
        <div className="flex flex-row items-center space-x-3 space-y-0">
          <Label>{t("Paid")}</Label>
        </div>
      ) : (
        <div className="flex flex-row items-center space-x-3 space-y-0">
          <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
          <div className="flex items-center gap-1 leading-none">
            <Label>{checked ? t("Paid") : t("Mark as Paid")}</Label>
            {!checked && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full p-1 transition-colors hover:bg-accent"
                    onClick={(e) => e.preventDefault()}
                  >
                    <HelpCircle className="size-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {requireFullPayment
                    ? t("This document must be fully paid on creation")
                    : t("Record one or more payments on creation")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {showPaymentTypes && (
        <div className="flex flex-col gap-2">
          {alwaysShowPaymentType && !checked && (
            <Label className="text-muted-foreground text-xs">{t("Payment Type")}</Label>
          )}
          {paymentRows.map((row, index) => (
            <div
              key={row.id ?? `${row.type ?? "payment"}-${row.amount || "empty"}`}
              className={cn(
                "grid gap-2 md:items-center",
                showPaymentAmounts ? "md:grid-cols-[minmax(0,1fr)_140px_auto]" : "md:grid-cols-[minmax(0,1fr)_auto]",
              )}
            >
              <Select
                value={row.type ?? undefined}
                onValueChange={(v) => {
                  const updated = [...paymentRows];
                  updated[index] = { ...updated[index], type: (v as any) ?? null };
                  onPaymentRowsChange(updated);
                }}
              >
                <SelectTrigger className="w-full md:w-fit">
                  <SelectValue placeholder={t("Please select")}>
                    {row.type ? t(PAYMENT_TYPE_LABELS[row.type]) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {regularPaymentTypes.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {t(PAYMENT_TYPE_LABELS[pt])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showPaymentAmounts && (
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={getDisplayPaymentAmount(row, derivedAmounts[index])}
                  onChange={(event) => {
                    const updated = [...paymentRows];
                    updated[index] = {
                      ...updated[index],
                      amount: event.target.value,
                      amountTouched: true,
                    };
                    onPaymentRowsChange(updated);
                  }}
                  placeholder={t("Amount")}
                />
              )}
              {paymentRows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => {
                    const updated = paymentRows.filter((_, i) => i !== index);
                    onPaymentRowsChange(updated);
                  }}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit gap-1 text-muted-foreground"
            onClick={() => onPaymentRowsChange([...paymentRows, createEmptyPaymentRow()])}
          >
            <Plus className="size-4" />
            {t("Add payment")}
          </Button>
          {validationMessage && <p className="text-destructive text-sm">{validationMessage}</p>}
          <div className="grid gap-1 text-muted-foreground text-sm">
            <div className="flex items-center justify-between">
              <span>{t("Recorded now")}</span>
              <span>{recordedTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{requireFullPayment ? t("Remaining to allocate") : t("Remaining due")}</span>
              <span>{remainingTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
