import type { Invoice } from "@spaceinvoices/js-sdk";
import { invoices } from "@spaceinvoices/js-sdk";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { getDisplayDocumentNumber } from "@/ui/lib/document-display";
import { getEslogSelectionState } from "@/ui/lib/eslog-export";
import { getFiscalizationFailureType } from "@/ui/lib/fiscalization";
import { createTranslation } from "@/ui/lib/translation";

import InvoiceListRowActions from "./list-row-actions";
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

export const invoiceListTranslations = withTableTranslations({
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

type InvoiceListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  translationLocale?: string;
  cacheKey?: string;
  entityId?: string;
  onView?: (invoice: Invoice) => void;
  onAddPayment?: (invoice: Invoice) => void;
  onDuplicate?: (invoice: Invoice) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onExportSelected?: (documentIds: string[]) => void;
  onExportEslogSelected?: (documentIds: string[]) => void;
  pdfExportDisabled?: boolean;
  pdfExportDisabledTooltip?: string;
  eslogExportDisabled?: boolean;
  eslogExportDisabledTooltip?: string;
  onRetryFiscalization?: (documentIds: string[]) => void;
  fiscalizationFeatures?: ("furs" | "fina")[];
  onVoid?: (invoice: Invoice) => void;
  isVoiding?: boolean;
  onCreateNew?: () => void;
  allowSendEmail?: boolean;
  showSearchToolbar?: boolean;
  showPagination?: boolean;
  contentInsetClassName?: string;
  bottomPaddingClassName?: string;
  emptyState?: ReactNode;
  hiddenColumnIds?: string[];
} & ListTableProps<Invoice>;

export default function InvoiceListTable({
  queryParams,
  cacheKey = "invoices",
  onRowClick,
  onView,
  onAddPayment,
  onDuplicate,
  onChangeParams,
  disableUrlSync,
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
  onRetryFiscalization,
  fiscalizationFeatures,
  onVoid,
  isVoiding,
  onCreateNew,
  allowSendEmail = true,
  showSearchToolbar,
  showPagination,
  contentInsetClassName,
  bottomPaddingClassName,
  emptyState,
  hiddenColumnIds,
  ...i18nProps
}: InvoiceListTableProps) {
  const t = createTranslation({
    ...i18nProps,
    translations: invoiceListTranslations,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await invoices.list({
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
      statusOptions: ["paid", "partially_paid", "unpaid", "overdue", "voided"],
      statusQueryPreset: "invoice",
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

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectionToolbar = useCallback(
    (count: number, data: Invoice[]) => {
      const selectedDocs = data.filter((d) => selectedIds.has(d.id));
      const eslogSelection = getEslogSelectionState(selectedDocs);
      const failedDocs = selectedDocs.filter((d) => {
        const failureType = getFiscalizationFailureType(d as any);
        return failureType && fiscalizationFeatures?.includes(failureType);
      });

      const hasRetry = onRetryFiscalization && fiscalizationFeatures?.length;
      const failedCount = failedDocs.length;
      const allFailed = failedCount > 0 && failedCount === selectedDocs.length;
      const someFailed = failedCount > 0 && failedCount < selectedDocs.length;
      const showRetry = hasRetry && failedCount > 0;

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
          onRetryFiscalization={showRetry ? () => onRetryFiscalization(failedDocs.map((d) => d.id)) : undefined}
          retryFiscalizationDisabled={someFailed && !allFailed}
          retryFiscalizationTooltip={
            someFailed ? t("Some selected documents don't have failed fiscalization") : undefined
          }
          onDeselectAll={handleDeselectAll}
          t={t}
        />
      );
    },
    [
      handleExportPdfs,
      handleExportEslog,
      handleDeselectAll,
      onExportSelected,
      onExportEslogSelected,
      pdfExportDisabled,
      pdfExportDisabledTooltip,
      eslogExportDisabled,
      eslogExportDisabledTooltip,
      onRetryFiscalization,
      fiscalizationFeatures,
      selectedIds,
      t,
    ],
  );

  const columns: Column<Invoice>[] = useMemo(
    () => [
      {
        id: "number",
        header: t("Number"),
        sort: {
          defaultDirection: "desc",
        },
        cell: (invoice) => {
          const failureType = getFiscalizationFailureType(invoice as any);
          const showWarning = failureType && fiscalizationFeatures?.includes(failureType);
          return (
            <div className="flex items-center gap-2">
              <Button variant="link" className="cursor-pointer py-0 underline" onClick={() => onRowClick?.(invoice)}>
                {getDisplayDocumentNumber(invoice as Invoice & { is_draft?: boolean }, t)}
              </Button>
              {(invoice as any).is_draft && (
                <Badge
                  variant="outline"
                  className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                >
                  {t("Draft")}
                </Badge>
              )}
              {showWarning && (
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="size-4 text-orange-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t(failureType === "furs" ? "FURS fiscalization failed" : "FINA fiscalization failed")}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        id: "customer",
        header: t("Customer"),
        cell: (invoice) => invoice.customer?.name ?? "-",
      },
      {
        id: "date",
        header: t("Date"),
        sort: {
          defaultDirection: "desc",
        },
        cell: (invoice) => <FormattedDate date={invoice.date} locale={i18nProps.locale} />,
      },
      {
        id: "date_due",
        header: t("Date Due"),
        sort: true,
        cell: (invoice) => <FormattedDate date={invoice.date_due} locale={i18nProps.locale} />,
      },
      {
        id: "total",
        header: t("Total"),
        align: "right",
        sort: true,
        cell: (invoice) => invoice.total,
      },
      {
        id: "total_with_tax",
        header: t("Total with Tax"),
        align: "right",
        sort: true,
        cell: (invoice) => invoice.total_with_tax,
      },
      {
        id: "status",
        header: t("Status"),
        cell: (invoice) => <InvoiceStatusBadge invoice={invoice} t={t} />,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (invoice) => (
          <InvoiceListRowActions
            invoice={invoice}
            onView={onView}
            onAddPayment={onAddPayment}
            onDuplicate={onDuplicate}
            onDownloadStart={onDownloadStart}
            onDownloadSuccess={onDownloadSuccess}
            onDownloadError={onDownloadError}
            onVoid={onVoid}
            isVoiding={isVoiding}
            allowSendEmail={allowSendEmail}
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
      onVoid,
      isVoiding,
      allowSendEmail,
      i18nProps.locale,
      fiscalizationFeatures,
    ],
  );

  const visibleColumns = useMemo(() => {
    if (!hiddenColumnIds?.length) {
      return columns;
    }

    const hidden = new Set(hiddenColumnIds);
    return columns.filter((column) => !hidden.has(column.id));
  }, [columns, hiddenColumnIds]);

  return (
    <DataTable
      columns={visibleColumns}
      queryParams={queryParams}
      resourceName="invoice"
      cacheKey={cacheKey}
      createNewLink={entityId ? `/app/${entityId}/documents/add/invoice` : undefined}
      onCreateNew={onCreateNew}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      disableUrlSync={disableUrlSync}
      entityId={entityId}
      filterConfig={filterConfig}
      t={t}
      locale={i18nProps.locale}
      selectable={!!(onExportSelected || onExportEslogSelected || onRetryFiscalization)}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionToolbar={selectionToolbar}
      showSearchToolbar={showSearchToolbar}
      showPagination={showPagination}
      contentInsetClassName={contentInsetClassName}
      bottomPaddingClassName={bottomPaddingClassName}
      emptyState={emptyState}
    />
  );
}

/** Status badge for invoices */
export function InvoiceStatusBadge({ invoice, t }: { invoice: Invoice; t: (key: string) => string }) {
  if ((invoice as any).voided_at) {
    return (
      <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
        {t("Voided")}
      </Badge>
    );
  }
  if ((invoice as any).is_draft) {
    return null;
  }
  if (invoice.paid_in_full) {
    return (
      <Badge
        variant="outline"
        className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
      >
        {t("Paid")}
      </Badge>
    );
  }
  if (invoice.date_due && new Date(invoice.date_due) < new Date()) {
    return (
      <Badge
        variant="outline"
        className="border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
      >
        {t("Overdue")}
      </Badge>
    );
  }
  if (invoice.total_paid > 0) {
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
