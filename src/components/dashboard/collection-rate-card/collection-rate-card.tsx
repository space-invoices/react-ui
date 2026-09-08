"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { formatCurrencyValue, formatDecimalValue } from "@/ui/lib/formatting";
import { createTranslation } from "@/ui/lib/translation";
import { LoadingCard } from "../loading-card";
import type { DashboardEntityOverrides } from "../shared/use-dashboard-entity";
import { DashboardUnavailable, type DashboardUnavailableReason } from "../unavailable-state/dashboard-unavailable";
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
import { type CollectionRateData, useCollectionRateData } from "./use-collection-rate";

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
  timeZone?: never;
};

type TurnkeyProps = BaseProps &
  DashboardEntityOverrides & {
    entityId: string;
    collectionRate?: never;
    totalCollected?: never;
    totalInvoiced?: never;
  };

export type CollectionRateCardProps = DataProps | TurnkeyProps;

export function CollectionRateCard(props: CollectionRateCardProps) {
  const { locale, translationLocale, t: externalT, namespace } = props;
  const t = createTranslation({ t: externalT, namespace, locale, translationLocale, translations });

  // Turnkey mode - fetch own data
  const hookResult = useCollectionRateData(
    "entityId" in props ? props.entityId : undefined,
    "entityId" in props ? { currency: props.currency, timeZone: props.timeZone } : undefined,
  );

  // Determine data source
  const data: CollectionRateData | undefined =
    "entityId" in props
      ? hookResult.data
      : {
          collectionRate: props.collectionRate,
          totalCollected: props.totalCollected,
          totalInvoiced: props.totalInvoiced,
          currency: props.currency,
        };
  const isLoading = "entityId" in props ? hookResult.isLoading : false;
  const unavailable: DashboardUnavailableReason | null = "entityId" in props ? hookResult.unavailable : null;
  const retry = "entityId" in props ? hookResult.retry : undefined;

  if (isLoading) {
    return <LoadingCard />;
  }

  const getVariantColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 dark:text-green-400";
    if (rate >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatCurrency = (value: number, currency: string) =>
    formatCurrencyValue(value, currency, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <Card className="gap-2">
      <CardHeader className="pb-1">
        <CardTitle className="font-medium text-muted-foreground text-sm">{t("Collection Rate")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {unavailable || !data ? (
          <DashboardUnavailable
            reason={unavailable ?? "error"}
            onRetry={retry}
            locale={locale}
            translationLocale={translationLocale}
            t={externalT}
            namespace={namespace}
          />
        ) : (
          <>
            <div className={`break-words font-bold text-xl sm:text-2xl ${getVariantColor(data.collectionRate)}`}>
              {formatDecimalValue(data.collectionRate, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </div>
            <p className="mt-1 break-words text-muted-foreground text-xs">
              {formatCurrency(data.totalCollected, data.currency)} / {formatCurrency(data.totalInvoiced, data.currency)}
            </p>
            <p className="mt-1 text-muted-foreground text-xs">{t("Collected vs. invoiced, after credit notes")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
