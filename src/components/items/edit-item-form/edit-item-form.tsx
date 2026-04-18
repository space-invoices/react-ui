import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateItemRequest, Item } from "@spaceinvoices/js-sdk";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useFinancialCategories } from "@/ui/components/financial-categories/financial-categories.hooks";
import { FormInput } from "@/ui/components/form";
import TaxSelectField, { getCurrentRate } from "@/ui/components/taxes/tax-select-field";
import { useListTaxes } from "@/ui/components/taxes/taxes.hooks";
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
import { Label } from "@/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import type { CreateItemSchema } from "@/ui/generated/schemas";
import { createItemSchema } from "@/ui/generated/schemas";
import { getEntityCountryCapabilities } from "@/ui/lib/country-capabilities";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { useWLSubscriptionOptional } from "@/ui/providers/wl-subscription-provider";

import { useUpdateItem } from "../items.hooks";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import et from "./locales/et";
import fi from "./locales/fi";
import fr from "./locales/fr";
import hr from "./locales/hr";
import is from "./locales/is";
import it from "./locales/it";
import nb from "./locales/nb";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sk from "./locales/sk";
import sl from "./locales/sl";
import sv from "./locales/sv";

const translations = {
  en,
  sl,
  bg,
  cs,
  de,
  es,
  et,
  fi,
  fr,
  hr,
  is,
  it,
  nb,
  nl,
  pl,
  pt,
  sk,
  sv,
} as const;

type EditItemFormProps = {
  entityId: string;
  item: Item;
  onSuccess?: (item: Item) => void;
  onError?: (error: Error) => void;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
  onAddNewTax?: () => void;
} & ComponentTranslationProps;

export default function EditItemForm({
  entityId,
  item,
  onSuccess,
  onError,
  renderSubmitButton,
  onAddNewTax,
  ...i18nProps
}: EditItemFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });
  const { activeEntity } = useEntities();
  const subscription = useWLSubscriptionOptional();
  const countryCapabilities = getEntityCountryCapabilities(activeEntity);
  const lockPortugalSavedItemFields = !countryCapabilities.allowSavedItemFullEdit;
  const maxTaxesPerItem = activeEntity?.country_rules?.max_taxes_per_item ?? 1;
  const hasFinancialCategoriesFeature = !subscription || subscription.hasFeature("financial_categories");
  const { data: categoriesResponse } = useFinancialCategories(entityId, true);
  const { data: taxesResponse } = useListTaxes(entityId);
  const categories = categoriesResponse?.data ?? [];
  const availableTaxes = taxesResponse?.data ?? [];
  const visibleCategories = categories.filter(
    (category) => !category.archived_at || category.id === item.financial_category_id,
  );
  const getCategoryLabel = (value: string | null | undefined) => {
    if (!value || value === "__none__") {
      return t("No category");
    }

    const category = visibleCategories.find((candidate) => candidate.id === value);
    if (!category) {
      return undefined;
    }

    return category.archived_at ? `${category.name} (${t("Archived")})` : category.name;
  };

  const [isGrossPrice, setIsGrossPrice] = useState(item.gross_price != null);

  const form = useForm<CreateItemSchema>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      classification: item.classification ?? undefined,
      financial_category_id: item.financial_category_id ?? undefined,
      name: item.name ?? "",
      description: item.description ?? "",
      price: isGrossPrice ? (item.gross_price ?? 0) : item.price,
      taxes: item.tax_ids?.map((tax_id) => ({ tax_id })) ?? [],
    },
  });
  const price = useWatch({
    control: form.control,
    name: "price",
  });
  const selectedTaxes = useWatch({
    control: form.control,
    name: "taxes",
  });

  const setPriceMode = (mode: string) => {
    setIsGrossPrice(mode === "gross");
  };

  const addTax = () => {
    const currentTaxes = selectedTaxes || [];
    if (currentTaxes.length >= maxTaxesPerItem) return;

    form.setValue("taxes", [...currentTaxes, {}], { shouldDirty: true, shouldTouch: true });
  };

  const removeTax = (taxIndex: number) => {
    const currentTaxes = selectedTaxes || [];
    form.setValue(
      "taxes",
      currentTaxes.filter((_: unknown, index: number) => index !== taxIndex),
      { shouldDirty: true, shouldTouch: true },
    );
  };

  const selectedTaxRate = (selectedTaxes ?? []).reduce((sum: number, tax: any) => {
    if (!tax?.tax_id) {
      return sum;
    }

    const selectedTax = availableTaxes.find((candidate) => candidate.id === tax.tax_id);
    return sum + (selectedTax ? getCurrentRate(selectedTax) : 0);
  }, 0);

  const priceWithTax =
    typeof price === "number" && Number.isFinite(price)
      ? isGrossPrice
        ? price
        : Math.round(price * (1 + selectedTaxRate / 100) * 100) / 100
      : undefined;

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
    const { price, taxes, ...rest } = values;
    const tax_ids = (taxes ?? []).flatMap((tax: any) => (tax?.tax_id ? [tax.tax_id] : []));

    const payload = isGrossPrice ? { ...rest, gross_price: price, tax_ids } : { ...rest, price, tax_ids };

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
        <FormInput
          control={form.control}
          name="name"
          label={t("Name")}
          placeholder={t("Enter name")}
          disabled={lockPortugalSavedItemFields}
        />

        <FormInput
          control={form.control}
          name="description"
          label={t("Description")}
          placeholder={t("Enter description")}
          disabled={lockPortugalSavedItemFields}
        />

        {countryCapabilities.isPortugal && (
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
                    disabled={lockPortugalSavedItemFields}
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

        <div className="space-y-2">
          <Label>{t("Tax")}</Label>
          {(selectedTaxes ?? []).map((_tax: any, taxIndex: number) => (
            <TaxSelectField
              // biome-ignore lint/suspicious/noArrayIndexKey: list order is form-controlled
              key={taxIndex}
              name={`taxes.${taxIndex}.tax_id`}
              control={form.control}
              entityId={entityId}
              onRemove={() => removeTax(taxIndex)}
              onAddNewTax={onAddNewTax}
              showLabel={false}
              disabled={lockPortugalSavedItemFields}
              t={t}
            />
          ))}
          {(!selectedTaxes || selectedTaxes.length < maxTaxesPerItem) && (
            <Button type="button" variant="outline" size="sm" onClick={addTax} disabled={lockPortugalSavedItemFields}>
              <Plus className="h-4 w-4" />
              {t("Add tax")}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-price-with-tax">{t("Price with tax")}</Label>
          <Input id="item-price-with-tax" value={priceWithTax ?? ""} readOnly aria-readonly="true" />
        </div>

        {hasFinancialCategoriesFeature && visibleCategories.length > 0 && (
          <FormField
            control={form.control}
            name="financial_category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Category")}</FormLabel>
                <Select
                  value={field.value ?? "__none__"}
                  onValueChange={(value) => field.onChange(value === "__none__" ? undefined : value)}
                >
                  <FormControl>
                    <SelectTrigger disabled={lockPortugalSavedItemFields}>
                      <SelectValue placeholder={t("Select category")}>{getCategoryLabel(field.value)}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">{t("No category")}</SelectItem>
                    {visibleCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.archived_at ? `${category.name} (${t("Archived")})` : category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {renderSubmitButton?.({
          isSubmitting: isPending || form.formState.isSubmitting,
          submit: handleSubmitClick,
        })}
      </form>
    </Form>
  );
}
