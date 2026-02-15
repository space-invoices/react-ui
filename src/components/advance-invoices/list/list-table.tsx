import type { AdvanceInvoice } from "@spaceinvoices/js-sdk";
import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/ui/components/table/data-table";
import { FormattedDate } from "@/ui/components/table/date-cell";
import { useTableFetch } from "@/ui/components/table/hooks/use-table-fetch";
import { SelectionToolbar } from "@/ui/components/table/selection-toolbar";
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
  onView?: (advanceInvoice: AdvanceInvoice) => void;
  onAddPayment?: (advanceInvoice: AdvanceInvoice) => void;
  onDuplicate?: (advanceInvoice: AdvanceInvoice) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onExportSelected?: (documentIds: string[]) => void;
} & ListTableProps<AdvanceInvoice>;

export default function AdvanceInvoiceListTable({
  queryParams,
  onRowClick,
  onView,
  onAddPayment,
  onDuplicate,
  onChangeParams,
  entityId,
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  onExportSelected,
  ...i18nProps
}: AdvanceInvoiceListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { sdk } = useSDK();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const handleExportPdfs = useCallback(() => {
    if (selectedIds.size > 0 && onExportSelected) {
      onExportSelected(Array.from(selectedIds));
    }
  }, [selectedIds, onExportSelected]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectionToolbar = useCallback(
    (count: number) => (
      <SelectionToolbar
        selectedCount={count}
        onExportPdfs={onExportSelected ? handleExportPdfs : undefined}
        onDeselectAll={handleDeselectAll}
        t={t}
      />
    ),
    [handleExportPdfs, handleDeselectAll, onExportSelected, t],
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
        id: "status",
        header: t("Status"),
        cell: (advanceInvoice) => <AdvanceInvoiceStatusBadge advanceInvoice={advanceInvoice} t={t} />,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (advanceInvoice) => (
          <AdvanceInvoiceListRowActions
            advanceInvoice={advanceInvoice}
            onView={onView}
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
    [
      t,
      onRowClick,
      onView,
      onAddPayment,
      onDuplicate,
      onDownloadStart,
      onDownloadSuccess,
      onDownloadError,
      i18nProps.locale,
    ],
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
      selectable={!!onExportSelected}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionToolbar={selectionToolbar}
    />
  );
}

/** Status badge for advance invoices */
function AdvanceInvoiceStatusBadge({
  advanceInvoice,
  t,
}: {
  advanceInvoice: AdvanceInvoice;
  t: (key: string) => string;
}) {
  if ((advanceInvoice as any).voided_at) {
    return (
      <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
        {t("Voided")}
      </Badge>
    );
  }
  if ((advanceInvoice as any).is_draft) {
    return null;
  }
  if (advanceInvoice.paid_in_full) {
    return (
      <Badge
        variant="outline"
        className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
      >
        {t("Paid")}
      </Badge>
    );
  }
  if (advanceInvoice.date_due && new Date(advanceInvoice.date_due) < new Date()) {
    return (
      <Badge
        variant="outline"
        className="border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
      >
        {t("Overdue")}
      </Badge>
    );
  }
  if (advanceInvoice.total_paid > 0) {
    return (
      <Badge
        variant="outline"
        className="border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
      >
        {t("Partially Paid")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
      {t("Unpaid")}
    </Badge>
  );
}
