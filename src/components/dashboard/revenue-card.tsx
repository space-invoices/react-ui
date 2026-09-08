"use client";

import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { formatCurrencyValue } from "@/ui/lib/formatting";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { DashboardUnavailable, type DashboardUnavailableReason } from "./unavailable-state/dashboard-unavailable";

export type RevenueCardProps = {
  title: string;
  /** `null` renders the unavailable state (`unavailable` says why; defaults to a conversion problem). */
  value: number | null;
  currency: string;
  variant?: "default" | "success" | "warning" | "danger";
  subtitle?: string;
  locale?: string;
  unavailable?: DashboardUnavailableReason;
  onRetry?: () => void;
} & Pick<ComponentTranslationProps, "translationLocale" | "t" | "namespace">;

const variantStyles = {
  default: "",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  danger: "text-red-600 dark:text-red-400",
};

const variantIcons = {
  default: null,
  success: TrendingUp,
  warning: AlertTriangle,
  danger: TrendingDown,
};

export function RevenueCard({
  title,
  value,
  currency,
  variant = "default",
  subtitle,
  locale,
  unavailable,
  onRetry,
  translationLocale,
  t,
  namespace,
}: RevenueCardProps) {
  const Icon = variantIcons[variant];
  const reason = unavailable ?? (value === null ? "conversion" : undefined);

  return (
    <Card className="gap-2">
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="font-medium text-muted-foreground text-sm">{title}</CardTitle>
        {Icon && !reason && <Icon className={`h-4 w-4 shrink-0 ${variantStyles[variant]}`} />}
      </CardHeader>
      <CardContent className="pt-0">
        {reason || value === null ? (
          <DashboardUnavailable
            reason={reason ?? "conversion"}
            onRetry={onRetry}
            locale={locale}
            translationLocale={translationLocale}
            t={t}
            namespace={namespace}
          />
        ) : (
          <>
            <div className={`break-words font-bold text-xl sm:text-2xl ${variantStyles[variant]}`}>
              {formatCurrencyValue(value, currency, locale)}
            </div>
            {subtitle && <p className="mt-1 text-muted-foreground text-xs">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
