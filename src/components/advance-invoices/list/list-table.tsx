import type { AdvanceInvoice } from "@spaceinvoices/js-sdk";
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
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";

import AdvanceInvoiceListRowActions from "./list-row-actions";
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

type AdvanceInvoiceListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  entityId?: string;
  onAddPayment?: (advanceInvoice: AdvanceInvoice) => void;
  onDuplicate?: (advanceInvoice: AdvanceInvoice) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
} & ListTableProps<AdvanceInvoice>;

export default function AdvanceInvoiceListTable({
  queryParams,
  onRowClick,
  onAddPayment,
  onDuplicate,
  onChangeParams,
  entityId,
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  ...i18nProps
}: AdvanceInvoiceListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { sdk } = useSDK();

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await sdk.advanceInvoices.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
    });
    return response as unknown as TableQueryResponse<AdvanceInvoice>;
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

  const columns: Column<AdvanceInvoice>[] = useMemo(
    () => [
      {
        id: "number",
        header: t("Number"),
        sortable: true,
        cell: (advanceInvoice) => (
          <div className="flex items-center gap-2">
            <Button
              variant="link"
              className="cursor-pointer py-0 underline"
              onClick={() => onRowClick?.(advanceInvoice)}
            >
              {advanceInvoice.number}
            </Button>
            {(advanceInvoice as any).is_draft && (
              <Badge
                variant="outline"
                className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              >
                {t("Draft")}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "customer",
        header: t("Customer"),
        cell: (advanceInvoice) => advanceInvoice.customer?.name ?? "-",
      },
      {
        id: "date",
        header: t("Date"),
        sortable: true,
        cell: (advanceInvoice) => <FormattedDate date={advanceInvoice.date} />,
      },
      {
        id: "date_due",
        header: t("Date Due"),
        sortable: true,
        cell: (advanceInvoice) => <FormattedDate date={advanceInvoice.date_due} />,
      },
      {
        id: "total",
        header: t("Total"),
        sortable: true,
        align: "right",
        cell: (advanceInvoice) => advanceInvoice.total,
      },
      {
        id: "total_with_tax",
        header: t("Total with Tax"),
        sortable: true,
        align: "right",
        cell: (advanceInvoice) => advanceInvoice.total_with_tax,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (advanceInvoice) => (
          <AdvanceInvoiceListRowActions
            advanceInvoice={advanceInvoice}
            onAddPayment={onAddPayment}
            onDuplicate={onDuplicate}
            onDownloadStart={onDownloadStart}
            onDownloadSuccess={onDownloadSuccess}
            onDownloadError={onDownloadError}
            t={t}
            locale={i18nProps.locale}
          />
        ),
      },
    ],
    [t, onRowClick, onAddPayment, onDuplicate, onDownloadStart, onDownloadSuccess, onDownloadError, i18nProps.locale],
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      resourceName="advance_invoice"
      cacheKey="advance-invoices"
      createNewLink={entityId ? `/app/${entityId}/documents/add/advance_invoice` : undefined}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
      filterConfig={filterConfig}
      t={t}
      locale={i18nProps.locale}
    />
  );
}
