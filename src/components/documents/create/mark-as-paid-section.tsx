import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
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
  /** Selected payment types */
  paymentTypes: string[];
  /** Called when payment types change */
  onPaymentTypesChange: (values: string[]) => void;
  /** Translation function */
  t: (key: string) => string;
};

export function MarkAsPaidSection({
  checked,
  onCheckedChange,
  paymentTypes,
  onPaymentTypesChange,
  t,
}: MarkAsPaidSectionProps) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-md border p-4", checked && "gap-3")}>
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
        <div className="flex flex-col gap-2">
          {paymentTypes.map((type, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={type}
                onValueChange={(v) => {
                  if (v) {
                    const updated = [...paymentTypes];
                    updated[index] = v;
                    onPaymentTypesChange(updated);
                  }
                }}
              >
                <SelectTrigger className="w-full md:w-fit">
                  <SelectValue placeholder={t("Select payment type")}>{t(PAYMENT_TYPE_LABELS[type])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {regularPaymentTypes.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {t(PAYMENT_TYPE_LABELS[pt])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentTypes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => {
                    const updated = paymentTypes.filter((_, i) => i !== index);
                    onPaymentTypesChange(updated);
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
            onClick={() => onPaymentTypesChange([...paymentTypes, "bank_transfer"])}
          >
            <Plus className="size-4" />
            {t("Add payment")}
          </Button>
        </div>
      )}
    </div>
  );
}
