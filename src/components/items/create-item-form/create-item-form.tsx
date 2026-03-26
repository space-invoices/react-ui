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
import { getEntityCountryCapabilities } from "@/ui/lib/country-capabilities";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";

import { useCreateItem } from "../items.hooks";
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

type CreateItemFormProps = {
  entityId: string;
  onSuccess?: (item: Item) => void;
  onError?: (error: Error) => void;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
} & ComponentTranslationProps;

export default function CreateItemForm({
  entityId,
  onSuccess,
  onError,
  renderSubmitButton,
  ...i18nProps
}: CreateItemFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  const [isGrossPrice, setIsGrossPrice] = useState(false);
  const { activeEntity } = useEntities();
  const isPortugal = getEntityCountryCapabilities(activeEntity).isPortugal;

  const form = useForm<CreateItemSchema>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      name: "",
      description: "",
      classification: isPortugal ? "product" : undefined,
      price: 0,
    },
  });

  const setPriceMode = (mode: string) => {
    setIsGrossPrice(mode === "gross");
  };

  const { mutate: createItem, isPending } = useCreateItem({
    entityId,
    onSuccess: (item, _variables, _context) => {
      onSuccess?.(item);
      form.reset(); // Reset form after successful submission
    },
    onError: (error, _variables, _context) => {
      form.setError("root", {
        type: "submit",
        message: t("There was an error creating the item"),
      });
      onError?.(error);
    },
  });

  const onSubmit = async (values: CreateItemSchema) => {
    // Zod validation ensures required fields (name, price) are present before this is called
    // The type cast is safe because React Hook Form's DeepPartial doesn't reflect runtime validation
    const { price, ...rest } = values;

    // Transform price based on is_gross_price flag
    const payload = isGrossPrice ? { ...rest, gross_price: price } : { ...rest, price };

    createItem(payload as CreateItemRequest);
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

        {isPortugal && (
          <FormField
            control={form.control}
            name="classification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Classification")}</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={field.value ?? "product"}
                    onChange={(event) => field.onChange(event.target.value)}
                  >
                    <option value="product">{t("Product")}</option>
                    <option value="service">{t("Service")}</option>
                    <option value="advance">{t("Advance")}</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
