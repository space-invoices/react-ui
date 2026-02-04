"use client";

import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

export type RevenueCardProps = {
  title: string;
  value: number;
  currency: string;
  variant?: "default" | "success" | "warning" | "danger";
  subtitle?: string;
  locale?: string;
};

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

export function RevenueCard({ title, value, currency, variant = "default", subtitle, locale }: RevenueCardProps) {
  const Icon = variantIcons[variant];
  const formattedValue = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-medium text-muted-foreground text-sm">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${variantStyles[variant]}`} />}
      </CardHeader>
      <CardContent>
        <div className={`font-bold text-2xl ${variantStyles[variant]}`}>{formattedValue}</div>
        {subtitle && <p className="mt-1 text-muted-foreground text-xs">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
