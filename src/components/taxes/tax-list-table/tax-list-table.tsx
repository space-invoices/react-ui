import type { Tax } from "@spaceinvoices/js-sdk";
import { taxes } from "@spaceinvoices/js-sdk";
import { Percent } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { DataTable } from "../../table/data-table";
import { useTableFetch } from "../../table/hooks/use-table-fetch";
import { withTableTranslations } from "../../table/locales";
import type { Column, ListTableProps, TableQueryParams } from "../../table/types";
import { TAXES_CACHE_KEY } from "../taxes.hooks";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";
import TaxListRowActions from "./tax-list-row-actions";

const translations = withTableTranslations({
  en,
  sl,
  de,
  it,
  fr,
  es,
  pt,
  nl,
  pl,
  hr,
} as const);

type TaxListTableProps = {
  entityId?: string;
  onView?: (tax: Tax) => void;
} & ListTableProps<Tax> &
  ComponentTranslationProps;

export default function TaxListTable({
  queryParams,
  createNewTrigger,
  onRowClick,
  onView,
  onChangeParams,
  entityId,
  ...i18nProps
}: TaxListTableProps) {
  const t = createTranslation({ translations, ...i18nProps });
  const handleFetch = useTableFetch((params: TableQueryParams) => {
    return taxes.list(params as any);
  }, entityId);

  const columns: Column<Tax>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("Name"),
        sort: true,
        cell: (tax) => (
          <div className="flex items-center gap-2">
            <Button variant="link" className="py-0 underline" onClick={() => onRowClick?.(tax)}>
              <Percent className="h-4 w-4 flex-shrink-0" />
              {tax.name || t("Unnamed Tax")}
            </Button>
            {tax.is_default && (
              <Badge variant="secondary" className="text-xs">
                {t("Default")}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "tax_rates",
        header: t("Tax Rates"),
        cell: (tax) => (tax.tax_rates?.length ? tax.tax_rates.map((rate) => `${rate.rate}%`).join(", ") : "-"),
      },
      {
        id: "created_at",
        header: t("Created"),
        sort: {
          defaultDirection: "desc",
        },
        cell: (tax) => new Date(tax.created_at).toLocaleDateString(),
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (tax) => <TaxListRowActions tax={tax} onView={onView} t={t} />,
      },
    ],
    [t, onRowClick, onView],
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      resourceName="tax"
      cacheKey={TAXES_CACHE_KEY}
      createNewTrigger={createNewTrigger}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
      t={t}
      locale={i18nProps.locale}
    />
  );
}
