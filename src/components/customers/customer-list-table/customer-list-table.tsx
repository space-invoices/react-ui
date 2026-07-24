import type { Customer } from "@spaceinvoices/js-sdk";
import { customers } from "@spaceinvoices/js-sdk";
import { User } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/ui/components/ui/button";
import { createTranslation } from "@/ui/lib/translation";
import { DataTable } from "../../table/data-table";
import { useTableFetch } from "../../table/hooks/use-table-fetch";
import { withTableTranslations } from "../../table/locales";
import type { Column, FilterConfig, ListTableProps, TableQueryParams, TableQueryResponse } from "../../table/types";
import { CUSTOMERS_CACHE_KEY } from "../customers.hooks";
import CustomerListRowActions from "./customer-list-row-actions";
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
  bg,
  cs,
  en,
  sl,
  de,
  it,
  fr,
  es,
  et,
  fi,
  pt,
  is,
  nb,
  nl,
  pl,
  sk,
  sv,
  hr,
} as const);

function getContactTypeLabel(customer: Customer, t: (key: string) => string) {
  switch (customer.contact_type) {
    case "supplier":
      return t("Supplier");
    case "both":
      return t("Customer and supplier");
    default:
      return t("Customer");
  }
}

type CustomerListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  entityId?: string;
  onEditCustomer?: (customer: Customer) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: string) => void;
} & ListTableProps<Customer>;

export default function CustomerListTable({
  queryParams,
  createNewTrigger,
  onRowClick,
  onChangeParams,
  entityId,
  onEditCustomer,
  onDeleteSuccess,
  onDeleteError,
  ...i18nProps
}: CustomerListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });
  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await customers.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
    });
    return response as unknown as TableQueryResponse<Customer>;
  }, entityId);

  const filterConfig: FilterConfig = {
    selectFilters: [
      {
        id: "contact_type",
        label: t("Contact Type"),
        options: [
          { value: "buyer", label: t("Customer") },
          { value: "supplier", label: t("Supplier") },
          { value: "both", label: t("Customer and supplier") },
        ],
      },
    ],
  };

  const columns: Column<Customer>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("Name"),
        sort: true,
        cell: (customer) => (
          <Button variant="link" className="cursor-pointer py-0 underline" onClick={() => onRowClick?.(customer)}>
            <User className="h-4 w-4 flex-shrink-0" />
            {customer.name}
          </Button>
        ),
      },
      {
        id: "contact_type",
        header: t("Contact Type"),
        cell: (customer) => getContactTypeLabel(customer, t),
      },
      {
        id: "address",
        header: t("Address"),
        sort: true,
        cell: (customer) => customer.address,
      },
      {
        id: "post_code",
        header: t("Post Code"),
        cell: (customer) => customer.post_code,
      },
      {
        id: "city",
        header: t("City"),
        sort: true,
        cell: (customer) => customer.city,
      },
      {
        id: "state",
        header: t("State"),
        cell: (customer) => customer.state,
      },
      {
        id: "country",
        header: t("Country"),
        sort: true,
        cell: (customer) => customer.country,
      },
      {
        id: "tax_number",
        header: t("Tax number"),
        align: "right",
        cell: (customer) => customer.tax_number,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (customer) => (
          <CustomerListRowActions
            customer={customer}
            entityId={entityId}
            onEditCustomer={onEditCustomer}
            onDeleteSuccess={onDeleteSuccess}
            onDeleteError={onDeleteError}
            t={t}
          />
        ),
      },
    ],
    [t, onRowClick, entityId, onEditCustomer, onDeleteSuccess, onDeleteError],
  );

  return (
    <DataTable
      columns={columns}
      filterConfig={filterConfig}
      queryParams={queryParams}
      resourceName="customer"
      cacheKey={CUSTOMERS_CACHE_KEY}
      createNewTrigger={createNewTrigger}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
      t={t}
      locale={i18nProps.locale}
    />
  );
}
