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
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";

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

type ItemListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  entityId?: string;
  onView?: (item: Item) => void;
} & ListTableProps<Item>;

export default function ItemListTable({
  queryParams,
  createNewTrigger,
  onRowClick,
  onView,
  onChangeParams,
  entityId,
  ...i18nProps
}: ItemListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });
  const { sdk } = useSDK();

  const handleFetch = useTableFetch((params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    return sdk.items.list(params as any);
  }, entityId);

  return (
    <DataTable
      columns={[
        { id: "name", header: t("Name") },
        { id: "description", header: t("Description") },
        { id: "unit", header: t("Unit") },
        { id: "price", header: t("Price"), align: "right" },
        { id: "actions", header: "", align: "right" },
      ]}
      renderRow={(item) => (
        <ItemListRow item={item} key={item.id} onRowClick={(item) => onRowClick?.(item)} onView={onView} t={t} />
      )}
      renderHeader={() => <ItemListHeader t={t} />}
      queryParams={queryParams}
      resourceName="item"
      cacheKey={ITEMS_CACHE_KEY}
      createNewTrigger={createNewTrigger}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
      t={t}
      locale={i18nProps.locale}
    />
  );
}
