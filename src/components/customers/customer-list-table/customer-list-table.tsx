import type { Customer } from "@spaceinvoices/js-sdk";
import { User } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/ui/components/ui/button";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";
import { DataTable } from "../../table/data-table";
import { useTableFetch } from "../../table/hooks/use-table-fetch";
import type { Column, ListTableProps, TableQueryParams, TableQueryResponse } from "../../table/types";
import { CUSTOMERS_CACHE_KEY } from "../customers.hooks";
import CustomerListRowActions from "./customer-list-row-actions";
import de from "./locales/de";
import sl from "./locales/sl";

const translations = {
  sl,
  de,
} as const;

type CustomerListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  entityId?: string;
} & ListTableProps<Customer>;

export default function CustomerListTable({
  queryParams,
  createNewTrigger,
  onRowClick,
  onChangeParams,
  entityId,
  ...i18nProps
}: CustomerListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });
  const { sdk } = useSDK();

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await sdk.customers.list({
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

  const columns: Column<Customer>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("Name"),
        sortable: true,
        cell: (customer) => (
          <Button variant="link" className="cursor-pointer py-0 underline" onClick={() => onRowClick?.(customer)}>
            <User className="h-4 w-4 flex-shrink-0" />
            {customer.name}
          </Button>
        ),
      },
      {
        id: "address",
        header: t("Address"),
        sortable: true,
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
        cell: (customer) => <CustomerListRowActions customer={customer} t={t} />,
      },
    ],
    [t, onRowClick],
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      resourceName="customer"
      cacheKey={CUSTOMERS_CACHE_KEY}
      createNewTrigger={createNewTrigger}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
    />
  );
}
