"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { createTranslation } from "@/ui/lib/translation";
import translations from "./locales";
import type { TaxByRate } from "./use-tax-collected";

export type TaxCollectedCardProps = {
  title: string;
  periodLabel: string;
  taxes: TaxByRate[];
  total: number;
  currency: string;
  isLoading?: boolean;
  locale?: string;
  translationLocale?: string;
  t?: (key: string) => string;
};

function formatCurrency(value: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function TaxCollectedCard({
  title,
  periodLabel,
  taxes,
  total,
  currency,
  isLoading,
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

  return (
    <Card className="gap-2">
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="font-medium text-muted-foreground text-sm">{title}</CardTitle>
        <span className="text-muted-foreground text-xs">{periodLabel}</span>
      </CardHeader>
      <CardContent className="pt-0">
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
      </CardContent>
    </Card>
  );
}
