import type { Payment } from "@spaceinvoices/js-sdk";
import { Info } from "lucide-react";
import { useMemo } from "react";
import { DataTable } from "@/ui/components/table/data-table";
import { FormattedDate } from "@/ui/components/table/date-cell";
import { useTableFetch } from "@/ui/components/table/hooks/use-table-fetch";
import type { Column, ListTableProps, TableQueryParams, TableQueryResponse } from "@/ui/components/table/types";
import { Button } from "@/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";

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

// Extended payment type that includes Invoice relation from API
type PaymentWithInvoice = Payment & {
  Invoice?: { id: string; number: string } | null;
};

type PaymentListTableProps = {
  t?: (key: string) => string;
  namespace?: string;
  locale?: string;
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
    translations,
    ...i18nProps,
  });

  const { sdk } = useSDK();

  const handleFetch = useTableFetch(async (params: TableQueryParams) => {
    if (!sdk) throw new Error("SDK not initialized");
    if (!params.entity_id) throw new Error("Entity ID required");

    const response = await sdk.payments.list({
      entity_id: params.entity_id,
      limit: params.limit,
      next_cursor: params.next_cursor,
      prev_cursor: params.prev_cursor,
      order_by: params.order_by,
      search: params.search,
      query: params.query,
    });
    return response as unknown as TableQueryResponse<Payment>;
  }, entityId);

  const typeLabels: Record<string, string> = useMemo(
    () => ({
      cash: t("type.cash"),
      bank_transfer: t("type.bank_transfer"),
      card: t("type.card"),
      check: t("type.check"),
      other: t("type.other"),
    }),
    [t],
  );

  const columns: Column<PaymentWithInvoice>[] = useMemo(
    () => [
      {
        id: "date",
        header: t("Date"),
        sortable: true,
        cell: (payment) => <FormattedDate date={payment.date} />,
      },
      {
        id: "amount",
        header: t("Amount"),
        sortable: true,
        align: "right",
        cell: (payment) => <span className="font-medium">{payment.amount.toFixed(2)}</span>,
      },
      {
        id: "type",
        header: t("Type"),
        sortable: true,
        cell: (payment) => typeLabels[payment.type] ?? payment.type,
      },
      {
        id: "invoice",
        header: t("Invoice"),
        cell: (payment) =>
          payment.Invoice ? (
            <Button
              variant="link"
              className="h-auto cursor-pointer p-0 text-foreground underline"
              onClick={() => onViewInvoice?.(payment.Invoice!.id)}
            >
              {payment.Invoice.number}
            </Button>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
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
        cell: (payment) => <NoteCell note={payment.note} />,
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
    [t, typeLabels, entityId, onViewInvoice, onEditPayment, onDeleteSuccess, onDeleteError, i18nProps.locale],
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
function NoteCell({ note }: { note?: string | null }) {
  if (!note) return "-";

  const hasLongNote = note.length > 30;

  return (
    <div className="flex items-center gap-1">
      <span className="truncate">{note}</span>
      {hasLongNote && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <p className="text-sm">{note}</p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
