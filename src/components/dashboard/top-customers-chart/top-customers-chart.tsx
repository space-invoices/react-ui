"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/ui/components/ui/chart";
import { createTranslation } from "@/ui/lib/translation";
import { ChartEmptyState } from "../chart-empty-state";
import { LoadingCard } from "../loading-card";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import es from "./locales/es";
import et from "./locales/et";
import fi from "./locales/fi";
import fr from "./locales/fr";
import hr from "./locales/hr";
import is from "./locales/is";
import it from "./locales/it";
import nb from "./locales/nb";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sk from "./locales/sk";
import sl from "./locales/sl";
import sv from "./locales/sv";
import { useTopCustomersData } from "./use-top-customers";

const translations = { bg, cs, de, et, es, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } as const;

export type TopCustomersChartData = { name: string; revenue: number }[];

type BaseProps = {
  locale?: string;
  translationLocale?: string;
  t?: (key: string) => string;
  namespace?: string;
};

type DataProps = BaseProps & {
  data: TopCustomersChartData;
  currency: string;
  entityId?: never;
};

type TurnkeyProps = BaseProps & {
  entityId: string;
  data?: never;
  currency?: never;
};

export type TopCustomersChartProps = DataProps | TurnkeyProps;

function formatCurrency(value: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function TopCustomersChart(props: TopCustomersChartProps) {
  const { locale, translationLocale, t: externalT, namespace } = props;
  const t = createTranslation({ t: externalT, namespace, locale, translationLocale, translations });

  // Turnkey mode - fetch own data
  const hookResult = useTopCustomersData("entityId" in props ? props.entityId : undefined);

  // Determine data source
  const data = "entityId" in props ? hookResult.data : props.data;
  const currency = "entityId" in props ? hookResult.currency : props.currency;
  const isLoading = "entityId" in props ? hookResult.isLoading : false;

  if (isLoading) {
    return <LoadingCard className="h-full min-h-[280px]" />;
  }

  const hasData = data.length > 0;
  const chartConfig = {
    revenue: {
      label: t("Revenue"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  // Placeholder data for empty state
  const placeholderData = [
    { name: "Customer A", displayName: "Customer A", revenue: 1500 },
    { name: "Customer B", displayName: "Customer B", revenue: 1200 },
    { name: "Customer C", displayName: "Customer C", revenue: 900 },
    { name: "Customer D", displayName: "Customer D", revenue: 600 },
    { name: "Customer E", displayName: "Customer E", revenue: 300 },
  ];

  // Truncate long names for display
  const chartData = hasData
    ? data.map((d) => {
        const localizedName = d.name === "Unknown" ? t("Unknown") : d.name;
        return {
          ...d,
          name: localizedName,
          displayName: localizedName.length > 18 ? `${localizedName.substring(0, 18)}...` : localizedName,
        };
      })
    : placeholderData;

  const chartContent = (
    <ChartContainer config={chartConfig} className="h-full min-h-[200px] w-full">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 12 }}>
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatCurrency(value, currency, locale)}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={120}
          style={{ fontSize: "12px" }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload): React.ReactNode => String(payload?.[0]?.payload?.name || "")}
              formatter={(value) => formatCurrency(Number(value), currency, locale)}
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--chart-1)" radius={4} />
      </BarChart>
    </ChartContainer>
  );

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{t("Top Customers")}</CardTitle>
        <CardDescription>{t("Top 5 customers by revenue")}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {hasData ? chartContent : <ChartEmptyState label={t("No data available")}>{chartContent}</ChartEmptyState>}
      </CardContent>
    </Card>
  );
}
