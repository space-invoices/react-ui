"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { createTranslation } from "@/ui/lib/translation";
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
import { useCollectionRateData } from "./use-collection-rate";

const translations = { de, es, fr, hr, it, nl, pl, pt, sl } as const;

type BaseProps = {
  locale?: string;
  t?: (key: string) => string;
  namespace?: string;
};

type DataProps = BaseProps & {
  collectionRate: number;
  totalCollected: number;
  totalInvoiced: number;
  currency: string;
  entityId?: never;
};

type TurnkeyProps = BaseProps & {
  entityId: string;
  collectionRate?: never;
  totalCollected?: never;
  totalInvoiced?: never;
  currency?: never;
};

export type CollectionRateCardProps = DataProps | TurnkeyProps;

export function CollectionRateCard(props: CollectionRateCardProps) {
  const { locale, t: externalT, namespace } = props;
  const t = createTranslation({ t: externalT, namespace, locale, translations });

  // Turnkey mode - fetch own data
  const hookResult = useCollectionRateData("entityId" in props ? props.entityId : undefined);

  // Determine data source
  const collectionRate = "entityId" in props ? hookResult.data.collectionRate : props.collectionRate;
  const totalCollected = "entityId" in props ? hookResult.data.totalCollected : props.totalCollected;
  const totalInvoiced = "entityId" in props ? hookResult.data.totalInvoiced : props.totalInvoiced;
  const currency = "entityId" in props ? hookResult.data.currency : props.currency;
  const isLoading = "entityId" in props ? hookResult.isLoading : false;

  if (isLoading) {
    return <LoadingCard />;
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const getVariantColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 dark:text-green-400";
    if (rate >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-medium text-muted-foreground text-sm">{t("Collection Rate")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`font-bold text-2xl ${getVariantColor(collectionRate)}`}>{collectionRate.toFixed(1)}%</div>
        <p className="mt-1 text-muted-foreground text-xs">
          {formatCurrency(totalCollected)} / {formatCurrency(totalInvoiced)}
        </p>
      </CardContent>
    </Card>
  );
}
