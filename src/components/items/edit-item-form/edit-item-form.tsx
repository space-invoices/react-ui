import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateItemRequest, Item } from "@spaceinvoices/js-sdk";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormInput } from "@/ui/components/form";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import type { CreateItemSchema } from "@/ui/generated/schemas";
import { createItemSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

import { useUpdateItem } from "../items.hooks";
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

type EditItemFormProps = {
  entityId: string;
  item: Item;
  onSuccess?: (item: Item) => void;
  onError?: (error: Error) => void;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
} & ComponentTranslationProps;

export default function EditItemForm({
  entityId,
  item,
  onSuccess,
  onError,
  renderSubmitButton,
  ...i18nProps
}: EditItemFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  const [isGrossPrice, setIsGrossPrice] = useState(item.gross_price != null);

  const form = useForm<CreateItemSchema>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      name: item.name ?? "",
      description: item.description ?? "",
      price: isGrossPrice ? (item.gross_price ?? 0) : item.price,
    },
  });

  const setPriceMode = (mode: string) => {
    setIsGrossPrice(mode === "gross");
  };

  const { mutate: updateItem, isPending } = useUpdateItem({
    entityId,
    onSuccess: (updatedItem, _variables, _context) => {
      onSuccess?.(updatedItem);
    },
    onError: (error, _variables, _context) => {
      form.setError("root", {
        type: "submit",
        message: t("There was an error updating the item"),
      });
      onError?.(error);
    },
  });

  const onSubmit = async (values: CreateItemSchema) => {
    const { price, ...rest } = values;

    const payload = isGrossPrice ? { ...rest, gross_price: price } : { ...rest, price };

    updateItem({
      id: item.id,
      data: payload as CreateItemRequest,
    });
  };

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormInput control={form.control} name="name" label={t("Name")} placeholder={t("Enter name")} />

        <FormInput
          control={form.control}
          name="description"
          label={t("Description")}
          placeholder={t("Enter description")}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isGrossPrice ? t("Gross price") : t("Price")} <span className="text-red-500">*</span>
              </FormLabel>
              <div className="flex items-center gap-1">
                <FormControl className="min-w-0 flex-1">
                  <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                </FormControl>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                            {isGrossPrice ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuRadioGroup value={isGrossPrice ? "gross" : "net"} onValueChange={setPriceMode}>
                            <DropdownMenuRadioItem value="net">{t("Net price")}</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="gross">{t("Gross price")}</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isGrossPrice ? t("Gross price (tax included)") : t("Net price (before tax)")}
                  </TooltipContent>
                </Tooltip>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {renderSubmitButton?.({
          isSubmitting: isPending || form.formState.isSubmitting,
          submit: handleSubmitClick,
        })}
      </form>
    </Form>
  );
}
