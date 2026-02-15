import type { DeliveryNote } from "@spaceinvoices/js-sdk";
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

import DeliveryNoteListRowActions from "./list-row-actions";
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

type DeliveryNoteListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  entityId?: string;
  onView?: (deliveryNote: DeliveryNote) => void;
  onDuplicate?: (deliveryNote: DeliveryNote) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onExportSelected?: (documentIds: string[]) => void;
} & ListTableProps<DeliveryNote>;

export default function DeliveryNoteListTable({
  queryParams,
  onRowClick,
  onView,
  onDuplicate,
  onChangeParams,
  entityId,
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  onExportSelected,
  ...i18nProps
}: DeliveryNoteListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { sdk } = useSDK();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await sdk.deliveryNotes.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
    });
    return response as unknown as TableQueryResponse<DeliveryNote>;
  }, entityId);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      dateFields: [
        { id: "date", label: t("Date") },
        { id: "created_at", label: t("Created At") },
      ],
      statusFilter: false,
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

  const columns: Column<DeliveryNote>[] = useMemo(
    () => [
      {
        id: "number",
        header: t("Number"),
        sortable: true,
        cell: (deliveryNote) => (
          <div className="flex items-center gap-2">
            <Button variant="link" className="cursor-pointer py-0 underline" onClick={() => onRowClick?.(deliveryNote)}>
              {deliveryNote.number}
            </Button>
            {(deliveryNote as any).is_draft && (
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
        cell: (deliveryNote) => deliveryNote.customer?.name ?? "-",
      },
      {
        id: "date",
        header: t("Date"),
        sortable: true,
        cell: (deliveryNote) => <FormattedDate date={deliveryNote.date} />,
      },
      {
        id: "total",
        header: t("Total"),
        sortable: true,
        align: "right",
        cell: (deliveryNote) => deliveryNote.total,
      },
      {
        id: "total_with_tax",
        header: t("Total with Tax"),
        sortable: true,
        align: "right",
        cell: (deliveryNote) => deliveryNote.total_with_tax,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (deliveryNote) => (
          <DeliveryNoteListRowActions
            deliveryNote={deliveryNote}
            onView={onView}
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
    [t, onRowClick, onView, onDuplicate, onDownloadStart, onDownloadSuccess, onDownloadError, i18nProps.locale],
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      onChangeParams={onChangeParams}
      onFetch={handleFetch}
      cacheKey="delivery-notes"
      resourceName="delivery note"
      createNewLink={entityId ? `/app/${entityId}/documents/add/delivery_note` : undefined}
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
