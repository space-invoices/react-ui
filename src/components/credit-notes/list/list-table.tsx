import type { CreditNote } from "@spaceinvoices/js-sdk";
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

import CreditNoteListRowActions from "./list-row-actions";
import de from "./locales/de";
import sl from "./locales/sl";

const translations = {
  sl,
  de,
} as const;

type CreditNoteListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  entityId?: string;
  onAddPayment?: (creditNote: CreditNote) => void;
  onDuplicate?: (creditNote: CreditNote) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
} & ListTableProps<CreditNote>;

export default function CreditNoteListTable({
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
}: CreditNoteListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { sdk } = useSDK();

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await sdk.creditNotes.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
    });
    return response as unknown as TableQueryResponse<CreditNote>;
  }, entityId);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      dateFields: [
        { id: "date", label: t("Date") },
        { id: "created_at", label: t("Created At") },
      ],
      statusFilter: true, // Credit notes have payment status
    }),
    [t],
  );

  const columns: Column<CreditNote>[] = useMemo(
    () => [
      {
        id: "number",
        header: t("Number"),
        sortable: true,
        cell: (creditNote) => (
          <div className="flex items-center gap-2">
            <Button variant="link" className="cursor-pointer py-0 underline" onClick={() => onRowClick?.(creditNote)}>
              {creditNote.number}
            </Button>
            {(creditNote as any).is_draft && (
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
        cell: (creditNote) => creditNote.customer?.name ?? "-",
      },
      {
        id: "date",
        header: t("Date"),
        sortable: true,
        cell: (creditNote) => <FormattedDate date={creditNote.date} />,
      },
      {
        id: "total",
        header: t("Total"),
        sortable: true,
        align: "right",
        cell: (creditNote) => creditNote.total,
      },
      {
        id: "total_with_tax",
        header: t("Total with Tax"),
        sortable: true,
        align: "right",
        cell: (creditNote) => creditNote.total_with_tax,
      },
      {
        id: "status",
        header: t("Status"),
        cell: (creditNote) => <PaymentStatusBadge creditNote={creditNote} />,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (creditNote) => (
          <CreditNoteListRowActions
            creditNote={creditNote}
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
      resourceName="credit_note"
      cacheKey="credit-notes"
      createNewLink="/app/documents/add/credit_note"
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
      filterConfig={filterConfig}
      t={t}
      locale={i18nProps.locale}
    />
  );
}

/** Payment status badge for credit notes */
function PaymentStatusBadge({ creditNote }: { creditNote: CreditNote }) {
  if (creditNote.paid_in_full) {
    return <span className="rounded-full bg-green-100 px-2 py-1 text-green-800 text-xs">Paid</span>;
  }
  if (creditNote.total_paid > 0) {
    return <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">Partial</span>;
  }
  return <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-800 text-xs">Unpaid</span>;
}
