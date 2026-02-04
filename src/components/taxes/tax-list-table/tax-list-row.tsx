import type { Tax } from "@spaceinvoices/js-sdk";
import { Percent } from "lucide-react";
import { Badge } from "@/ui/components/ui/badge";
import { TableCell, TableRow } from "@/ui/components/ui/table";
import { Button } from "../../ui/button";
import TaxListRowActions from "./tax-list-row-actions";

type TaxListRowProps = {
  tax: Tax;
  onRowClick?: (tax: Tax) => void;
  t: (key: string) => string;
};

export default function TaxListRow({ tax, onRowClick, t }: TaxListRowProps) {
  const formatTaxRates = (taxRates: Tax["tax_rates"]) => {
    if (!taxRates || taxRates.length === 0) return "-";
    return taxRates.map((rate) => `${rate.rate}%`).join(", ");
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <Button variant="link" className="py-0 underline" onClick={() => onRowClick?.(tax)}>
            <Percent className="h-4 w-4 flex-shrink-0" />
            {tax.name || t("Unnamed Tax")}
          </Button>
          {tax.is_default && (
            <Badge variant="secondary" className="text-xs">
              {t("Default")}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>{formatTaxRates(tax.tax_rates)}</TableCell>
      <TableCell>{formatDate(tax.created_at)}</TableCell>
      <TableCell className="text-right">
        <TaxListRowActions tax={tax} t={t} />
      </TableCell>
    </TableRow>
  );
}
