import type { Item } from "@spaceinvoices/js-sdk";
import { Package } from "lucide-react";
import { memo } from "react";
import { TableCell, TableRow } from "@/ui/components/ui/table";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { Button } from "../../ui/button";
import ItemListRowActions from "./item-list-row-actions";

type ItemListRowProps = {
  item: Item;
  onRowClick?: (item: Item) => void;
  onView?: (item: Item) => void;
} & ComponentTranslationProps;

export default memo(function ItemListRow({ item, onRowClick, onView, ...i18nProps }: ItemListRowProps) {
  const t = createTranslation(i18nProps);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Button variant="link" className="py-0 underline" onClick={() => onRowClick?.(item)}>
          <Package className="h-4 w-4 flex-shrink-0" />
          {item.name}
        </Button>
      </TableCell>
      <TableCell>{item.description}</TableCell>
      <TableCell className="text-right">{item.price}</TableCell>
      <TableCell className="text-right">
        <ItemListRowActions item={item} onView={onView} t={t} />
      </TableCell>
    </TableRow>
  );
});
