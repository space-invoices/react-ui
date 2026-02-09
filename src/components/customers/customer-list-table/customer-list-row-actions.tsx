import type { Customer } from "@spaceinvoices/js-sdk";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

import { useDeleteCustomer } from "../customers.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";

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
} as const;

type CustomerListRowActionsProps = {
  customer: Customer;
  entityId?: string;
  onEditCustomer?: (customer: Customer) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: string) => void;
} & ComponentTranslationProps;

export default function CustomerListRowActions({
  customer,
  entityId,
  onEditCustomer,
  onDeleteSuccess,
  onDeleteError,
  ...i18nProps
}: CustomerListRowActionsProps) {
  const t = createTranslation({
    translations,
    ...i18nProps,
  });

  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer({
    entityId,
    onSuccess: () => {
      onDeleteSuccess?.();
    },
    onError: (error: Error) => {
      onDeleteError?.(error.message);
    },
  });

  const handleDelete = () => {
    deleteCustomer({ id: customer.id });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 cursor-pointer p-0" id="action-menu-trigger">
          <span className="sr-only">{t("Open menu")}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onEditCustomer?.(customer)}>
            <Pencil className="h-4 w-4" />
            {t("Edit customer")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? t("Deleting...") : t("Delete customer")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
