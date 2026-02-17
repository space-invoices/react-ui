import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/components/ui/table";

export type LinkedDocumentSummary = {
  id: string;
  type: string;
  number: string;
  date: string;
  total_with_tax: number;
  currency_code: string;
};

type LinkedDocumentsInfoProps = {
  documents: LinkedDocumentSummary[];
  locale: string;
  t: (key: string) => string;
};

export function LinkedDocumentsInfo({ documents, locale, t }: LinkedDocumentsInfoProps) {
  if (documents.length === 0) return null;

  const currencyCode = documents[0].currency_code || "EUR";

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currencyCode}`;
    }
  };

  const typeLabel = (type: string) => {
    const key = {
      delivery_note: "Delivery note",
      invoice: "Invoice",
      estimate: "Estimate",
      credit_note: "Credit note",
      advance_invoice: "Advance invoice",
    }[type];
    return key ? t(key) : type;
  };

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-muted-foreground text-sm">{t("Linked documents")}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 text-xs">{t("Type")}</TableHead>
            <TableHead className="h-8 text-xs">{t("Number")}</TableHead>
            <TableHead className="h-8 text-xs">{t("Date")}</TableHead>
            <TableHead className="h-8 text-right text-xs">{t("Total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="py-1.5 text-sm">{typeLabel(doc.type)}</TableCell>
              <TableCell className="py-1.5 text-sm">{doc.number}</TableCell>
              <TableCell className="py-1.5 text-sm">{formatDate(doc.date)}</TableCell>
              <TableCell className="py-1.5 text-right text-sm">{formatCurrency(doc.total_with_tax)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
