import type { RecurringInvoice } from "@spaceinvoices/js-sdk";
import { recurringInvoices } from "@spaceinvoices/js-sdk";
import { useMemo } from "react";
import { DataTable } from "@/ui/components/table/data-table";
import { FormattedDate } from "@/ui/components/table/date-cell";
import { useTableFetch } from "@/ui/components/table/hooks/use-table-fetch";
import { withTableTranslations } from "@/ui/components/table/locales";
import type { Column, ListTableProps, TableQueryParams, TableQueryResponse } from "@/ui/components/table/types";
import { Badge } from "@/ui/components/ui/badge";
import { createTranslation } from "@/ui/lib/translation";

import RecurringInvoiceListRowActions from "./list-row-actions";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import et from "./locales/et";
import fi from "./locales/fi";
import fr from "./locales/fr";
import hr from "./locales/hr";
import is from "./locales/is";
import it from "./locales/it";
import nb from "./locales/nb";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sk from "./locales/sk";
import sl from "./locales/sl";
import sv from "./locales/sv";

const translations = withTableTranslations({
  en,
  sl,
  bg,
  cs,
  de,
  es,
  et,
  fi,
  fr,
  hr,
  is,
  it,
  nb,
  nl,
  pl,
  pt,
  sk,
  sv,
} as const);

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

function booleanVariant(value: boolean): "default" | "secondary" {
  return value ? "default" : "secondary";
}

type RecurringInvoiceListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  translationLocale?: string;
  entityId?: string;
  editLabel?: string;
  onEditRecurringInvoice?: (recurringInvoice: RecurringInvoice) => void;
  onViewSourceInvoice?: (documentId: string) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: string) => void;
} & ListTableProps<RecurringInvoice>;

export default function RecurringInvoiceListTable({
  queryParams,
  onChangeParams,
  entityId,
  editLabel,
  onEditRecurringInvoice,
  onViewSourceInvoice,
  onDeleteSuccess,
  onDeleteError,
  ...i18nProps
}: RecurringInvoiceListTableProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await recurringInvoices.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
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
        sort: true,
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
        sort: true,
        cell: (ri) => <Badge variant={statusVariant(ri.status)}>{t(`status.${ri.status}`)}</Badge>,
      },
      {
        id: "next_run_date",
        header: t("Next Run"),
        sort: true,
        cell: (ri) =>
          ri.next_run_date ? (
            <FormattedDate date={ri.next_run_date} locale={i18nProps.locale} />
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: "auto_send",
        header: t("Auto-send"),
        cell: (ri) => <Badge variant={booleanVariant(ri.auto_send)}>{ri.auto_send ? t("Yes") : t("No")}</Badge>,
      },
      {
        id: "create_as_draft",
        header: t("Create as draft"),
        cell: (ri) => (
          <Badge variant={booleanVariant(ri.create_as_draft)}>{ri.create_as_draft ? t("Yes") : t("No")}</Badge>
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
        sort: {
          defaultDirection: "desc",
        },
        cell: (ri) => <FormattedDate date={ri.created_at} locale={i18nProps.locale} />,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (ri) => (
          <RecurringInvoiceListRowActions
            recurringInvoice={ri}
            entityId={entityId}
            editLabel={editLabel}
            onEdit={onEditRecurringInvoice}
            onViewSourceInvoice={onViewSourceInvoice}
            onDeleteSuccess={onDeleteSuccess}
            onDeleteError={onDeleteError}
            t={t}
            locale={i18nProps.locale}
          />
        ),
      },
    ],
    [
      t,
      frequencyLabels,
      entityId,
      editLabel,
      onEditRecurringInvoice,
      onViewSourceInvoice,
      onDeleteSuccess,
      onDeleteError,
      i18nProps.locale,
    ],
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
