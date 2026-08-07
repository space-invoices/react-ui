import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { NumericInput } from "@/ui/lib/numeric-input";

export type PortugalCompanyFieldsProps = {
  /** Host form control. Untyped like `FormInput`'s, since the host owns the field-value shape. */
  control: any;
  /** Translator already scoped to the host form's namespace. */
  t: (key: string) => string;
  /** Entity locale — share capital is money entry and follows the entity, not the UI language. */
  inputLocale: string;
};

/**
 * The entity details Portuguese law requires but the generic company settings form
 * does not collect. Render only for Portugal entities; the API rejects an update
 * that leaves any of them unset (see the Portugal overlay in `apps/api`).
 *
 * Validation for these fields lives in `@/ui/lib/pt-entity-input` so the create and
 * settings forms enforce one shared rule set.
 */
export function PortugalCompanyFields({ control, t, inputLocale }: PortugalCompanyFieldsProps) {
  return (
    <div className="border-t pt-6">
      <p className="font-medium text-base">{t("Portugal Details")}</p>
      <p className="mt-1 mb-4 text-muted-foreground text-xs">
        {t("Portuguese law requires these details on every entity")}
      </p>

      <div className="space-y-6">
        <FormField
          control={control}
          name="company_number"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel className="font-medium text-base">{t("Company Number")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="501442600"
                  className="h-10"
                />
              </FormControl>
              <FormDescription className="text-xs">{t("Company registration number (NIPC)")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel className="font-medium text-base">{t("Phone")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="tel"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="+351912345678"
                  className="h-10"
                />
              </FormControl>
              <FormDescription className="text-xs">
                {t("International format, including the country code")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="starting_capital"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel className="font-medium text-base">{t("Share Capital")}</FormLabel>
              <FormControl>
                <NumericInput
                  {...field}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  inputLocale={inputLocale}
                  placeholder="5000"
                  className="h-10"
                />
              </FormControl>
              <FormDescription className="text-xs">{t("Registered share capital of the company")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
