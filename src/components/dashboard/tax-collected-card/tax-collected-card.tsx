"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Skeleton } from "@/ui/components/ui/skeleton";
import type { TaxByRate } from "./use-tax-collected";

export type TaxCollectedCardProps = {
  title: string;
  periodLabel: string;
  taxes: TaxByRate[];
  total: number;
  currency: string;
  isLoading?: boolean;
  locale?: string;
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
}: TaxCollectedCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-muted-foreground text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-medium text-muted-foreground text-sm">{title}</CardTitle>
        <span className="text-muted-foreground text-xs">{periodLabel}</span>
      </CardHeader>
      <CardContent>
        {/* Total */}
        <div className="mb-3 font-bold text-2xl">{formatCurrency(total, currency, locale)}</div>

        {/* Tax breakdown */}
        {taxes.length > 0 ? (
          <div className="space-y-1">
            {taxes.map((tax) => (
              <div key={`${tax.name}-${tax.rate}`} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {tax.name} {tax.rate}%
                </span>
                <span className="font-medium">{formatCurrency(tax.amount, currency, locale)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No tax data</p>
        )}
      </CardContent>
    </Card>
  );
}
