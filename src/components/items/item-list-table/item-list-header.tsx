import { TableHead, TableHeader, TableRow } from "@/ui/components/ui/table";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

import { SortableHeader } from "../../table/sortable-header";

type ItemListHeaderProps = {
  orderBy?: string;
  onSort?: (order: string | null) => void;
} & ComponentTranslationProps;

export default function ItemListHeader({ orderBy, onSort, ...i18nProps }: ItemListHeaderProps) {
  const t = createTranslation(i18nProps);

  return (
    <TableHeader>
      <TableRow>
        <TableHead>
          <SortableHeader field="name" currentOrder={orderBy} onSort={onSort}>
            {t("Name")}
          </SortableHeader>
        </TableHead>
        <TableHead>
          <SortableHeader field="description" currentOrder={orderBy} onSort={onSort}>
            {t("Description")}
          </SortableHeader>
        </TableHead>
        <TableHead className="text-right">{t("Price")}</TableHead>
        <TableHead className="w-[42px] text-right" />
      </TableRow>
    </TableHeader>
  );
}
