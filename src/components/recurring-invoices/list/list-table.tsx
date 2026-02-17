import type { RecurringInvoice } from "@spaceinvoices/js-sdk";
import { useMemo } from "react";
import { DataTable } from "@/ui/components/table/data-table";
import { FormattedDate } from "@/ui/components/table/date-cell";
import { useTableFetch } from "@/ui/components/table/hooks/use-table-fetch";
import type { Column, ListTableProps, TableQueryParams, TableQueryResponse } from "@/ui/components/table/types";
import { Badge } from "@/ui/components/ui/badge";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";

import RecurringInvoiceListRowActions from "./list-row-actions";
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

function statusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "paused":
      return "secondary";
    default:
      return "outline";
  }
}

type RecurringInvoiceListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  entityId?: string;
  onViewSourceInvoice?: (documentId: string) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: string) => void;
} & ListTableProps<RecurringInvoice>;

export default function RecurringInvoiceListTable({
  queryParams,
  onChangeParams,
  entityId,
  onViewSourceInvoice,
  onDeleteSuccess,
  onDeleteError,
  ...i18nProps
}: RecurringInvoiceListTableProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { sdk } = useSDK();

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await sdk.recurringInvoices.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      search: params.search,
      query: params.query,
    });
    return response as unknown as TableQueryResponse<RecurringInvoice>;
  }, entityId);

  const frequencyLabels: Record<string, string> = useMemo(
    () => ({
      daily: t("frequency.daily"),
      weekly: t("frequency.weekly"),
      monthly: t("frequency.monthly"),
      yearly: t("frequency.yearly"),
    }),
    [t],
  );

  const columns: Column<RecurringInvoice>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("Name"),
        cell: (ri) => <span className="font-medium">{ri.name}</span>,
      },
      {
        id: "frequency",
        header: t("Frequency"),
        cell: (ri) => {
          const label = frequencyLabels[ri.frequency] ?? ri.frequency;
          return ri.interval > 1 ? `${t("Every")} ${ri.interval} ${label.toLowerCase()}` : label;
        },
      },
      {
        id: "status",
        header: t("Status"),
        cell: (ri) => <Badge variant={statusVariant(ri.status)}>{t(`status.${ri.status}`)}</Badge>,
      },
      {
        id: "next_run_date",
        header: t("Next Run"),
        cell: (ri) =>
          ri.next_run_date ? (
            <FormattedDate date={ri.next_run_date} />
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: "invoices_generated",
        header: t("Generated"),
        align: "right",
        cell: (ri) => ri.invoices_generated,
      },
      {
        id: "created_at",
        header: t("Created"),
        cell: (ri) => <FormattedDate date={ri.created_at} />,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (ri) => (
          <RecurringInvoiceListRowActions
            recurringInvoice={ri}
            entityId={entityId}
            onViewSourceInvoice={onViewSourceInvoice}
            onDeleteSuccess={onDeleteSuccess}
            onDeleteError={onDeleteError}
            t={t}
            locale={i18nProps.locale}
          />
        ),
      },
    ],
    [t, frequencyLabels, entityId, onViewSourceInvoice, onDeleteSuccess, onDeleteError, i18nProps.locale],
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      resourceName="recurring-invoice"
      cacheKey="recurring-invoices"
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
      t={t}
      locale={i18nProps.locale}
    />
  );
}
