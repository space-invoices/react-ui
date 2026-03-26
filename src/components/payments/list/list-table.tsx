import type { Payment } from "@spaceinvoices/js-sdk";
import { payments } from "@spaceinvoices/js-sdk";
import { Info } from "lucide-react";
import { useMemo } from "react";
import { DataTable } from "@/ui/components/table/data-table";
import { FormattedDate } from "@/ui/components/table/date-cell";
import { useTableFetch } from "@/ui/components/table/hooks/use-table-fetch";
import { withTableTranslations } from "@/ui/components/table/locales";
import type { Column, ListTableProps, TableQueryParams, TableQueryResponse } from "@/ui/components/table/types";
import { Button } from "@/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { getPaymentDocumentDisplay, getPaymentTypeLabel, localizePaymentNote } from "@/ui/lib/payment-display";
import { createTranslation } from "@/ui/lib/translation";

import PaymentListRowActions from "./list-row-actions";
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

type PaymentWithDocument = Payment & {
  Invoice?: { id: string; number: string } | null;
  CreditNote?: { id: string; number: string } | null;
  AdvanceInvoice?: { id: string; number: string } | null;
  IncomingPurchaseDocument?: { id: string; supplier_document_number?: string | null } | null;
};

type PaymentListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
  translationLocale?: string;
  entityId?: string;
  onViewInvoice?: (invoiceId: string) => void;
  onEditPayment?: (payment: Payment) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: string) => void;
} & ListTableProps<Payment>;

export default function PaymentListTable({
  queryParams,
  onChangeParams,
  entityId,
  onViewInvoice,
  onEditPayment,
  onDeleteSuccess,
  onDeleteError,
  ...i18nProps
}: PaymentListTableProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });
  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await payments.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
      include: "Invoice,CreditNote,AdvanceInvoice,IncomingPurchaseDocument",
    });
    return response as unknown as TableQueryResponse<PaymentWithDocument>;
  }, entityId);

  const columns: Column<PaymentWithDocument>[] = useMemo(
    () => [
      {
        id: "date",
        header: t("Date"),
        sort: {
          defaultDirection: "desc",
        },
        cell: (payment) => <FormattedDate date={payment.date} locale={i18nProps.locale} />,
      },
      {
        id: "amount",
        header: t("Amount"),
        align: "right",
        sort: {
          defaultDirection: "desc",
        },
        cell: (payment) => (
          <span className="font-medium">
            {new Intl.NumberFormat(i18nProps.locale, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(payment.amount)}
          </span>
        ),
      },
      {
        id: "type",
        header: t("Type"),
        sort: true,
        cell: (payment) => getPaymentTypeLabel(payment.type, t),
      },
      {
        id: "document",
        header: t("Document"),
        cell: (payment) => {
          const document = getPaymentDocumentDisplay(payment);

          if (!document) {
            return <span className="text-muted-foreground">-</span>;
          }

          if (document.isNavigable) {
            return (
              <Button
                variant="link"
                className="h-auto cursor-pointer p-0 text-foreground underline"
                onClick={() => onViewInvoice?.(document.id)}
              >
                {document.label}
              </Button>
            );
          }

          return <span>{document.label}</span>;
        },
      },
      {
        id: "reference",
        header: t("Reference"),
        cell: (payment) => payment.reference ?? "-",
      },
      {
        id: "note",
        header: t("Note"),
        className: "max-w-[200px]",
        cell: (payment) => <NoteCell note={payment.note} t={t} />,
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (payment) => (
          <PaymentListRowActions
            payment={payment}
            entityId={entityId}
            onViewInvoice={onViewInvoice}
            onEditPayment={onEditPayment}
            onDeleteSuccess={onDeleteSuccess}
            onDeleteError={onDeleteError}
            t={t}
            locale={i18nProps.locale}
          />
        ),
      },
    ],
    [t, entityId, onViewInvoice, onEditPayment, onDeleteSuccess, onDeleteError, i18nProps.locale],
  );

  return (
    <DataTable
      columns={columns}
      queryParams={queryParams}
      resourceName="payment"
      cacheKey="payments"
      onFetch={handleFetch}
      onChangeParams={onChangeParams}
      entityId={entityId}
      t={t}
      locale={i18nProps.locale}
    />
  );
}

/** Note cell with popover for long notes */
function NoteCell({ note, t }: { note?: string | null; t: (key: string) => string }) {
  const localizedNote = localizePaymentNote(note, t);
  if (!localizedNote) return "-";

  const hasLongNote = localizedNote.length > 30;

  return (
    <div className="flex items-center gap-1">
      <span className="truncate">{localizedNote}</span>
      {hasLongNote && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <p className="text-sm">{localizedNote}</p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
