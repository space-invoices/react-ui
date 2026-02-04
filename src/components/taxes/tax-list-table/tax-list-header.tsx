import { TableHead, TableHeader, TableRow } from "@/ui/components/ui/table";
import { SortableHeader } from "../../table/sortable-header";

type TaxListHeaderProps = {
  orderBy?: string;
  onSort?: (order: string | null) => void;
  t: (key: string) => string;
};

export default function TaxListHeader({ orderBy, onSort, t }: TaxListHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>
          <SortableHeader field="name" currentOrder={orderBy} onSort={onSort}>
            {t("Name")}
          </SortableHeader>
        </TableHead>
        <TableHead>{t("Tax Rates")}</TableHead>
        <TableHead>
          <SortableHeader field="created_at" currentOrder={orderBy} onSort={onSort}>
            {t("Created")}
          </SortableHeader>
        </TableHead>
        <TableHead className="text-right" />
      </TableRow>
    </TableHeader>
  );
}
