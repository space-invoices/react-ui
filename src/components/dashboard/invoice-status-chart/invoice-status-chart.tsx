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
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import { useInvoiceStatusData } from "./use-invoice-status";

const translations = { de, es, fr, hr, it, nl, pl, pt, sl } as const;

export type InvoiceStatusChartData = {
  paid: number;
  pending: number;
  overdue: number;
  voided: number;
};

type BaseProps = {
  locale?: string;
  t?: (key: string) => string;
  namespace?: string;
};

type DataProps = BaseProps & {
  data: InvoiceStatusChartData;
  entityId?: never;
};

type TurnkeyProps = BaseProps & {
  entityId: string;
  data?: never;
};

export type InvoiceStatusChartProps = DataProps | TurnkeyProps;

const COLORS = {
  paid: "var(--chart-2)", // green
  pending: "var(--chart-3)", // yellow
  overdue: "var(--chart-1)", // red
  voided: "var(--chart-4)", // gray
};

export function InvoiceStatusChart(props: InvoiceStatusChartProps) {
  const { locale, t: externalT, namespace } = props;
  const t = createTranslation({ t: externalT, namespace, locale, translations });

  // Turnkey mode - fetch own data
  const hookResult = useInvoiceStatusData("entityId" in props ? props.entityId : undefined);

  // Determine data source
  const data = "entityId" in props ? hookResult.data : props.data;
  const isLoading = "entityId" in props ? hookResult.isLoading : false;

  if (isLoading) {
    return <LoadingCard className="h-[280px]" />;
  }

  const chartConfig = {
    paid: { label: t("Paid"), color: COLORS.paid },
    pending: { label: t("Pending"), color: COLORS.pending },
    overdue: { label: t("Overdue"), color: COLORS.overdue },
    voided: { label: t("Voided"), color: COLORS.voided },
  } satisfies ChartConfig;

  const total = data.paid + data.pending + data.overdue + data.voided;
  const hasData = total > 0;

  // Use actual data or placeholder for empty state
  const chartData = hasData
    ? [
        { name: "paid", value: data.paid, fill: COLORS.paid },
        { name: "pending", value: data.pending, fill: COLORS.pending },
        { name: "overdue", value: data.overdue, fill: COLORS.overdue },
        { name: "voided", value: data.voided, fill: COLORS.voided },
      ].filter((d) => d.value > 0)
    : [
        { name: "paid", value: 40, fill: COLORS.paid },
        { name: "pending", value: 30, fill: COLORS.pending },
        { name: "overdue", value: 20, fill: COLORS.overdue },
        { name: "voided", value: 10, fill: COLORS.voided },
      ];

  const chartContent = (
    <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" formatter={(value) => `${value} invoices`} />} />
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Invoice Status")}</CardTitle>
        <CardDescription>{t("Breakdown of invoices by payment status")}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? chartContent : <ChartEmptyState label={t("No data available")}>{chartContent}</ChartEmptyState>}
      </CardContent>
    </Card>
  );
}
