import type { AdvanceInvoice, CreditNote, DeliveryNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { Badge } from "@/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { formatDateOnlyForDisplay } from "@/ui/lib/date-only";
import { getDisplayDocumentNumber } from "@/ui/lib/document-display";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { getDocumentConfig, type DocumentTypes } from "../types";
import { getDocumentPaymentStatus } from "../view/document-details-card";
import de from "../view/locales/de";
import es from "../view/locales/es";
import fr from "../view/locales/fr";
import hr from "../view/locales/hr";
import it from "../view/locales/it";
import nl from "../view/locales/nl";
import pl from "../view/locales/pl";
import pt from "../view/locales/pt";
import sl from "../view/locales/sl";

const translations = {
  sl,
  de,
  it,
  fr,
  es,
  pt,
  nl,
  pl,
  hr,
  sv: {
    Type: "Typ",
    Number: "Nummer",
    Date: "Datum",
    "Due date": "Förfallodatum",
    "Service date": "Tjänstedatum",
    "Service period": "Tjänsteperiod",
    "Valid until": "Giltig till",
    Customer: "Kund",
    Status: "Status",
    Total: "Totalt",
    Paid: "Betalt",
    Due: "Att betala",
    "Paid in full": "Betald i sin helhet",
    "Partially paid": "Delvis betald",
    Unpaid: "Obetald",
    Voided: "Makulerad",
    Overdue: "Förfallen",
    Invoice: "Faktura",
    Estimate: "Offert",
    "Credit Note": "Kreditnota",
    "Advance Invoice": "Förskottsfaktura",
    "Delivery Note": "Följesedel",
  },
  fi: {
    Type: "Tyyppi",
    Number: "Numero",
    Date: "Päivämäärä",
    "Due date": "Eräpäivä",
    "Service date": "Palvelupäivä",
    "Service period": "Palvelujakso",
    "Valid until": "Voimassa asti",
    Customer: "Asiakas",
    Status: "Tila",
    Total: "Yhteensä",
    Paid: "Maksettu",
    Due: "Maksamatta",
    "Paid in full": "Maksettu kokonaan",
    "Partially paid": "Osittain maksettu",
    Unpaid: "Maksamatta",
    Voided: "Mitätöity",
    Overdue: "Erääntynyt",
    Invoice: "Lasku",
    Estimate: "Tarjous",
    "Credit Note": "Hyvityslasku",
    "Advance Invoice": "Ennakkolasku",
    "Delivery Note": "Lähete",
  },
  et: {
    Type: "Tüüp",
    Number: "Number",
    Date: "Kuupäev",
    "Due date": "Tähtaeg",
    "Service date": "Teenuse kuupäev",
    "Service period": "Teenuse periood",
    "Valid until": "Kehtiv kuni",
    Customer: "Klient",
    Status: "Olek",
    Total: "Kokku",
    Paid: "Makstud",
    Due: "Tasumata",
    "Paid in full": "Täielikult makstud",
    "Partially paid": "Osaliselt makstud",
    Unpaid: "Tasumata",
    Voided: "Tühistatud",
    Overdue: "Üle tähtaja",
    Invoice: "Arve",
    Estimate: "Hinnapakkumine",
    "Credit Note": "Kreeditarve",
    "Advance Invoice": "Ettemaksuarve",
    "Delivery Note": "Saateleht",
  },
  bg: {
    Type: "Вид",
    Number: "Номер",
    Date: "Дата",
    "Due date": "Краен срок",
    "Service date": "Дата на услугата",
    "Service period": "Период на услугата",
    "Valid until": "Валидно до",
    Customer: "Клиент",
    Status: "Статус",
    Total: "Общо",
    Paid: "Платено",
    Due: "Дължимо",
    "Paid in full": "Платено изцяло",
    "Partially paid": "Частично платено",
    Unpaid: "Неплатено",
    Voided: "Анулирано",
    Overdue: "Просрочено",
    Invoice: "Фактура",
    Estimate: "Оферта",
    "Credit Note": "Кредитно известие",
    "Advance Invoice": "Авансова фактура",
    "Delivery Note": "Доставна бележка",
  },
  cs: {
    Type: "Typ",
    Number: "Číslo",
    Date: "Datum",
    "Due date": "Datum splatnosti",
    "Service date": "Datum služby",
    "Service period": "Období služby",
    "Valid until": "Platné do",
    Customer: "Zákazník",
    Status: "Stav",
    Total: "Celkem",
    Paid: "Uhrazeno",
    Due: "K úhradě",
    "Paid in full": "Uhrazeno v plné výši",
    "Partially paid": "Částečně uhrazeno",
    Unpaid: "Neuhrazeno",
    Voided: "Stornováno",
    Overdue: "Po splatnosti",
    Invoice: "Faktura",
    Estimate: "Nabídka",
    "Credit Note": "Dobropis",
    "Advance Invoice": "Zálohová faktura",
    "Delivery Note": "Dodací list",
  },
  sk: {
    Type: "Typ",
    Number: "Číslo",
    Date: "Dátum",
    "Due date": "Dátum splatnosti",
    "Service date": "Dátum služby",
    "Service period": "Obdobie služby",
    "Valid until": "Platné do",
    Customer: "Zákazník",
    Status: "Stav",
    Total: "Celkom",
    Paid: "Uhradené",
    Due: "Na úhradu",
    "Paid in full": "Uhradené v plnej výške",
    "Partially paid": "Čiastočne uhradené",
    Unpaid: "Neuhradené",
    Voided: "Stornované",
    Overdue: "Po splatnosti",
    Invoice: "Faktura",
    Estimate: "Cenová ponuka",
    "Credit Note": "Dobropis",
    "Advance Invoice": "Zálohová faktúra",
    "Delivery Note": "Dodací list",
  },
  nb: {
    Type: "Type",
    Number: "Nummer",
    Date: "Dato",
    "Due date": "Forfallsdato",
    "Service date": "Tjenestedato",
    "Service period": "Tjenesteperiode",
    "Valid until": "Gyldig til",
    Customer: "Kunde",
    Status: "Status",
    Total: "Totalt",
    Paid: "Betalt",
    Due: "Til betaling",
    "Paid in full": "Fullt betalt",
    "Partially paid": "Delvis betalt",
    Unpaid: "Ubetalt",
    Voided: "Annullert",
    Overdue: "Forfalt",
    Invoice: "Faktura",
    Estimate: "Tilbud",
    "Credit Note": "Kreditnota",
    "Advance Invoice": "Forskuddsfaktura",
    "Delivery Note": "Følgeseddel",
  },
  is: {
    Type: "Tegund",
    Number: "Númer",
    Date: "Dagsetning",
    "Due date": "Gjalddagi",
    "Service date": "Þjónustudagsetning",
    "Service period": "Þjónustutímabil",
    "Valid until": "Gildir til",
    Customer: "Viðskiptavinur",
    Status: "Staða",
    Total: "Samtals",
    Paid: "Greitt",
    Due: "Til greiðslu",
    "Paid in full": "Greitt að fullu",
    "Partially paid": "Greitt að hluta",
    Unpaid: "Ógreitt",
    Voided: "Ógilt",
    Overdue: "Gjaldfallið",
    Invoice: "Reikningur",
    Estimate: "Tilboð",
    "Credit Note": "Kreditreikningur",
    "Advance Invoice": "Fyrirframreikningur",
    "Delivery Note": "Afhendingarseðill",
  },
} as const;

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;

type PublicDocumentSummaryProps = ComponentTranslationProps & {
  document: Document;
  documentType: DocumentTypes;
  locale?: string;
  documentTypeLabel?: string;
};

function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

export function PublicDocumentSummary({
  document,
  documentType,
  locale = "en",
  documentTypeLabel,
  ...i18nProps
}: PublicDocumentSummaryProps) {
  const t = createTranslation({ translations, locale, ...i18nProps });
  const currencyCode = document.currency_code;
  const sign = documentType === "credit_note" ? -1 : 1;
  const fmt = (amount: number) => formatCurrency(amount, currencyCode, locale);
  const fmtDate = (date: Date | string | null | undefined) => formatDateOnlyForDisplay(date, locale);
  const config = getDocumentConfig(documentType);
  const resolvedDocumentTypeLabel = documentTypeLabel ?? t(config.singularName);
  const displayNumber = getDisplayDocumentNumber(document, t);
  const isInvoiceLike = documentType === "invoice" || documentType === "advance_invoice";
  const isEstimate = documentType === "estimate";
  const invoiceDoc = document as Invoice | AdvanceInvoice;

  const statusBadge = (() => {
    if (isInvoiceLike) {
      return getDocumentPaymentStatus(invoiceDoc, t);
    }
    if (document.voided_at && new Date(document.voided_at).getTime() > 0) {
      return { label: t("Voided"), variant: "secondary" as const };
    }
    return { label: resolvedDocumentTypeLabel, variant: "outline" as const };
  })();

  const rows: Array<{ label: string; value: string }> = [
    { label: t("Type"), value: resolvedDocumentTypeLabel },
    { label: t("Number"), value: displayNumber },
    { label: t("Date"), value: fmtDate(document.date) },
  ];

  if (isInvoiceLike && invoiceDoc.date_due) {
    rows.push({ label: t("Due date"), value: fmtDate(invoiceDoc.date_due) });
  }

  if (isEstimate) {
    const estimateDoc = document as Estimate;
    if (estimateDoc.date_valid_till) {
      rows.push({ label: t("Valid until"), value: fmtDate(estimateDoc.date_valid_till) });
    }
  }

  if (documentType === "invoice" || documentType === "credit_note") {
    const serviceDoc = document as Invoice | CreditNote;
    if (serviceDoc.date_service) {
      rows.push({
        label: serviceDoc.date_service_to ? t("Service period") : t("Service date"),
        value: serviceDoc.date_service_to
          ? `${fmtDate(serviceDoc.date_service)} - ${fmtDate(serviceDoc.date_service_to)}`
          : fmtDate(serviceDoc.date_service),
      });
    }
  }

  if (document.customer?.name) {
    rows.push({ label: t("Customer"), value: document.customer.name });
  }

  if (isInvoiceLike) {
    rows.push({ label: t("Status"), value: statusBadge.label });
  }

  rows.push({ label: t("Total"), value: fmt(document.total_with_tax * sign) });

  if (isInvoiceLike && invoiceDoc.total_paid > 0) {
    rows.push({ label: t("Paid"), value: fmt(invoiceDoc.total_paid) });
    rows.push({ label: t("Due"), value: fmt(invoiceDoc.total_due) });
  }

  return (
    <Card size="sm" className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{resolvedDocumentTypeLabel}</CardTitle>
            <p className="text-muted-foreground text-sm">{displayNumber}</p>
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3">
              <dt className="text-muted-foreground text-xs uppercase tracking-[0.08em]">{row.label}</dt>
              <dd className="font-medium text-sm">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
