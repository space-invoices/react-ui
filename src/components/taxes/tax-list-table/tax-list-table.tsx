import type { Tax } from "@spaceinvoices/js-sdk";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";
import { DataTable } from "../../table/data-table";
import { useTableFetch } from "../../table/hooks/use-table-fetch";
import type { ListTableProps, TableQueryParams } from "../../table/types";
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
import TaxListHeader from "./tax-list-header";
import TaxListRow from "./tax-list-row";

const translations = {
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
} as const;

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
  const { sdk } = useSDK();

  const handleFetch = useTableFetch((params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    return sdk.taxes.list(params as any);
  }, entityId);

  return (
    <DataTable
      columns={[
        { id: "name", header: t("Name") },
        { id: "tax_rates", header: t("Tax Rates") },
        { id: "created_at", header: t("Created") },
        { id: "actions", header: "", align: "right" },
      ]}
      renderRow={(tax) => (
        <TaxListRow tax={tax} key={tax.id} onRowClick={(tax) => onRowClick?.(tax)} onView={onView} t={t} />
      )}
      renderHeader={() => <TaxListHeader t={t} />}
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
