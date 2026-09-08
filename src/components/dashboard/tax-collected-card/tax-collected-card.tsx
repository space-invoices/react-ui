"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { formatCurrencyValue } from "@/ui/lib/formatting";
import { createTranslation } from "@/ui/lib/translation";
import { DashboardUnavailable, type DashboardUnavailableReason } from "../unavailable-state/dashboard-unavailable";
import translations from "./locales";
import type { TaxByRate } from "./use-tax-collected";

export type TaxCollectedCardProps = {
  title: string;
  periodLabel: string;
  /** `null` when the period has documents without a usable entity-currency amount. */
  taxes: TaxByRate[] | null;
  total: number | null;
  currency: string;
  isLoading?: boolean;
  /** Overrides the reason shown when no value can be rendered (defaults to a conversion problem). */
  unavailable?: DashboardUnavailableReason;
  onRetry?: () => void;
  locale?: string;
  translationLocale?: string;
  t?: (key: string) => string;
};

function formatCurrency(value: number, currency: string, locale?: string): string {
  return formatCurrencyValue(value, currency, locale);
}

export function TaxCollectedCard({
  title,
  periodLabel,
  taxes,
  total,
  currency,
  isLoading,
  unavailable,
  onRetry,
  locale,
  translationLocale,
  t: externalT,
}: TaxCollectedCardProps) {
  const t = createTranslation({ t: externalT, locale, translationLocale, translations });

  if (isLoading) {
    return (
      <Card className="gap-2">
        <CardHeader className="pb-1">
          <CardTitle className="font-medium text-muted-foreground text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </CardContent>
      </Card>
    );
  }

  const reason = unavailable ?? (taxes === null || total === null ? "conversion" : undefined);

  return (
    <Card className="gap-2">
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="font-medium text-muted-foreground text-sm">{title}</CardTitle>
        <span className="text-muted-foreground text-xs">{periodLabel}</span>
      </CardHeader>
      <CardContent className="pt-0">
        {reason || taxes === null || total === null ? (
          <DashboardUnavailable
            reason={reason ?? "conversion"}
            onRetry={onRetry}
            locale={locale}
            translationLocale={translationLocale}
            t={externalT}
          />
        ) : (
          <>
            {/* Total */}
            <div className="mb-2 font-bold text-2xl">{formatCurrency(total, currency, locale)}</div>

            {/* Tax breakdown */}
            {taxes.length > 0 ? (
              <div className="space-y-1">
                {taxes.map((tax) => (
                  <div key={`${tax.name}-${tax.rate}`} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t(tax.name)} {tax.rate}%
                    </span>
                    <span className="font-medium">{formatCurrency(tax.amount, currency, locale)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("No tax data")}</p>
            )}
            <p className="mt-2 text-muted-foreground text-xs">{t("Tax charged by invoice date, less credit notes")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
