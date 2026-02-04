import type { Item } from "@spaceinvoices/js-sdk";

import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";
import { DataTable } from "../../table/data-table";
import { useTableFetch } from "../../table/hooks/use-table-fetch";
import type { ListTableProps, TableQueryParams } from "../../table/types";
import { ITEMS_CACHE_KEY } from "../items.hooks";
import ItemListHeader from "./item-list-header";
import ItemListRow from "./item-list-row";
import de from "./locales/de";
import sl from "./locales/sl";

const translations = {
  sl,
  de,
} as const;

type ItemListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  entityId?: string;
} & ListTableProps<Item>;

export default function ItemListTable({
  queryParams,
  createNewTrigger,
  onRowClick,
  onChangeParams,
  entityId,
  ...i18nProps
}: ItemListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });
  const { sdk } = useSDK();

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await sdk.items.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
    });
    return response as unknown;
  }, entityId);

  return (
    <DataTable
      columns={[
        { id: "name", header: t("Name"), sortable: true },
        { id: "description", header: t("Description"), sortable: true },
        { id: "unit", header: t("Unit") },
        { id: "price", header: t("Price"), align: "right" },
        { id: "actions", header: "", align: "right" },
      ]}
      renderRow={(item) => <ItemListRow item={item} key={item.id} onRowClick={(item) => onRowClick?.(item)} t={t} />}
      renderHeader={(headerProps) => <ItemListHeader orderBy={headerProps.orderBy} onSort={headerProps.onSort} t={t} />}
      queryParams={queryParams}
      resourceName="item"
      cacheKey={ITEMS_CACHE_KEY}
      createNewTrigger={createNewTrigger}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
    />
  );
}
