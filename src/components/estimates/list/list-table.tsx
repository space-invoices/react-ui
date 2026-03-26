import type { Estimate } from "@spaceinvoices/js-sdk";
import { estimates } from "@spaceinvoices/js-sdk";
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
import { getDisplayDocumentNumber } from "@/ui/lib/document-display";
import { getEslogSelectionState } from "@/ui/lib/eslog-export";
import { createTranslation } from "@/ui/lib/translation";

import EstimateListRowActions from "./list-row-actions";
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

type EstimateListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  translationLocale?: string;
  entityId?: string;
  onView?: (estimate: Estimate) => void;
  onDuplicate?: (estimate: Estimate) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onExportSelected?: (documentIds: string[]) => void;
  onExportEslogSelected?: (documentIds: string[]) => void;
  pdfExportDisabled?: boolean;
  pdfExportDisabledTooltip?: string;
  eslogExportDisabled?: boolean;
  eslogExportDisabledTooltip?: string;
  onCopyToInvoice?: (documentIds: string[]) => void;
  onCreateNew?: () => void;
} & ListTableProps<Estimate>;

export default function EstimateListTable({
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
  onExportEslogSelected,
  pdfExportDisabled,
  pdfExportDisabledTooltip,
  eslogExportDisabled,
  eslogExportDisabledTooltip,
  onCopyToInvoice,
  onCreateNew,
  ...i18nProps
}: EstimateListTableProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await estimates.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
    });
    return response as unknown as TableQueryResponse<Estimate>;
  }, entityId);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      dateFields: [
        { id: "date", label: t("Date") },
        { id: "date_valid_till", label: t("Valid Until") },
        { id: "created_at", label: t("Created At") },
      ],
      statusFilter: false, // Estimates don't have payment status
    }),
    [t],
  );

  const handleExportPdfs = useCallback(() => {
    if (selectedIds.size > 0 && onExportSelected) {
      onExportSelected(Array.from(selectedIds));
    }
  }, [selectedIds, onExportSelected]);

  const handleExportEslog = useCallback(() => {
    if (selectedIds.size > 0 && onExportEslogSelected) {
      onExportEslogSelected(Array.from(selectedIds));
    }
  }, [selectedIds, onExportEslogSelected]);

  const handleCopyToInvoice = useCallback(() => {
    if (selectedIds.size > 0 && onCopyToInvoice) {
      onCopyToInvoice(Array.from(selectedIds));
    }
  }, [selectedIds, onCopyToInvoice]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectionToolbar = useCallback(
    (count: number, data: Estimate[]) => {
      const selectedDocs = data.filter((d) => selectedIds.has(d.id));
      const eslogSelection = getEslogSelectionState(selectedDocs);
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
          onExportEslog={onExportEslogSelected ? handleExportEslog : undefined}
          exportEslogDisabled={eslogExportDisabled || eslogSelection.noneEligible}
          exportEslogTooltip={
            eslogExportDisabled
              ? eslogExportDisabledTooltip
              : eslogSelection.noneEligible
                ? t("None of the selected documents are valid for e-SLOG export")
                : undefined
          }
          exportEslogWarning={!eslogExportDisabled && eslogSelection.partiallyEligible}
          exportEslogWarningTooltip={
            !eslogExportDisabled && eslogSelection.partiallyEligible
              ? t("Some selected documents are not valid for e-SLOG export and will be skipped")
              : undefined
          }
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
      handleExportEslog,
      handleCopyToInvoice,
      handleDeselectAll,
      onExportSelected,
      onExportEslogSelected,
      pdfExportDisabled,
      pdfExportDisabledTooltip,
      eslogExportDisabled,
      eslogExportDisabledTooltip,
      onCopyToInvoice,
      selectedIds,
      t,
    ],
  );

  const columns: Column<Estimate>[] = useMemo(
    () => [
      {
        id: "number",
        header: t("Number"),
        sort: {
          defaultDirection: "desc",
        },
        cell: (estimate) => (
          <div className="flex items-center gap-2">
            <Button variant="link" className="cursor-pointer py-0 underline" onClick={() => onRowClick?.(estimate)}>
              {getDisplayDocumentNumber(estimate as Estimate & { is_draft?: boolean }, t)}
            </Button>
            {(estimate as any).is_draft && (
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
        cell: (estimate) => estimate.customer?.name ?? "-",
      },
      {
        id: "date",
        header: t("Date"),
        sort: {
          defaultDirection: "desc",
        },
        cell: (estimate) => <FormattedDate date={estimate.date} locale={i18nProps.locale} />,
      },
      {
        id: "date_valid_till",
        header: t("Valid Until"),
        sort: true,
        cell: (estimate) => <FormattedDate date={estimate.date_valid_till} locale={i18nProps.locale} />,
      },
      {
        id: "total",
        header: t("Total"),
        align: "right",
        sort: {
          defaultDirection: "desc",
        },
        cell: (estimate) => estimate.total,
      },
      {
        id: "total_with_tax",
        header: t("Total with Tax"),
        align: "right",
        sort: {
          defaultDirection: "desc",
        },
        cell: (estimate) => estimate.total_with_tax,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (estimate) => (
          <EstimateListRowActions
            estimate={estimate}
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
      cacheKey="estimates"
      resourceName="estimate"
      createNewLink={entityId ? `/app/${entityId}/documents/add/estimate` : undefined}
      onCreateNew={onCreateNew}
      entityId={entityId}
      filterConfig={filterConfig}
      t={t}
      locale={i18nProps.locale}
      selectable={!!(onExportSelected || onExportEslogSelected || onCopyToInvoice)}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionToolbar={selectionToolbar}
    />
  );
}
