import type { Item } from "@spaceinvoices/js-sdk";

import { Eye, MoreHorizontal, Pencil } from "lucide-react";
import { memo } from "react";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

type ItemListRowActionsProps = {
  item: Item;
  onView?: (item: Item) => void;
  onEdit?: (item: Item) => void;
} & ComponentTranslationProps;

export default memo(function ItemListRowActions({ item, onView, onEdit, ...i18nProps }: ItemListRowActionsProps) {
  const t = createTranslation(i18nProps);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" id="action-menu-trigger">
          <span className="sr-only">{t("Open menu")}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(item.id)}>
            {t("Copy item ID")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit?.(item)}>
            <Pencil className="h-4 w-4" />
            {t("Edit item")}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onView?.(item)}>
            <Eye className="h-4 w-4" />
            {t("View item")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
