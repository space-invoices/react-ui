import type { DeliveryNote } from "@spaceinvoices/js-sdk";
import { deliveryNotes } from "@spaceinvoices/js-sdk";
import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/ui/components/table/data-table";
import { FormattedDate } from "@/ui/components/table/date-cell";
import { useTableFetch } from "@/ui/components/table/hooks/use-table-fetch";
import { withTableTranslations } from "@/ui/components/table/locales";
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

const translations = withTableTranslations({
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
} as const);

type DeliveryNoteListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  translationLocale?: string;
  entityId?: string;
  onView?: (deliveryNote: DeliveryNote) => void;
  onDuplicate?: (deliveryNote: DeliveryNote) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onExportSelected?: (documentIds: string[]) => void;
  pdfExportDisabled?: boolean;
  pdfExportDisabledTooltip?: string;
  onCopyToInvoice?: (documentIds: string[]) => void;
  onCreateNew?: () => void;
  onVoid?: (deliveryNote: DeliveryNote) => void;
  isVoiding?: boolean;
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
  pdfExportDisabled,
  pdfExportDisabledTooltip,
  onCopyToInvoice,
  onCreateNew,
  onVoid,
  isVoiding,
  ...i18nProps
}: DeliveryNoteListTableProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await deliveryNotes.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
      include: "document_relations",
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

  const handleCopyToInvoice = useCallback(() => {
    if (selectedIds.size > 0 && onCopyToInvoice) {
      onCopyToInvoice(Array.from(selectedIds));
    }
  }, [selectedIds, onCopyToInvoice]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectionToolbar = useCallback(
    (count: number, data: DeliveryNote[]) => {
      const hasDrafts = data.some((d) => selectedIds.has(d.id) && (d as any).is_draft);
      const hasVoided = data.some((d) => selectedIds.has(d.id) && !!(d as any).voided_at);
      const copyDisabled = hasDrafts || hasVoided;
      const copyTooltip = hasDrafts
        ? t("Finalize draft documents before copying to invoice")
        : hasVoided
          ? t("Voided documents cannot be copied to invoices")
          : undefined;

      return (
        <SelectionToolbar
          selectedCount={count}
          onExportPdfs={onExportSelected ? handleExportPdfs : undefined}
          exportPdfsDisabled={pdfExportDisabled}
          exportPdfsTooltip={pdfExportDisabledTooltip}
          onCopyToInvoice={onCopyToInvoice ? handleCopyToInvoice : undefined}
          copyToInvoiceDisabled={copyDisabled}
          copyToInvoiceTooltip={copyTooltip}
          onDeselectAll={handleDeselectAll}
          t={t}
        />
      );
    },
    [
      handleExportPdfs,
      handleCopyToInvoice,
      handleDeselectAll,
      onExportSelected,
      pdfExportDisabled,
      pdfExportDisabledTooltip,
      onCopyToInvoice,
      selectedIds,
      t,
    ],
  );

  const columns: Column<DeliveryNote>[] = useMemo(
    () => [
      {
        id: "number",
        header: t("Number"),
        sort: {
          defaultDirection: "desc",
        },
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
        sort: {
          defaultDirection: "desc",
        },
        cell: (deliveryNote) => <FormattedDate date={deliveryNote.date} locale={i18nProps.locale} />,
      },
      {
        id: "total",
        header: t("Total"),
        align: "right",
        sort: {
          defaultDirection: "desc",
        },
        cell: (deliveryNote) => deliveryNote.total,
      },
      {
        id: "total_with_tax",
        header: t("Total with Tax"),
        align: "right",
        sort: {
          defaultDirection: "desc",
        },
        cell: (deliveryNote) => deliveryNote.total_with_tax,
      },
      {
        id: "status",
        header: t("Status"),
        cell: (deliveryNote) => {
          if (deliveryNote.voided_at) {
            return (
              <Badge
                variant="outline"
                className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
              >
                {t("Voided")}
              </Badge>
            );
          }
          return null;
        },
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
            onVoid={onVoid}
            isVoiding={isVoiding}
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
      onDuplicate,
      onDownloadStart,
      onDownloadSuccess,
      onDownloadError,
      onVoid,
      isVoiding,
      i18nProps.locale,
    ],
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
      onCreateNew={onCreateNew}
      entityId={entityId}
      filterConfig={filterConfig}
      t={t}
      locale={i18nProps.locale}
      selectable={!!(onExportSelected || onCopyToInvoice)}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionToolbar={selectionToolbar}
    />
  );
}
