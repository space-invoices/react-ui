import type { AdvanceInvoice } from "@spaceinvoices/js-sdk";
import { advanceInvoices } from "@spaceinvoices/js-sdk";
import { AlertTriangle } from "lucide-react";
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
import { getFiscalizationFailureType } from "@/ui/lib/fiscalization";
import { createTranslation } from "@/ui/lib/translation";

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

type AdvanceInvoiceListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  translationLocale?: string;
  entityId?: string;
  onView?: (advanceInvoice: AdvanceInvoice) => void;
  onAddPayment?: (advanceInvoice: AdvanceInvoice) => void;
  onDuplicate?: (advanceInvoice: AdvanceInvoice) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onExportSelected?: (documentIds: string[]) => void;
  pdfExportDisabled?: boolean;
  pdfExportDisabledTooltip?: string;
  onCopyToInvoice?: (documentIds: string[]) => void;
  onRetryFiscalization?: (documentIds: string[]) => void;
  fiscalizationFeatures?: ("furs" | "fina")[];
  onCreateNew?: () => void;
  onVoid?: (advanceInvoice: AdvanceInvoice) => void;
  isVoiding?: boolean;
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
  pdfExportDisabled,
  pdfExportDisabledTooltip,
  onCopyToInvoice,
  onRetryFiscalization,
  fiscalizationFeatures,
  onCreateNew,
  onVoid,
  isVoiding,
  ...i18nProps
}: AdvanceInvoiceListTableProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await advanceInvoices.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
      include: "document_relations",
    });
    return response as unknown as TableQueryResponse<AdvanceInvoice>;
  }, entityId);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      dateFields: [
        { id: "date", label: t("Date") },
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

  const handleCopyToInvoice = useCallback(() => {
    if (selectedIds.size > 0 && onCopyToInvoice) {
      onCopyToInvoice(Array.from(selectedIds));
    }
  }, [selectedIds, onCopyToInvoice]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectionToolbar = useCallback(
    (count: number, data: AdvanceInvoice[]) => {
      const selectedDocs = data.filter((d) => selectedIds.has(d.id));
      const failedDocs = selectedDocs.filter((d) => {
        const failureType = getFiscalizationFailureType(d as any);
        return failureType && fiscalizationFeatures?.includes(failureType);
      });

      const hasRetry = onRetryFiscalization && fiscalizationFeatures?.length;
      const failedCount = failedDocs.length;
      const allFailed = failedCount > 0 && failedCount === selectedDocs.length;
      const someFailed = failedCount > 0 && failedCount < selectedDocs.length;
      const showRetry = hasRetry && failedCount > 0;

      const hasDrafts = selectedDocs.some((d) => (d as any).is_draft);
      const hasVoided = selectedDocs.some((d) => !!(d as any).voided_at);
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
      handleCopyToInvoice,
      handleDeselectAll,
      onExportSelected,
      pdfExportDisabled,
      pdfExportDisabledTooltip,
      onCopyToInvoice,
      onRetryFiscalization,
      fiscalizationFeatures,
      selectedIds,
      t,
    ],
  );

  const columns: Column<AdvanceInvoice>[] = useMemo(
    () => [
      {
        id: "number",
        header: t("Number"),
        sort: {
          defaultDirection: "desc",
        },
        cell: (advanceInvoice) => {
          const failureType = getFiscalizationFailureType(advanceInvoice as any);
          const showWarning = failureType && fiscalizationFeatures?.includes(failureType);
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="link"
                className="cursor-pointer py-0 underline"
                onClick={() => onRowClick?.(advanceInvoice)}
              >
                {getDisplayDocumentNumber(advanceInvoice as AdvanceInvoice & { is_draft?: boolean }, t)}
              </Button>
              {(advanceInvoice as any).is_draft && (
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
        cell: (advanceInvoice) => advanceInvoice.customer?.name ?? "-",
      },
      {
        id: "date",
        header: t("Date"),
        sort: {
          defaultDirection: "desc",
        },
        cell: (advanceInvoice) => <FormattedDate date={advanceInvoice.date} locale={i18nProps.locale} />,
      },
      {
        id: "total",
        header: t("Total"),
        align: "right",
        sort: {
          defaultDirection: "desc",
        },
        cell: (advanceInvoice) => advanceInvoice.total,
      },
      {
        id: "total_with_tax",
        header: t("Total with Tax"),
        align: "right",
        sort: {
          defaultDirection: "desc",
        },
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
      onAddPayment,
      onDuplicate,
      onDownloadStart,
      onDownloadSuccess,
      onDownloadError,
      onVoid,
      isVoiding,
      i18nProps.locale,
      fiscalizationFeatures,
    ],
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      resourceName="advance_invoice"
      cacheKey="advance-invoices"
      createNewLink={entityId ? `/app/${entityId}/documents/add/advance_invoice` : undefined}
      onCreateNew={onCreateNew}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
      filterConfig={filterConfig}
      t={t}
      locale={i18nProps.locale}
      selectable={!!(onExportSelected || onCopyToInvoice || onRetryFiscalization)}
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
