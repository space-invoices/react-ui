"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/ui/components/ui/chart";
import { createTranslation } from "@/ui/lib/translation";
import { ChartEmptyState } from "../chart-empty-state";
import { LoadingCard } from "../loading-card";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { usePaymentTrendData } from "./use-payment-trend";

const translations = { sl, de, it, fr, es, pt, nl, pl, hr } as const;

export type PaymentTrendChartData = { month: string; amount: number }[];

type BaseProps = {
  locale?: string;
  t?: (key: string) => string;
  namespace?: string;
};

type DataProps = BaseProps & {
  data: PaymentTrendChartData;
  currency: string;
  entityId?: never;
};

type TurnkeyProps = BaseProps & {
  entityId: string;
  data?: never;
  currency?: never;
};

export type PaymentTrendChartProps = DataProps | TurnkeyProps;

const chartConfig = {
  amount: {
    label: "Payments",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

function formatMonth(month: string, locale?: string): string {
  const date = new Date(`${month}-01`);
  return date.toLocaleDateString(locale, { month: "short" });
}

function formatCurrency(value: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PaymentTrendChart(props: PaymentTrendChartProps) {
  const { locale, t: externalT, namespace } = props;
  const t = createTranslation({ t: externalT, namespace, locale, translations });

  // Turnkey mode - fetch own data
  const hookResult = usePaymentTrendData("entityId" in props ? props.entityId : undefined);

  // Determine data source
  const data = "entityId" in props ? hookResult.data : props.data;
  const currency = "entityId" in props ? hookResult.currency : props.currency;
  const isLoading = "entityId" in props ? hookResult.isLoading : false;

  if (isLoading) {
    return <LoadingCard className="h-[280px]" />;
  }

  const hasData = data.some((d) => d.amount > 0);

  // Placeholder data for empty state
  const placeholderData =
    data.length > 0
      ? data.map((d) => ({ ...d, amount: 100 }))
      : [
          { month: "2024-01", amount: 70 },
          { month: "2024-02", amount: 110 },
          { month: "2024-03", amount: 85 },
          { month: "2024-04", amount: 130 },
          { month: "2024-05", amount: 95 },
          { month: "2024-06", amount: 120 },
        ];

  const chartContent = (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <AreaChart data={hasData ? data : placeholderData} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(m) => formatMonth(m, locale)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => formatCurrency(value, currency, locale)}
          width={80}
        />
        <defs>
          <linearGradient id="fillPayments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatMonth(String(label), locale)}
              formatter={(value) => formatCurrency(Number(value), currency, locale)}
            />
          }
        />
        <Area dataKey="amount" type="monotone" fill="url(#fillPayments)" stroke="var(--chart-3)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Payment Trend")}</CardTitle>
        <CardDescription>{t("Monthly payments received over the last 6 months")}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? chartContent : <ChartEmptyState label={t("No data available")}>{chartContent}</ChartEmptyState>}
      </CardContent>
    </Card>
  );
}
