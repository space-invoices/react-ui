import type { Item } from "@spaceinvoices/js-sdk";
import { items } from "@spaceinvoices/js-sdk";
import { Package } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/ui/components/ui/button";
import { createTranslation } from "@/ui/lib/translation";
import { DataTable } from "../../table/data-table";
import { useTableFetch } from "../../table/hooks/use-table-fetch";
import { withTableTranslations } from "../../table/locales";
import type { Column, ListTableProps, TableQueryParams } from "../../table/types";
import { ITEMS_CACHE_KEY } from "../items.hooks";
import ItemListRowActions from "./item-list-row-actions";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import en from "./locales/en";
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

const translations = withTableTranslations({
  en,
  sl,
  bg,
  cs,
  de,
  es,
  et,
  fi,
  fr,
  hr,
  is,
  it,
  nb,
  nl,
  pl,
  pt,
  sk,
  sv,
} as const);

type ItemListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  translationLocale?: string;
  entityId?: string;
  onView?: (item: Item) => void;
  onEdit?: (item: Item) => void;
} & ListTableProps<Item>;

export default function ItemListTable({
  queryParams,
  createNewTrigger,
  onRowClick,
  onView,
  onEdit,
  onChangeParams,
  entityId,
  ...i18nProps
}: ItemListTableProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });
  const handleFetch = useTableFetch((params: TableQueryParams) => {
    return items.list(params as any);
  }, entityId);

  const columns: Column<Item>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("Name"),
        sort: true,
        cell: (item) => (
          <Button variant="link" className="py-0 underline" onClick={() => onRowClick?.(item)}>
            <Package className="h-4 w-4 flex-shrink-0" />
            {item.name}
          </Button>
        ),
      },
      {
        id: "description",
        header: t("Description"),
        cell: (item) => item.description,
      },
      {
        id: "price",
        header: t("Price"),
        align: "right",
        sort: {
          defaultDirection: "desc",
        },
        cell: (item) => item.price,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (item) => <ItemListRowActions item={item} onView={onView} onEdit={onEdit} t={t} />,
      },
    ],
    [t, onRowClick, onView, onEdit],
  );

  return (
    <DataTable
      columns={columns}
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
