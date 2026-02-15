import type { Item } from "@spaceinvoices/js-sdk";

import { MoreHorizontal } from "lucide-react";
import { memo } from "react";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
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
} & ComponentTranslationProps;

export default memo(function ItemListRowActions({ item, onView, ...i18nProps }: ItemListRowActionsProps) {
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
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(item.id)}>
          {t("Copy item ID")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => onView?.(item)}>
          {t("View item")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
