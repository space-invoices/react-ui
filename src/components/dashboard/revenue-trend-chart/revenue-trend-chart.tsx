"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/ui/components/ui/chart";
import { formatCalendarMonthLabel } from "@/ui/lib/entity-calendar";
import { formatCurrencyValue } from "@/ui/lib/formatting";
import { createTranslation } from "@/ui/lib/translation";
import { ChartEmptyState } from "../chart-empty-state";
import { LoadingCard } from "../loading-card";
import type { DashboardEntityOverrides } from "../shared/use-dashboard-entity";
import { DashboardUnavailable } from "../unavailable-state/dashboard-unavailable";
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
import { useRevenueTrendData } from "./use-revenue-trend";

const translations = { bg, cs, de, et, es, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } as const;

export type RevenueTrendChartData = { month: string; revenue: number }[];

type BaseProps = {
  locale?: string;
  translationLocale?: string;
  t?: (key: string) => string;
  namespace?: string;
};

type DataProps = BaseProps & {
  data: RevenueTrendChartData;
  currency: string;
  entityId?: never;
  timeZone?: never;
};

type TurnkeyProps = BaseProps &
  DashboardEntityOverrides & {
    entityId: string;
    data?: never;
  };

export type RevenueTrendChartProps = DataProps | TurnkeyProps;

function formatCurrency(value: number, currency: string, locale?: string): string {
  return formatCurrencyValue(value, currency, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function RevenueTrendChart(props: RevenueTrendChartProps) {
  const { locale, translationLocale, t: externalT, namespace } = props;
  const t = createTranslation({ t: externalT, namespace, locale, translationLocale, translations });

  // Turnkey mode - fetch own data
  const hookResult = useRevenueTrendData(
    "entityId" in props ? props.entityId : undefined,
    "entityId" in props ? { currency: props.currency, timeZone: props.timeZone } : undefined,
  );

  // Determine data source
  const result = "entityId" in props ? hookResult.data : { data: props.data, currency: props.currency };
  const isLoading = "entityId" in props ? hookResult.isLoading : false;
  const unavailable = "entityId" in props ? hookResult.unavailable : null;
  const retry = "entityId" in props ? hookResult.retry : undefined;

  if (isLoading) {
    return <LoadingCard className="h-[280px]" />;
  }

  const renderCard = (content: React.ReactNode) => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("Revenue Trend")}</CardTitle>
        <CardDescription>{t("Invoiced incl. tax, less credit notes, by month for the last 6 months")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden">{content}</CardContent>
    </Card>
  );

  if (unavailable || !result) {
    return renderCard(
      <DashboardUnavailable
        reason={unavailable ?? "error"}
        onRetry={retry}
        locale={locale}
        translationLocale={translationLocale}
        t={externalT}
        namespace={namespace}
      />,
    );
  }

  const { data, currency } = result;
  const hasData = data.some((d) => d.revenue !== 0);
  const chartConfig = {
    revenue: {
      label: t("Revenue"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  // Placeholder data for empty state
  const placeholderData =
    data.length > 0
      ? data.map((d) => ({ ...d, revenue: 100 }))
      : [
          { month: "2024-01", revenue: 80 },
          { month: "2024-02", revenue: 120 },
          { month: "2024-03", revenue: 90 },
          { month: "2024-04", revenue: 140 },
          { month: "2024-05", revenue: 100 },
          { month: "2024-06", revenue: 130 },
        ];

  const chartContent = (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <AreaChart data={hasData ? data : placeholderData} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(m) => formatCalendarMonthLabel(String(m), locale)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => formatCurrency(value, currency, locale)}
          width={80}
        />
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatCalendarMonthLabel(String(label), locale)}
              formatter={(value) => formatCurrency(Number(value), currency, locale)}
            />
          }
        />
        <Area dataKey="revenue" type="monotone" fill="url(#fillRevenue)" stroke="var(--chart-1)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );

  return renderCard(
    hasData ? chartContent : <ChartEmptyState label={t("No data available")}>{chartContent}</ChartEmptyState>,
  );
}
