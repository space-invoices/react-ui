import { zodResolver } from "@hookform/resolvers/zod";
import type {
  Entity,
  EntitySettings,
  EntitySettingsTaxClauseDefaults,
  GetEntities200DataItem,
  TaxRules,
} from "@spaceinvoices/js-sdk";
import { ChevronDown, Globe, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/components/ui/form";
import { Switch } from "@/ui/components/ui/switch";
import { Textarea } from "@/ui/components/ui/textarea";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useUpdateEntity } from "../entities.hooks";
import de from "../entity-settings-form/locales/de";
import sl from "../entity-settings-form/locales/sl";

const translations = { sl, de } as const;

const taxRulesSettingsSchema = z.object({
  vies_validate_vat: z.boolean(),
  auto_reverse_charge: z.boolean(),
  auto_remove_tax_export: z.boolean(),
  require_gross_prices: z.boolean(),
  // Tax clause defaults per transaction type
  tax_clause_intra_eu_b2b: z.string().optional(),
  tax_clause_export: z.string().optional(),
  tax_clause_domestic: z.string().optional(),
  tax_clause_intra_eu_b2c: z.string().optional(),
});

type TaxRulesSettingsSchema = z.infer<typeof taxRulesSettingsSchema>;

type SectionType = "tax-rules" | "tax-clauses";

/** Entity type with country_rules included (from getEntities response) */
type EntityWithRules = GetEntities200DataItem;

export type TaxRulesSettingsFormProps = {
  entity: EntityWithRules;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
  /** Optional render prop to wrap each section with help content */
  renderSection?: (section: SectionType, content: ReactNode) => ReactNode;
} & ComponentTranslationProps;

export function TaxRulesSettingsForm({
  entity,
  t: translateProp,
  namespace,
  locale,
  onSuccess,
  onError,
  renderSection,
}: TaxRulesSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translations });
  const [taxClausesOpen, setTaxClausesOpen] = useState(false);

  // Helper to wrap section content with render prop if provided
  const wrapSection = (section: SectionType, content: ReactNode) => {
    return renderSection ? renderSection(section, content) : content;
  };

  // Check if tax clause defaults feature is available for this entity's country
  const showTaxClauseDefaults = entity.country_rules?.features?.includes("tax_clause_defaults") ?? false;

  const currentSettings = (entity.settings as EntitySettings) || {};
  const currentTaxRules = (currentSettings.tax_rules as TaxRules | null)?.eu || {};
  const currentTaxClauseDefaults =
    (currentSettings.tax_clause_defaults as EntitySettingsTaxClauseDefaults | null) || {};

  const form = useForm<TaxRulesSettingsSchema>({
    resolver: zodResolver(taxRulesSettingsSchema),
    defaultValues: {
      vies_validate_vat: currentTaxRules.vies_validate_vat ?? true,
      auto_reverse_charge: currentTaxRules.auto_reverse_charge ?? false,
      auto_remove_tax_export: currentTaxRules.auto_remove_tax_export ?? false,
      require_gross_prices: currentTaxRules.require_gross_prices ?? false,
      tax_clause_intra_eu_b2b: currentTaxClauseDefaults.intra_eu_b2b ?? "",
      tax_clause_export: currentTaxClauseDefaults.export ?? "",
      tax_clause_domestic: currentTaxClauseDefaults.domestic ?? "",
      tax_clause_intra_eu_b2c: currentTaxClauseDefaults.intra_eu_b2c ?? "",
    },
  });

  const { mutate: updateEntity, isPending } = useUpdateEntity({
    entityId: entity.id,
    onSuccess: (data) => {
      form.reset(form.getValues());
      onSuccess?.(data);
    },
    onError,
  });

  useFormFooterRegistration({
    formId: "tax-rules-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save Settings"),
  });

  const onSubmit = (values: TaxRulesSettingsSchema) => {
    const updatedSettings: EntitySettings = {
      ...currentSettings,
      tax_rules: {
        eu: {
          vies_validate_vat: values.vies_validate_vat,
          auto_reverse_charge: values.auto_reverse_charge,
          auto_remove_tax_export: values.auto_remove_tax_export,
          require_gross_prices: values.require_gross_prices,
        },
      },
      tax_clause_defaults: {
        intra_eu_b2b: values.tax_clause_intra_eu_b2b || null,
        export: values.tax_clause_export || null,
        domestic: values.tax_clause_domestic || null,
        intra_eu_b2c: values.tax_clause_intra_eu_b2c || null,
      },
    };

    updateEntity({ id: entity.id, data: { settings: updatedSettings } });
  };

  // Tax rules header
  const taxRulesHeader = (
    <div className={cn("mb-4 flex items-center gap-3", showTaxClauseDefaults && "border-t pt-6")}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
        <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{t("EU Tax Rules")}</h3>
        <p className="text-muted-foreground text-sm">{t("Automatic tax handling for cross-border transactions")}</p>
      </div>
    </div>
  );

  // Tax rules section content (switches)
  const taxRulesContent = (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="vies_validate_vat"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">{t("tax-rules.vies_validate_vat.label")}</FormLabel>
              <FormDescription>{t("tax-rules.vies_validate_vat.description")}</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="auto_reverse_charge"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">{t("tax-rules.auto_reverse_charge.label")}</FormLabel>
              <FormDescription>{t("tax-rules.auto_reverse_charge.description")}</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="auto_remove_tax_export"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">{t("tax-rules.auto_remove_tax_export.label")}</FormLabel>
              <FormDescription>{t("tax-rules.auto_remove_tax_export.description")}</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="require_gross_prices"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">{t("tax-rules.require_gross_prices.label")}</FormLabel>
              <FormDescription>{t("tax-rules.require_gross_prices.description")}</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Tax clauses header
  const taxClausesHeader = showTaxClauseDefaults ? (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
        <MessageSquareText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{t("Default Tax Clauses")}</h3>
        <p className="text-muted-foreground text-sm">
          {t("Set default tax clauses that are automatically added to documents based on transaction type")}
        </p>
      </div>
    </div>
  ) : null;

  // Tax clauses section content
  const taxClausesContent = showTaxClauseDefaults ? (
    <div className="space-y-4">
      {/* Default / Domestic - always visible */}
      <FormField
        control={form.control}
        name="tax_clause_domestic"
        render={({ field }) => (
          <FormItem className="rounded-lg border p-4">
            <FormLabel>{t("tax-clauses.domestic.label")}</FormLabel>
            <FormDescription>{t("tax-clauses.domestic.description")}</FormDescription>
            <FormControl>
              <Textarea placeholder={t("Enter default tax clause...")} className="min-h-[80px] resize-y" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Other tax clauses - collapsible */}
      <Collapsible open={taxClausesOpen} onOpenChange={setTaxClausesOpen} className="space-y-2">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
          <div className="text-left">
            <div className="font-medium">{t("tax-clauses.other-title")}</div>
            <div className="text-muted-foreground text-sm">{t("tax-clauses.other-description")}</div>
          </div>
          <ChevronDown
            className={cn("h-5 w-5 text-muted-foreground transition-transform", taxClausesOpen && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Intra-EU B2B */}
          <FormField
            control={form.control}
            name="tax_clause_intra_eu_b2b"
            render={({ field }) => (
              <FormItem className="rounded-lg border p-4">
                <FormLabel>{t("tax-clauses.intra_eu_b2b.label")}</FormLabel>
                <FormDescription>{t("tax-clauses.intra_eu_b2b.description")}</FormDescription>
                <FormControl>
                  <Textarea
                    placeholder={t("Enter reverse charge clause...")}
                    className="min-h-[80px] resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Export */}
          <FormField
            control={form.control}
            name="tax_clause_export"
            render={({ field }) => (
              <FormItem className="rounded-lg border p-4">
                <FormLabel>{t("tax-clauses.export.label")}</FormLabel>
                <FormDescription>{t("tax-clauses.export.description")}</FormDescription>
                <FormControl>
                  <Textarea
                    placeholder={t("Enter export exemption clause...")}
                    className="min-h-[80px] resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Intra-EU B2C */}
          <FormField
            control={form.control}
            name="tax_clause_intra_eu_b2c"
            render={({ field }) => (
              <FormItem className="rounded-lg border p-4">
                <FormLabel>{t("tax-clauses.intra_eu_b2c.label")}</FormLabel>
                <FormDescription>{t("tax-clauses.other.description")}</FormDescription>
                <FormControl>
                  <Textarea
                    placeholder={t("Enter EU consumer sales clause...")}
                    className="min-h-[80px] resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  ) : null;

  return (
    <Form {...form}>
      <form id="tax-rules-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {taxClausesHeader}
        {taxClausesContent && wrapSection("tax-clauses", taxClausesContent)}
        {taxRulesHeader}
        {wrapSection("tax-rules", taxRulesContent)}
      </form>
    </Form>
  );
}
