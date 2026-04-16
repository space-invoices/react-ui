"use client";

import type { RevenueByCategoryRow } from "@spaceinvoices/js-sdk";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { useRevenueByCategory } from "@/ui/components/financial-categories/financial-categories.hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/ui/components/ui/chart";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { ChartEmptyState } from "./chart-empty-state";
import { LoadingCard } from "./loading-card";

type RevenueByCategoryChartProps = {
  entityId: string;
} & ComponentTranslationProps;

const FALLBACK_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const translations = {
  en: {
    "revenue-by-category-chart.title": "Revenue by category",
    "revenue-by-category-chart.description": "Accrued revenue by line-item category for the current year.",
    "revenue-by-category-chart.empty": "No categorized revenue yet",
    "revenue-by-category-chart.revenue": "Revenue",
    "revenue-by-category-chart.share": "Share",
  },
} as const;

function formatCurrency(value: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function truncateCategoryName(name: string) {
  return name.length > 24 ? `${name.slice(0, 24)}...` : name;
}

function buildChartRows(rows: RevenueByCategoryRow[]) {
  return rows.slice(0, 6).map((row, index) => ({
    ...row,
    displayName: truncateCategoryName(row.name),
    fill: row.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));
}

export function RevenueByCategoryChart({
  entityId,
  t: externalT,
  namespace,
  locale,
  translationLocale,
}: RevenueByCategoryChartProps) {
  const t = createTranslation({
    t: externalT,
    namespace,
    locale,
    translationLocale,
    translations,
  });
  const { data, isLoading } = useRevenueByCategory(entityId);

  if (isLoading) {
    return <LoadingCard className="h-full min-h-[320px]" />;
  }

  const rows = data?.data ?? [];
  const currencyCode = data?.currency_code ?? "EUR";
  const hasData = rows.length > 0;
  const chartRows = hasData
    ? buildChartRows(rows)
    : [
        {
          financial_category_id: "placeholder-1",
          name: "Consulting",
          displayName: "Consulting",
          color: null,
          fill: FALLBACK_COLORS[0],
          amount: 3600,
          percentage: 42,
          currency_code: currencyCode,
        },
        {
          financial_category_id: "placeholder-2",
          name: "Subscriptions",
          displayName: "Subscriptions",
          color: null,
          fill: FALLBACK_COLORS[1],
          amount: 2400,
          percentage: 28,
          currency_code: currencyCode,
        },
        {
          financial_category_id: "placeholder-3",
          name: "Support",
          displayName: "Support",
          color: null,
          fill: FALLBACK_COLORS[2],
          amount: 1800,
          percentage: 21,
          currency_code: currencyCode,
        },
      ];

  const chartConfig = {
    amount: {
      label: t("revenue-by-category-chart.revenue"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const chart = (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={chartRows} layout="vertical" margin={{ left: 4, right: 12 }}>
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatCurrency(Number(value), currencyCode, locale)}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          width={132}
          style={{ fontSize: "12px" }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload): React.ReactNode => String(payload?.[0]?.payload?.name || "")}
              formatter={(value) => formatCurrency(Number(value), currencyCode, locale)}
            />
          }
        />
        <Bar dataKey="amount" radius={4}>
          {chartRows.map((row) => (
            <Cell key={row.financial_category_id ?? row.name} fill={row.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{t("revenue-by-category-chart.title")}</CardTitle>
        <CardDescription>{t("revenue-by-category-chart.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? chart : <ChartEmptyState label={t("revenue-by-category-chart.empty")}>{chart}</ChartEmptyState>}
      </CardContent>
    </Card>
  );
}
