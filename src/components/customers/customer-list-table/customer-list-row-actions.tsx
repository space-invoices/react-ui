import type { Customer } from "@spaceinvoices/js-sdk";

import { MoreHorizontal } from "lucide-react";
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

type CustomerListRowActionsProps = {
  customer: Customer;
} & ComponentTranslationProps;

export default function CustomerListRowActions({ customer, ...i18nProps }: CustomerListRowActionsProps) {
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
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(customer.id)}>
          {t("Copy customer ID")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            window.location.href = `/app/customers/${customer.id}`;
          }}
        >
          {t("View customer")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
