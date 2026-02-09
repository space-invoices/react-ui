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
        cell: (creditNote) => <PaymentStatusBadge creditNote={creditNote} t={t} />,
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
      resourceName="credit_note"
      cacheKey="credit-notes"
      createNewLink={entityId ? `/app/${entityId}/documents/add/credit_note` : undefined}
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
function PaymentStatusBadge({ creditNote, t }: { creditNote: CreditNote; t: (key: string) => string }) {
  if (creditNote.paid_in_full) {
    return <span className="rounded-full bg-green-100 px-2 py-1 text-green-800 text-xs">{t("Paid")}</span>;
  }
  if (creditNote.total_paid > 0) {
    return <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">{t("Partial")}</span>;
  }
  return <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-800 text-xs">{t("Unpaid")}</span>;
}
