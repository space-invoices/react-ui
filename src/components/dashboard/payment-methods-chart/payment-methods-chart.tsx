"use client";

import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/ui/components/ui/chart";
import { createTranslation } from "@/ui/lib/translation";
import { ChartEmptyState } from "../chart-empty-state";
import { LoadingCard } from "../loading-card";
import sl from "./locales/sl";
import { usePaymentMethodsData } from "./use-payment-methods";

const translations = { sl } as const;

export type PaymentMethodsChartData = { type: string; count: number; amount: number }[];

type BaseProps = {
  locale?: string;
  t?: (key: string) => string;
  namespace?: string;
};

type DataProps = BaseProps & {
  data: PaymentMethodsChartData;
  entityId?: never;
};

type TurnkeyProps = BaseProps & {
  entityId: string;
  data?: never;
};

export type PaymentMethodsChartProps = DataProps | TurnkeyProps;

const COLORS: Record<string, string> = {
  cash: "var(--chart-1)",
  bank_transfer: "var(--chart-2)",
  card: "var(--chart-3)",
  check: "var(--chart-4)",
  credit_note: "var(--chart-5)",
  advance: "var(--chart-6)",
  other: "var(--chart-7)",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  check: "Check",
  credit_note: "Credit Note",
  advance: "Advance",
  other: "Other",
};

export function PaymentMethodsChart(props: PaymentMethodsChartProps) {
  const { locale, t: externalT, namespace } = props;
  const t = createTranslation({ t: externalT, namespace, locale, translations });

  // Turnkey mode - fetch own data
  const hookResult = usePaymentMethodsData("entityId" in props ? props.entityId : undefined);

  // Determine data source
  const data = "entityId" in props ? hookResult.data : props.data;
  const isLoading = "entityId" in props ? hookResult.isLoading : false;

  if (isLoading) {
    return <LoadingCard className="h-[280px]" />;
  }

  const hasData = data.length > 0 && data.some((d) => d.amount > 0);

  // Placeholder data for empty state
  const placeholderData = [
    { name: "cash", value: 35, fill: COLORS.cash },
    { name: "bank_transfer", value: 40, fill: COLORS.bank_transfer },
    { name: "card", value: 20, fill: COLORS.card },
    { name: "other", value: 5, fill: COLORS.other },
  ];

  const chartData = hasData
    ? data.map((d) => ({
        name: d.type,
        value: d.amount,
        fill: COLORS[d.type] || "var(--chart-5)",
      }))
    : placeholderData;

  const chartConfig = (hasData ? data : placeholderData).reduce((acc, item) => {
    const type = "type" in item ? item.type : item.name;
    acc[type] = {
      label: t(PAYMENT_TYPE_LABELS[type] || type),
      color: COLORS[type] || "var(--chart-5)",
    };
    return acc;
  }, {} as ChartConfig);

  const chartContent = (
    <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="30%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="name"
              formatter={(value) =>
                new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(Number(value))
              }
            />
          }
        />
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          layout="vertical"
          verticalAlign="middle"
          align="right"
          className="flex-col gap-1 [&>*]:justify-start"
        />
      </PieChart>
    </ChartContainer>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Payment Methods")}</CardTitle>
        <CardDescription>{t("Breakdown of payments by method")}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? chartContent : <ChartEmptyState label={t("No data available")}>{chartContent}</ChartEmptyState>}
      </CardContent>
    </Card>
  );
}
