import type { ExchangeRate } from "@spaceinvoices/js-sdk";
import { Coins } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { formatCurrencyValue } from "@/ui/lib/formatting";

export type ConvertedTotalWithTaxDocument = {
  entity_id: string;
  currency_code?: string | null;
  total?: number | null;
  total_converted?: number | null;
  total_with_tax?: number | null;
  total_with_tax_converted?: number | null;
  exchange_rate?: Pick<ExchangeRate, "quote_currency"> | null;
};

type ConvertedTotalWithTaxCellProps = {
  document: ConvertedTotalWithTaxDocument;
  locale?: string;
  t: (key: string) => string;
  sign?: 1 | -1;
  field?: "total" | "total_with_tax";
};

function formatAmount(amount: number, currencyCode: string, locale: string | undefined) {
  return formatCurrencyValue(amount, currencyCode, locale);
}

function isFiniteAmount(amount: number | null | undefined): amount is number {
  return typeof amount === "number" && Number.isFinite(amount);
}

/**
 * Renders a document's persisted converted total. The conversion amount and quote currency both
 * come from the API response; this component intentionally never derives an FX value in the UI.
 */
export function ConvertedTotalWithTaxCell({
  document,
  locale,
  t,
  sign = 1,
  field = "total_with_tax",
}: ConvertedTotalWithTaxCellProps) {
  const [touchPopoverOpen, setTouchPopoverOpen] = useState(false);
  const sourceCurrency = document.currency_code ?? null;
  const quoteCurrency = document.exchange_rate?.quote_currency ?? null;
  const originalTotal = document[field];
  const convertedTotal = field === "total" ? document.total_converted : document.total_with_tax_converted;
  const hasPersistedConversion =
    sourceCurrency != null &&
    quoteCurrency != null &&
    quoteCurrency !== sourceCurrency &&
    isFiniteAmount(convertedTotal) &&
    isFiniteAmount(originalTotal);

  if (
    hasPersistedConversion &&
    sourceCurrency &&
    quoteCurrency &&
    isFiniteAmount(originalTotal) &&
    isFiniteAmount(convertedTotal)
  ) {
    const originalAmount = formatAmount(originalTotal * sign, sourceCurrency, locale);
    const convertedAmount = formatAmount(convertedTotal * sign, quoteCurrency, locale);
    const originalAmountLabel = `${t("Original amount")}: ${originalAmount}`;

    return (
      <span className="inline-flex items-center justify-end gap-1">
        <Tooltip>
          <Popover open={touchPopoverOpen} onOpenChange={setTouchPopoverOpen}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={originalAmountLabel}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Coins aria-hidden="true" className="size-3.5" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>{originalAmountLabel}</TooltipContent>
            <PopoverContent className="w-auto p-2" aria-label={t("Original amount")}>
              {originalAmountLabel}
            </PopoverContent>
          </Popover>
        </Tooltip>
        <span>{convertedAmount}</span>
      </span>
    );
  }

  if (sourceCurrency && isFiniteAmount(originalTotal)) {
    return formatAmount(originalTotal * sign, sourceCurrency, locale);
  }

  return <span className="text-muted-foreground">—</span>;
}
