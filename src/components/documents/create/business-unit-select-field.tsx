import { Badge } from "@/ui/components/ui/badge";
import { FormControl, FormField, FormItem, FormLabel } from "@/ui/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import type { BusinessUnitOption } from "./business-unit-utils";
import type { AnyControl } from "./form-types";

type BusinessUnitSelectFieldProps = {
  control: AnyControl;
  name?: string;
  t: (key: string) => string;
  options?: BusinessUnitOption[];
  mainEntityLabel?: string;
  disabled?: boolean;
  compact?: boolean;
  triggerClassName?: string;
};

export function BusinessUnitSelectField({
  control,
  name = "business_unit_id",
  t,
  options = [],
  mainEntityLabel,
  disabled = false,
  compact = false,
  triggerClassName,
}: BusinessUnitSelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={compact ? "space-y-0" : undefined}>
          {compact ? (
            <Select
              onValueChange={(value) => field.onChange(value === "__main__" ? null : value)}
              value={field.value || "__main__"}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger className={triggerClassName}>
                  <SelectValue placeholder={mainEntityLabel ?? t("No unit")}>
                    {options.find((unit) => unit.id === field.value)?.name ?? mainEntityLabel ?? t("No unit")}
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="__main__">{mainEntityLabel ?? t("No unit")}</SelectItem>
                {options.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    <div className="flex items-center gap-2">
                      <span>{unit.name}</span>
                      {(unit.deleted_at || unit.is_active === false) && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          {t("Archived")}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-3">
              <FormLabel className="w-[6.5rem] shrink-0">{t("Business unit")}</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "__main__" ? null : value)}
                value={field.value || "__main__"}
                disabled={disabled}
              >
                <FormControl>
                  <SelectTrigger className={triggerClassName ?? "flex-1"}>
                    <SelectValue placeholder={mainEntityLabel ?? t("No unit")}>
                      {options.find((unit) => unit.id === field.value)?.name ?? mainEntityLabel ?? t("No unit")}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__main__">{mainEntityLabel ?? t("No unit")}</SelectItem>
                  {options.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      <div className="flex items-center gap-2">
                        <span>{unit.name}</span>
                        {(unit.deleted_at || unit.is_active === false) && (
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {t("Archived")}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </FormItem>
      )}
    />
  );
}
