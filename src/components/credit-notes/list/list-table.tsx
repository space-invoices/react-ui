import type { CreditNote } from "@spaceinvoices/js-sdk";
import { AlertTriangle } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { getFiscalizationFailureType } from "@/ui/lib/fiscalization";
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
  onView?: (creditNote: CreditNote) => void;
  onAddPayment?: (creditNote: CreditNote) => void;
  onDuplicate?: (creditNote: CreditNote) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onExportSelected?: (documentIds: string[]) => void;
  onRetryFiscalization?: (documentIds: string[]) => void;
  fiscalizationFeatures?: ("furs" | "fina")[];
  onCreateNew?: () => void;
} & ListTableProps<CreditNote>;

export default function CreditNoteListTable({
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
  onRetryFiscalization,
  fiscalizationFeatures,
  onCreateNew,
  ...i18nProps
}: CreditNoteListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { sdk } = useSDK();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await sdk.creditNotes.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
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

  const handleExportPdfs = useCallback(() => {
    if (selectedIds.size > 0 && onExportSelected) {
      onExportSelected(Array.from(selectedIds));
    }
  }, [selectedIds, onExportSelected]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectionToolbar = useCallback(
    (count: number, data: CreditNote[]) => {
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

      return (
        <SelectionToolbar
          selectedCount={count}
          onExportPdfs={onExportSelected ? handleExportPdfs : undefined}
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
      handleDeselectAll,
      onExportSelected,
      onRetryFiscalization,
      fiscalizationFeatures,
      selectedIds,
      t,
    ],
  );

  const columns: Column<CreditNote>[] = useMemo(
    () => [
      {
        id: "number",
        header: t("Number"),
        cell: (creditNote) => {
          const failureType = getFiscalizationFailureType(creditNote as any);
          const showWarning = failureType && fiscalizationFeatures?.includes(failureType);
          return (
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
        cell: (creditNote) => creditNote.customer?.name ?? "-",
      },
      {
        id: "date",
        header: t("Date"),
        cell: (creditNote) => <FormattedDate date={creditNote.date} />,
      },
      {
        id: "total",
        header: t("Total"),
        align: "right",
        cell: (creditNote) => creditNote.total,
      },
      {
        id: "total_with_tax",
        header: t("Total with Tax"),
        align: "right",
        cell: (creditNote) => creditNote.total_with_tax,
      },
      {
        id: "status",
        header: t("Status"),
        cell: (creditNote) => <CreditNoteStatusBadge creditNote={creditNote} t={t} />,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (creditNote) => (
          <CreditNoteListRowActions
            creditNote={creditNote}
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
      fiscalizationFeatures,
    ],
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      resourceName="credit_note"
      cacheKey="credit-notes"
      createNewLink={entityId ? `/app/${entityId}/documents/add/credit_note` : undefined}
      onCreateNew={onCreateNew}
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
      filterConfig={filterConfig}
      t={t}
      locale={i18nProps.locale}
      selectable={!!(onExportSelected || onRetryFiscalization)}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionToolbar={selectionToolbar}
    />
  );
}

/** Status badge for credit notes */
function CreditNoteStatusBadge({ creditNote, t }: { creditNote: CreditNote; t: (key: string) => string }) {
  if ((creditNote as any).voided_at) {
    return (
      <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
        {t("Voided")}
      </Badge>
    );
  }
  if ((creditNote as any).is_draft) {
    return null;
  }
  if (creditNote.paid_in_full) {
    return (
      <Badge
        variant="outline"
        className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
      >
        {t("Paid")}
      </Badge>
    );
  }
  if (creditNote.total_paid > 0) {
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
