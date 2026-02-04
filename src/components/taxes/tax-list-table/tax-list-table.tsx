import type { Tax } from "@spaceinvoices/js-sdk";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";
import { DataTable } from "../../table/data-table";
import { useTableFetch } from "../../table/hooks/use-table-fetch";
import type { ListTableProps, TableQueryParams } from "../../table/types";
import { TAXES_CACHE_KEY } from "../taxes.hooks";
import de from "./locales/de";
import sl from "./locales/sl";
import TaxListHeader from "./tax-list-header";
import TaxListRow from "./tax-list-row";

const translations = {
  sl,
  de,
} as const;

type TaxListTableProps = {
  entityId?: string;
} & ListTableProps<Tax> &
  ComponentTranslationProps;

export default function TaxListTable({
  queryParams,
  createNewTrigger,
  onRowClick,
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
        { id: "name", header: t("Name"), sortable: true },
        { id: "tax_rates", header: t("Tax Rates") },
        { id: "created_at", header: t("Created"), sortable: true },
        { id: "actions", header: "", align: "right" },
      ]}
      renderRow={(tax) => <TaxListRow tax={tax} key={tax.id} onRowClick={(tax) => onRowClick?.(tax)} t={t} />}
      renderHeader={(headerProps) => <TaxListHeader orderBy={headerProps.orderBy} onSort={headerProps.onSort} t={t} />}
      queryParams={queryParams}
      resourceName="tax"
      cacheKey={TAXES_CACHE_KEY}
      createNewTrigger={createNewTrigger}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
    />
  );
}
