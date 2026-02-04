import { HelpCircle } from "lucide-react";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Label } from "@/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { cn } from "@/ui/lib/utils";

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
  /** Selected payment type */
  paymentType: string;
  /** Called when payment type changes */
  onPaymentTypeChange: (value: string) => void;
  /** Translation function */
  t: (key: string) => string;
};

export function MarkAsPaidSection({
  checked,
  onCheckedChange,
  paymentType,
  onPaymentTypeChange,
  t,
}: MarkAsPaidSectionProps) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-md border p-4", checked && "md:flex-row md:items-center md:gap-6")}>
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
              <TooltipContent side="top">{t("Invoice will be marked as fully paid upon creation")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {checked && (
        <>
          <div className="hidden flex-1 md:block" />
          <Select value={paymentType} onValueChange={(v) => v && onPaymentTypeChange(v)}>
            <SelectTrigger className="w-full md:w-fit">
              <SelectValue placeholder={t("Select payment type")}>{t(PAYMENT_TYPE_LABELS[paymentType])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {regularPaymentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(PAYMENT_TYPE_LABELS[type])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}
