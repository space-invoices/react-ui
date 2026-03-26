"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { createTranslation } from "@/ui/lib/translation";
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
import { useCollectionRateData } from "./use-collection-rate";

const translations = { bg, cs, de, et, es, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } as const;

type BaseProps = {
  locale?: string;
  translationLocale?: string;
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
  const { locale, translationLocale, t: externalT, namespace } = props;
  const t = createTranslation({ t: externalT, namespace, locale, translationLocale, translations });

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
    <Card className="gap-2">
      <CardHeader className="pb-1">
        <CardTitle className="font-medium text-muted-foreground text-sm">{t("Collection Rate")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`font-bold text-2xl ${getVariantColor(collectionRate)}`}>{collectionRate.toFixed(1)}%</div>
        <p className="mt-1 text-muted-foreground text-xs">
          {formatCurrency(totalCollected)} / {formatCurrency(totalInvoiced)}
        </p>
      </CardContent>
    </Card>
  );
}
