import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/ui/components/ui/button";
import { Calendar } from "@/ui/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { formatDateOnlyForDisplay, toLocalCalendarDate, toLocalDateOnlyString } from "@/ui/lib/date-only";
import { formatCurrencyValue } from "@/ui/lib/formatting";
import { DOCUMENT_PAYMENT_FORM_TYPES } from "@/ui/lib/payment-types";
import { cn } from "@/ui/lib/utils";

const EXPENSE_PAYMENT_FORM_TYPES = DOCUMENT_PAYMENT_FORM_TYPES.filter((type) => type !== "credit_note");

export type ExpensePaymentInput = {
  amount: number;
  type: string;
  date: string;
};

export type ExpensePaymentDialogCopy = {
  title: string;
  amount: string;
  paymentType: string;
  paymentDate: string;
  balanceDue: string;
  pickDate: string;
  cancel: string;
  submit: string;
};

type ExpenseRecordPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payment: ExpensePaymentInput) => void;
  balanceDue: number;
  currencyCode: string;
  expenseLabel: string;
  copy: ExpensePaymentDialogCopy;
  paymentTypeLabel: (type: string) => string;
  locale?: string;
  pending?: boolean;
  initialPayment?: ExpensePaymentInput | null;
};

export function ExpenseRecordPaymentDialog({
  open,
  onOpenChange,
  onSubmit,
  balanceDue,
  currencyCode,
  expenseLabel,
  copy,
  paymentTypeLabel,
  locale,
  pending = false,
  initialPayment,
}: ExpenseRecordPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(initialPayment ? String(initialPayment.amount) : balanceDue > 0 ? String(balanceDue) : "");
    setPaymentType(initialPayment?.type ?? "bank_transfer");
    setPaymentDate(initialPayment?.date ?? toLocalDateOnlyString(new Date()));
  }, [balanceDue, initialPayment, open]);

  const numericAmount = Number(amount);
  const isValidAmount = Number.isFinite(numericAmount) && numericAmount > 0 && numericAmount <= balanceDue;
  const canSubmit = isValidAmount && !!paymentDate && !pending;
  const amountHelpId = "expense-payment-balance";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {expenseLabel} · {copy.balanceDue} {formatCurrencyValue(balanceDue, currencyCode, locale)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="expense-payment-amount">{copy.amount}</Label>
            <Input
              id="expense-payment-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max={balanceDue}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-describedby={amountHelpId}
              aria-invalid={amount.length > 0 && !isValidAmount}
            />
            <p id={amountHelpId} className="text-muted-foreground text-xs">
              {copy.balanceDue}: {formatCurrencyValue(balanceDue, currencyCode, locale)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-payment-type">{copy.paymentType}</Label>
            <Select value={paymentType} onValueChange={(value) => setPaymentType(value ?? "bank_transfer")}>
              <SelectTrigger id="expense-payment-type" aria-label={copy.paymentType}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_PAYMENT_FORM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {paymentTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-payment-date">{copy.paymentDate}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="expense-payment-date"
                  type="button"
                  variant="outline"
                  aria-label={copy.paymentDate}
                  className={cn("w-full pl-3 text-left font-normal", !paymentDate && "text-muted-foreground")}
                >
                  {paymentDate ? (
                    formatDateOnlyForDisplay(paymentDate, locale, { dateStyle: "medium" })
                  ) : (
                    <span>{copy.pickDate}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toLocalCalendarDate(paymentDate)}
                  onSelect={(date) => setPaymentDate(date ? toLocalDateOnlyString(date) : "")}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {copy.cancel}
          </Button>
          <Button
            onClick={() => onSubmit({ amount: numericAmount, type: paymentType, date: paymentDate })}
            disabled={!canSubmit}
          >
            {copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
