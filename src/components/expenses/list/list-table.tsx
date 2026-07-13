import type { Expense } from "@spaceinvoices/js-sdk";
import { expenses } from "@spaceinvoices/js-sdk";
import { CircleAlert, FilePenLine, Receipt, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { DataTable } from "@/ui/components/table/data-table";
import { FormattedDate } from "@/ui/components/table/date-cell";
import { useTableFetch } from "@/ui/components/table/hooks/use-table-fetch";
import { withTableTranslations } from "@/ui/components/table/locales";
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
import { formatDateOnlyForDisplay, toLocalCalendarDate, toLocalDateOnlyString } from "@/ui/lib/date-only";
import { formatCurrencyValue } from "@/ui/lib/formatting";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";

import ExpenseListRowActions from "./list-row-actions";
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

export const expenseListTranslations = withTableTranslations({
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
  sv,
  fi,
  et,
  bg,
  cs,
  sk,
  nb,
  is,
} as const);

function MissingValuePlaceholder() {
  return <span className="inline-flex min-h-8 min-w-12 items-center text-muted-foreground">—</span>;
}

type ExpenseListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  translationLocale?: string;
  cacheKey?: string;
  entityId?: string;
  onView?: (expense: Expense) => void;
  onEdit?: (expense: Expense) => void;
  onMarkPaid?: (expense: Expense) => void;
  onDeleteDraft?: (expense: Expense) => void;
  onVoid?: (expense: Expense) => void;
  onCreateNew?: () => void;
  onUploadDocument?: () => void;
  onEnterManually?: () => void;
  showSearchToolbar?: boolean;
  showPagination?: boolean;
  contentInsetClassName?: string;
  bottomPaddingClassName?: string;
  emptyState?: ReactNode;
} & ListTableProps<Expense>;

export default function ExpenseListTable({
  queryParams,
  cacheKey = "expenses",
  onRowClick,
  onView,
  onEdit,
  onMarkPaid,
  onDeleteDraft,
  onVoid,
  onChangeParams,
  disableUrlSync,
  entityId,
  onCreateNew,
  onUploadDocument,
  onEnterManually,
  showSearchToolbar,
  showPagination,
  contentInsetClassName,
  bottomPaddingClassName,
  emptyState,
  ...i18nProps
}: ExpenseListTableProps) {
  const t = createTranslation({
    ...i18nProps,
    translations: expenseListTranslations,
  });

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!params.entity_id) throw new Error("Entity ID required");

    const status = params.filter_status?.split(",")[0];
    let query = params.query;
    if (status === "partially_paid" || status === "overdue" || status === "due_soon") {
      const existingQuery = (() => {
        try {
          const parsed = query ? JSON.parse(query) : {};
          return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        } catch {
          return {};
        }
      })();
      const dueSoonDate = new Date();
      dueSoonDate.setDate(dueSoonDate.getDate() + 7);
      const statusQuery =
        status === "partially_paid"
          ? {
              is_draft: { equals: false },
              paid_in_full: { equals: false },
              total_paid: { gt: 0 },
              voided_at: { equals: null },
            }
          : status === "overdue"
            ? {
                is_draft: { equals: false },
                paid_in_full: { equals: false },
                date_due: { lt: toLocalDateOnlyString(new Date()) },
                voided_at: { equals: null },
              }
            : {
                is_draft: { equals: false },
                paid_in_full: { equals: false },
                date_due: {
                  between: [toLocalDateOnlyString(new Date()), toLocalDateOnlyString(dueSoonDate)],
                },
                voided_at: { equals: null },
              };
      query = JSON.stringify({ ...existingQuery, ...statusQuery });
    }

    const response = await expenses.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query,
      has_attachment: status === "missing_attachment" ? false : undefined,
    });
    return response as unknown as TableQueryResponse<Expense>;
  }, entityId);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      dateFields: [
        { id: "date", label: t("Document date") },
        { id: "date_received", label: t("Received date") },
        { id: "date_due", label: t("Due date") },
      ],
      statusFilter: true,
      statusOptions: [
        "draft",
        "unpaid",
        "partially_paid",
        "due_soon",
        "overdue",
        "missing_attachment",
        "paid",
        "voided",
      ],
      statusQueryPreset: "expense",
    }),
    [t],
  );

  const columns: Column<Expense>[] = useMemo(
    () => [
      {
        id: "supplier",
        header: t("Supplier"),
        cell: (expense) =>
          expense.supplier?.name ? (
            <span className="font-medium">{expense.supplier.name}</span>
          ) : (
            <MissingValuePlaceholder />
          ),
      },
      {
        id: "supplier_document_number",
        header: t("Supplier invoice no."),
        cell: (expense) => (
          <Button variant="link" className="cursor-pointer py-0 underline" onClick={() => onRowClick?.(expense)}>
            {expense.supplier_document_number || "—"}
          </Button>
        ),
      },
      {
        id: "date",
        header: t("Document date"),
        sort: {
          defaultDirection: "desc",
        },
        cell: (expense) => <FormattedDate date={expense.date} locale={i18nProps.locale} />,
      },
      {
        id: "date_due",
        header: t("Due date"),
        sort: true,
        cell: (expense) => <ExpenseDueDate expense={expense} t={t} locale={i18nProps.locale} />,
      },
      {
        id: "amount",
        header: t("Amount"),
        align: "right",
        cell: (expense) =>
          expense.total_with_tax == null ? (
            <MissingValuePlaceholder />
          ) : (
            formatCurrencyValue(expense.total_with_tax, expense.currency_code || "EUR", i18nProps.locale)
          ),
      },
      {
        id: "balance",
        header: t("Balance"),
        align: "right",
        sort: { asc: "total_due", desc: "-total_due" },
        cell: (expense) =>
          expense.total_with_tax == null ? (
            <MissingValuePlaceholder />
          ) : (
            <span className={cn(expense.total_due > 0 && "font-medium text-destructive")}>
              {formatCurrencyValue(expense.total_due ?? 0, expense.currency_code || "EUR", i18nProps.locale)}
            </span>
          ),
      },
      {
        id: "status",
        header: t("Status"),
        cell: (expense) => (
          <div className="flex items-center gap-2">
            <ExpenseStatusBadge expense={expense} t={t} />
            <ExpenseRecordIndicators expense={expense} t={t} />
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (expense) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: wrapper only stops row-click propagation for the nested action menu
          // biome-ignore lint/a11y/useKeyWithClickEvents: no keyboard handler needed; interactivity lives in the nested menu trigger
          <div onClick={(e) => e.stopPropagation()}>
            <ExpenseListRowActions
              expense={expense}
              onView={onView}
              onEdit={onEdit}
              onMarkPaid={onMarkPaid}
              onDeleteDraft={onDeleteDraft}
              onVoid={onVoid}
              t={t}
              locale={i18nProps.locale}
            />
          </div>
        ),
      },
    ],
    [t, onRowClick, onView, onEdit, onMarkPaid, onDeleteDraft, onVoid, i18nProps.locale],
  );

  const defaultEmptyState = (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Receipt className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">{t("No expenses yet")}</p>
        <p className="text-muted-foreground text-sm">{t("Get started by recording your first supplier invoice")}</p>
      </div>
      {onUploadDocument || onEnterManually || onCreateNew ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onUploadDocument ? (
            <Button onClick={onUploadDocument}>
              <Upload className="mr-2 h-4 w-4" />
              {t("Upload document")}
            </Button>
          ) : null}
          {onEnterManually || onCreateNew ? (
            <Button variant={onUploadDocument ? "outline" : "default"} onClick={onEnterManually ?? onCreateNew}>
              <FilePenLine className="mr-2 h-4 w-4" />
              {t(onCreateNew && !onEnterManually ? "New expense" : "Enter manually")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      resourceName="expense"
      cacheKey={cacheKey}
      onCreateNew={onCreateNew}
      onFetch={handleFetch}
      onRowClick={onRowClick}
      onChangeParams={onChangeParams}
      disableUrlSync={disableUrlSync}
      entityId={entityId}
      filterConfig={filterConfig}
      t={t}
      locale={i18nProps.locale}
      showSearchToolbar={showSearchToolbar}
      showPagination={showPagination}
      contentInsetClassName={contentInsetClassName}
      bottomPaddingClassName={bottomPaddingClassName}
      emptyState={emptyState ?? defaultEmptyState}
    />
  );
}

export type ExpenseStatusLike = Pick<Expense, "is_draft" | "paid_in_full" | "total_paid" | "total_due" | "voided_at">;

export type ExpenseStatus = "draft" | "open" | "partially_paid" | "paid" | "voided";

export function getExpenseStatus(expense: ExpenseStatusLike): ExpenseStatus {
  if (expense.voided_at) return "voided";
  if (expense.is_draft) return "draft";
  if (expense.paid_in_full) return "paid";
  if (expense.total_paid > 0 && expense.total_due > 0) return "partially_paid";
  return "open";
}

/** Status badge for expenses (accounts payable) */
export function ExpenseStatusBadge({ expense, t }: { expense: ExpenseStatusLike; t: (key: string) => string }) {
  const status = getExpenseStatus(expense);
  if (status === "voided") {
    return (
      <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
        {t("Voided")}
      </Badge>
    );
  }
  if (status === "draft") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
      >
        {t("Draft")}
      </Badge>
    );
  }
  if (status === "paid") {
    return (
      <Badge
        variant="outline"
        className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
      >
        {t("Paid")}
      </Badge>
    );
  }
  if (status === "partially_paid") {
    return (
      <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        {t("Partially Paid")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
      {t("Open")}
    </Badge>
  );
}

type ExpenseDueDateProps = {
  expense: Pick<Expense, "date_due" | "is_draft" | "paid_in_full" | "voided_at">;
  t: (key: string) => string;
  locale?: string;
};

export function ExpenseDueDate({ expense, t, locale }: ExpenseDueDateProps) {
  if (!expense.date_due) return <span className="text-muted-foreground">—</span>;

  const formattedDate = formatDateOnlyForDisplay(expense.date_due, locale);
  if (expense.is_draft || expense.paid_in_full || expense.voided_at) return <>{formattedDate}</>;

  const dueDate = toLocalCalendarDate(expense.date_due);
  if (!dueDate) return <>{formattedDate}</>;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
  if (daysUntilDue >= 0) return <>{formattedDate}</>;

  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(daysUntilDue, "day");

  return (
    <div className="space-y-0.5 font-medium text-destructive">
      <div>{formattedDate}</div>
      <div className="text-xs">
        {t("Overdue")} · {relative}
      </div>
    </div>
  );
}

function getMissingLabels(expense: Expense): string[] {
  const labels: string[] = [];
  if (!expense.supplier?.name) labels.push("Supplier");
  if (!expense.supplier_document_number) labels.push("Supplier invoice no.");
  if (!expense.date && !expense.date_received) labels.push("Document date");
  if (expense.total_with_tax == null) labels.push("Amount");
  return labels;
}

export function ExpenseRecordIndicators({ expense, t }: { expense: Expense; t: (key: string) => string }) {
  const missingLabels = getMissingLabels(expense).map(t);
  if (missingLabels.length === 0) return null;
  const description = `${t("Missing required data")}: ${missingLabels.join(", ")}`;

  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded-sm text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={description}
            onClick={(event) => event.stopPropagation()}
          >
            <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
            {missingLabels.length}
          </button>
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
    </span>
  );
}
