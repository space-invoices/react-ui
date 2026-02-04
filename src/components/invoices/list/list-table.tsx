import type { Invoice } from "@spaceinvoices/js-sdk";
import { useMemo } from "react";
import { DataTable } from "@/ui/components/table/data-table";
import { FormattedDate } from "@/ui/components/table/date-cell";
import { useTableFetch } from "@/ui/components/table/hooks/use-table-fetch";
import type {
  Column,
  FilterConfig,
  ListTableProps,
  TableQueryParams,
  TableQueryResponse,
} from "@/ui/components/table/types";
import { Button } from "@/ui/components/ui/button";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";

import InvoiceListRowActions from "./list-row-actions";
import de from "./locales/de";
import sl from "./locales/sl";

const translations = {
  sl,
  de,
} as const;

type InvoiceListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  entityId?: string;
  onAddPayment?: (invoice: Invoice) => void;
  onDuplicate?: (invoice: Invoice) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
} & ListTableProps<Invoice>;

export default function InvoiceListTable({
  queryParams,
  onRowClick,
  onAddPayment,
  onDuplicate,
  onChangeParams,
  disableUrlSync,
  entityId,
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  ...i18nProps
}: InvoiceListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { sdk } = useSDK();

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await sdk.invoices.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
    });
    return response as unknown as TableQueryResponse<Invoice>;
  }, entityId);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      dateFields: [
        { id: "date", label: t("Date") },
        { id: "date_due", label: t("Date Due") },
        { id: "created_at", label: t("Created At") },
      ],
      statusFilter: true,
    }),
    [t],
  );

  const columns: Column<Invoice>[] = useMemo(
    () => [
      {
        id: "number",
        header: t("Number"),
        sortable: true,
        cell: (invoice) => (
          <Button variant="link" className="cursor-pointer py-0 underline" onClick={() => onRowClick?.(invoice)}>
            {(invoice as any).is_draft ? t("Draft") : invoice.number}
          </Button>
        ),
      },
      {
        id: "customer",
        header: t("Customer"),
        cell: (invoice) => invoice.customer?.name ?? "-",
      },
      {
        id: "date",
        header: t("Date"),
        sortable: true,
        cell: (invoice) => <FormattedDate date={invoice.date} />,
      },
      {
        id: "date_due",
        header: t("Date Due"),
        sortable: true,
        cell: (invoice) => <FormattedDate date={invoice.date_due} />,
      },
      {
        id: "total",
        header: t("Total"),
        sortable: true,
        align: "right",
        cell: (invoice) => invoice.total,
      },
      {
        id: "total_with_tax",
        header: t("Total with Tax"),
        sortable: true,
        align: "right",
        cell: (invoice) => invoice.total_with_tax,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (invoice) => (
          <InvoiceListRowActions
            invoice={invoice}
            onAddPayment={onAddPayment}
            onDuplicate={onDuplicate}
            onDownloadStart={onDownloadStart}
            onDownloadSuccess={onDownloadSuccess}
            onDownloadError={onDownloadError}
            {...i18nProps}
          />
        ),
      },
    ],
    [t, onRowClick, onAddPayment, onDuplicate, onDownloadStart, onDownloadSuccess, onDownloadError, i18nProps],
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      resourceName="invoice"
      cacheKey="invoices"
      createNewLink="/app/documents/add/invoice"
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      disableUrlSync={disableUrlSync}
      entityId={entityId}
      filterConfig={filterConfig}
      t={t}
      locale={i18nProps.locale}
    />
  );
}
