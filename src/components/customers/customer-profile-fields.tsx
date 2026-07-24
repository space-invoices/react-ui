import { FormInput } from "@/ui/components/form";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";

type CustomerProfileFieldsProps = {
  control: any;
  t: (key: string) => string;
};

export function CustomerContactFields({ control, t }: CustomerProfileFieldsProps) {
  return (
    <>
      <FormInput
        control={control}
        name="email"
        label={t("Email")}
        placeholder="name@example.com"
        type="email"
        autoComplete="email"
      />

      <FormField
        control={control}
        name="contact_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Contact Type")}</FormLabel>
            <Select value={field.value ?? "buyer"} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select contact type")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="buyer">{t("Customer")}</SelectItem>
                <SelectItem value="supplier">{t("Supplier")}</SelectItem>
                <SelectItem value="both">{t("Customer and supplier")}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export function CustomerClassificationFields({ control, t }: CustomerProfileFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="is_tax_subject"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3">
            <FormControl>
              <Checkbox checked={field.value === true} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal">{t("Tax Subject")}</FormLabel>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="is_end_consumer"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3">
            <FormControl>
              <Checkbox checked={field.value === true} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal">{t("End Consumer")}</FormLabel>
          </FormItem>
        )}
      />
    </div>
  );
}

export function CustomerProfileFields(props: CustomerProfileFieldsProps) {
  return (
    <>
      <CustomerContactFields {...props} />
      <CustomerClassificationFields {...props} />
    </>
  );
}
