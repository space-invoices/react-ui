import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity, EntitySettings, TaxClauseDefaults, TaxRules } from "@spaceinvoices/js-sdk";
import { ChevronDown, Globe, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ContentLocaleButton } from "@/ui/components/document-content-translations";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Switch } from "@/ui/components/ui/switch";
import { Textarea } from "@/ui/components/ui/textarea";
import {
  DEFAULT_CONTENT_LOCALE,
  DOCUMENT_CONTENT_TRANSLATIONS_FEATURE,
  type DocumentContentLocaleMode,
  readLocalizedValue,
  writeLocalizedValue,
} from "@/ui/lib/document-content-translations";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useWhiteLabel } from "@/ui/providers/white-label-provider";
import { useUpdateEntity } from "../entities.hooks";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
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

const translations = { bg, cs, de, es, et, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } as const;

const localizedContentSchema = z.record(z.string(), z.string()).optional();
const taxClauseTranslationsSchema = z
  .object({
    domestic: localizedContentSchema,
    article_76a: localizedContentSchema,
    intra_eu_b2b: localizedContentSchema,
    intra_eu_b2c: localizedContentSchema,
    "3w_b2b": localizedContentSchema,
    "3w_b2c": localizedContentSchema,
    export: localizedContentSchema,
  })
  .optional();

const taxRulesSettingsSchema = z.object({
  calculation_mode: z.enum(["b2b_standard", "b2c_gross_discount"]),
  vies_validate_vat: z.boolean(),
  auto_reverse_charge: z.boolean(),
  auto_remove_tax_export: z.boolean(),
  require_gross_prices: z.boolean(),
  article_76a_enabled: z.boolean(),
  // Tax clause defaults per transaction type
  tax_clause_intra_eu_b2b: z.string().optional(),
  tax_clause_3w_b2b: z.string().optional(),
  tax_clause_3w_b2c: z.string().optional(),
  tax_clause_domestic: z.string().optional(),
  tax_clause_intra_eu_b2c: z.string().optional(),
  tax_clause_article_76a: z.string().optional(),
  translations: z
    .object({
      tax_clause_defaults: taxClauseTranslationsSchema,
    })
    .optional(),
});

type TaxRulesSettingsSchema = z.infer<typeof taxRulesSettingsSchema>;

type SectionType = "tax-rules" | "tax-clauses";

/** Entity type with country_rules included (from getEntities response) */
type EntityWithRules = Entity;

function normalizeLocalizedContentMap(value: object | null | undefined): Record<string, string> | undefined {
  if (!value) return undefined;

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

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
  translationLocale,
  onSuccess,
  onError,
  renderSection,
}: TaxRulesSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });
  const whiteLabel = useWhiteLabel();
  const [taxClausesOpen, setTaxClausesOpen] = useState(false);
  const [contentLocale, setContentLocale] = useState<DocumentContentLocaleMode>(DEFAULT_CONTENT_LOCALE);
  const translationsFeatureEnabled = whiteLabel.isFeatureVisible(DOCUMENT_CONTENT_TRANSLATIONS_FEATURE);
  const defaultContentLocale = entity.locale || "en-US";

  // Helper to wrap section content with render prop if provided
  const wrapSection = (section: SectionType, content: ReactNode) => {
    return renderSection ? renderSection(section, content) : content;
  };

  // Check if tax clause defaults feature is available for this entity's country
  const showTaxClauseDefaults = entity.country_rules?.features?.includes("tax_clause_defaults") ?? false;
  const showEuTaxRules = entity.country_rules?.features?.includes("eu_tax_rules") ?? false;
  const showArticle76a =
    (entity.country_rules?.features?.includes("si_article_76a") ?? false) &&
    whiteLabel.isFeatureVisible("compliance.si_article_76a");

  const currentSettings = (entity.settings as EntitySettings | undefined) ?? {};
  const currentTaxRuleSettings = (currentSettings.tax_rules as TaxRules | null) ?? {};
  const currentTaxRules = currentTaxRuleSettings.eu || {};
  const currentSloveniaTaxRules = currentTaxRuleSettings.slovenia || {};
  const currentTaxClauseDefaults = (currentSettings.tax_clause_defaults as TaxClauseDefaults | null) || {};
  const storedTaxClauseTranslations = currentSettings.translations?.tax_clause_defaults;
  const currentTaxClauseTranslations = useMemo(
    () => ({
      ...(storedTaxClauseTranslations ?? {}),
      article_76a: normalizeLocalizedContentMap(storedTaxClauseTranslations?.article_76a),
    }),
    [storedTaxClauseTranslations],
  );

  const defaultValues = useMemo(
    (): TaxRulesSettingsSchema => ({
      calculation_mode: currentSettings.calculation?.default_mode ?? "b2b_standard",
      vies_validate_vat: currentTaxRules.vies_validate_vat ?? true,
      auto_reverse_charge: currentTaxRules.auto_reverse_charge ?? false,
      auto_remove_tax_export: currentTaxRules.auto_remove_tax_export ?? false,
      require_gross_prices: currentTaxRules.require_gross_prices ?? false,
      article_76a_enabled: currentSloveniaTaxRules.article_76a_enabled ?? false,
      tax_clause_intra_eu_b2b: currentTaxClauseDefaults.intra_eu_b2b ?? "",
      tax_clause_3w_b2b: currentTaxClauseDefaults["3w_b2b"] ?? currentTaxClauseDefaults.export ?? "",
      tax_clause_3w_b2c: currentTaxClauseDefaults["3w_b2c"] ?? currentTaxClauseDefaults.export ?? "",
      tax_clause_domestic: currentTaxClauseDefaults.domestic ?? "",
      tax_clause_intra_eu_b2c: currentTaxClauseDefaults.intra_eu_b2c ?? "",
      tax_clause_article_76a: currentTaxClauseDefaults.article_76a ?? "",
      translations: {
        tax_clause_defaults: currentTaxClauseTranslations,
      },
    }),
    [
      currentTaxClauseDefaults,
      currentTaxClauseTranslations,
      currentTaxRules,
      currentSloveniaTaxRules,
      currentSettings.calculation?.default_mode,
    ],
  );
  const form = useForm<TaxRulesSettingsSchema>({
    resolver: zodResolver(taxRulesSettingsSchema),
    defaultValues,
  });
  const clauseTranslations = useWatch({ control: form.control, name: "translations.tax_clause_defaults" as any }) as
    | Record<string, Record<string, string> | undefined>
    | undefined;
  const article76aEnabled = useWatch({
    control: form.control,
    name: "article_76a_enabled",
    defaultValue: defaultValues.article_76a_enabled,
  });
  const previousDefaultValuesKeyRef = useRef<string | undefined>(undefined);
  const defaultValuesKey = JSON.stringify(defaultValues);

  useEffect(() => {
    if (previousDefaultValuesKeyRef.current === defaultValuesKey) {
      return;
    }
    previousDefaultValuesKeyRef.current = defaultValuesKey;
    form.reset(defaultValues);
  }, [defaultValues, defaultValuesKey, form]);

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
    // Send only keys this surface owns — see useUpdateEntity's settings contract
    const updatedSettings: Partial<EntitySettings> & {
      translations?: {
        tax_clause_defaults?: Record<string, Record<string, string> | undefined>;
      };
    } = {
      calculation: {
        ...currentSettings.calculation,
        default_mode: values.calculation_mode,
      },
      ...((showEuTaxRules || showArticle76a) && {
        tax_rules: {
          ...currentTaxRuleSettings,
          ...(showEuTaxRules && {
            eu: {
              vies_validate_vat: values.vies_validate_vat,
              auto_reverse_charge: values.auto_reverse_charge,
              auto_remove_tax_export: values.auto_remove_tax_export,
              require_gross_prices: values.require_gross_prices,
            },
          }),
          ...(showArticle76a && {
            slovenia: {
              article_76a_enabled: values.article_76a_enabled,
            },
          }),
        },
      }),
      tax_clause_defaults: {
        intra_eu_b2b: values.tax_clause_intra_eu_b2b || null,
        "3w_b2b": values.tax_clause_3w_b2b || null,
        "3w_b2c": values.tax_clause_3w_b2c || null,
        domestic: values.tax_clause_domestic || null,
        intra_eu_b2c: values.tax_clause_intra_eu_b2c || null,
        article_76a: showArticle76a
          ? values.tax_clause_article_76a || null
          : (currentTaxClauseDefaults.article_76a ?? null),
      },
      // Only this form's namespace; the server merges translations per
      // namespace, preserving other forms' entries
      translations: {
        tax_clause_defaults: {
          ...(currentSettings.translations?.tax_clause_defaults ?? {}),
          ...(values.translations?.tax_clause_defaults ?? {}),
        },
      } as any,
    };

    updateEntity({ id: entity.id, data: { settings: updatedSettings } });
  };

  const renderTaxClauseField = ({
    name,
    translationKey,
    label,
    description,
    placeholder,
  }: {
    name: keyof TaxRulesSettingsSchema & string;
    translationKey: "domestic" | "article_76a" | "intra_eu_b2b" | "intra_eu_b2c" | "3w_b2b" | "3w_b2c" | "export";
    label: string;
    description: string;
    placeholder: string;
  }) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => {
        const fieldTranslations = clauseTranslations?.[translationKey];
        const value =
          translationsFeatureEnabled && contentLocale !== DEFAULT_CONTENT_LOCALE
            ? readLocalizedValue(field.value ?? "", fieldTranslations, contentLocale)
            : (field.value ?? "");
        const updateValue = (nextValue: string) => {
          if (!translationsFeatureEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
            field.onChange(nextValue);
            return;
          }

          form.setValue(
            "translations",
            {
              ...(form.getValues("translations") ?? {}),
              tax_clause_defaults: {
                ...((form.getValues("translations") as any)?.tax_clause_defaults ?? {}),
                [translationKey]: writeLocalizedValue(fieldTranslations, contentLocale, nextValue),
              },
            } as any,
            { shouldDirty: true, shouldTouch: true, shouldValidate: false },
          );
        };

        return (
          <FormItem className="rounded-lg border p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <FormLabel>{label}</FormLabel>
                <FormDescription>{description}</FormDescription>
              </div>
              {translationsFeatureEnabled ? (
                <ContentLocaleButton
                  activeLocale={contentLocale}
                  defaultLocale={defaultContentLocale}
                  onChange={setContentLocale}
                  uiLocale={translationLocale ?? locale}
                  t={t}
                />
              ) : null}
            </div>
            <FormControl>
              <Textarea
                placeholder={placeholder}
                className="min-h-[80px] resize-y"
                value={value}
                onChange={(event) => updateValue(event.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  const renderRulesGroup = ({
    id,
    title,
    description,
    children,
    first = false,
  }: {
    id: string;
    title: string;
    description: string;
    children: ReactNode;
    first?: boolean;
  }) => (
    <section aria-labelledby={id} className={cn("space-y-4", !first && "border-t pt-6")}>
      <div>
        <h3 id={id} className="font-semibold text-lg">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );

  const calculationRulesContent = renderRulesGroup({
    id: "calculation-settings-heading",
    title: t("Calculation settings"),
    description: t("Choose how prices, discounts, and taxes are calculated on documents."),
    first: true,
    children: (
      <>
        <FormField
          control={form.control}
          name="calculation_mode"
          render={({ field }) => (
            <FormItem className="rounded-lg border p-4">
              <FormLabel className="text-base">{t("tax-rules.calculation_mode.label")}</FormLabel>
              <FormDescription>{t("tax-rules.calculation_mode.description")}</FormDescription>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b2b_standard">{t("tax-rules.calculation_mode.b2b_standard.label")}</SelectItem>
                    <SelectItem value="b2c_gross_discount">
                      {t("tax-rules.calculation_mode.b2c_gross_discount.label")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <div className="mt-3 space-y-1 text-muted-foreground text-sm">
                <p>{t("tax-rules.calculation_mode.b2b_standard.description")}</p>
                <p>{t("tax-rules.calculation_mode.b2c_gross_discount.description")}</p>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {showEuTaxRules ? (
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
        ) : null}
      </>
    ),
  });

  const euCrossBorderRulesContent = showEuTaxRules
    ? renderRulesGroup({
        id: "eu-cross-border-rules-heading",
        title: t("EU cross border rules"),
        description: t("Validate VAT numbers and automate reverse charge for eligible EU transactions."),
        children: (
          <>
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
          </>
        ),
      })
    : null;

  const exportRulesContent = showEuTaxRules
    ? renderRulesGroup({
        id: "export-rules-heading",
        title: t("Export rules"),
        description: t("Configure automatic tax handling for transactions outside the EU."),
        children: (
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
        ),
      })
    : null;

  const sloveniaRulesContent = showArticle76a
    ? renderRulesGroup({
        id: "slovenia-tax-rules-heading",
        title: t("Slovenia"),
        description: t("Configure domestic Slovenian tax treatments."),
        children: (
          <>
            <FormField
              control={form.control}
              name="article_76a_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t("Slovenian Article 76.a")}</FormLabel>
                    <FormDescription>
                      {t("Allow eligible domestic business invoices to report VAT under reverse charge.")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {article76aEnabled
              ? renderTaxClauseField({
                  name: "tax_clause_article_76a",
                  translationKey: "article_76a",
                  label: t("Article 76.a tax clause"),
                  description: t("Default legal clause added when Article 76.a is selected on an invoice."),
                  placeholder: t("Obrnjena davčna obveznost po 76.a členu ZDDV-1."),
                })
              : null}
          </>
        ),
      })
    : null;

  const manualTaxContent = (
    <div className="border-t pt-6">
      <div className="rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
            <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{t("Manual taxes")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("Create tax rates on the Taxes page and apply them to document lines.")}
            </p>
          </div>
        </div>
      </div>
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
      {renderTaxClauseField({
        name: "tax_clause_domestic",
        translationKey: "domestic",
        label: t("tax-clauses.domestic.label"),
        description: t("tax-clauses.domestic.description"),
        placeholder: t("Enter default tax clause..."),
      })}

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
          {renderTaxClauseField({
            name: "tax_clause_intra_eu_b2b",
            translationKey: "intra_eu_b2b",
            label: t("tax-clauses.intra_eu_b2b.label"),
            description: t("tax-clauses.intra_eu_b2b.description"),
            placeholder: t("Enter reverse charge clause..."),
          })}

          {/* 3W B2B (non-EU business) */}
          {renderTaxClauseField({
            name: "tax_clause_3w_b2b",
            translationKey: "3w_b2b",
            label: t("tax-clauses.3w_b2b.label"),
            description: t("tax-clauses.3w_b2b.description"),
            placeholder: t("Enter export exemption clause..."),
          })}

          {/* 3W B2C (non-EU consumer) */}
          {renderTaxClauseField({
            name: "tax_clause_3w_b2c",
            translationKey: "3w_b2c",
            label: t("tax-clauses.3w_b2c.label"),
            description: t("tax-clauses.3w_b2c.description"),
            placeholder: t("Enter export exemption clause..."),
          })}

          {/* Intra-EU B2C */}
          {renderTaxClauseField({
            name: "tax_clause_intra_eu_b2c",
            translationKey: "intra_eu_b2c",
            label: t("tax-clauses.intra_eu_b2c.label"),
            description: t("tax-clauses.other.description"),
            placeholder: t("Enter EU consumer sales clause..."),
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  ) : null;

  const taxRulesContent = (
    <div className="space-y-6">
      {calculationRulesContent}
      {showEuTaxRules ? (
        <>
          {euCrossBorderRulesContent}
          {exportRulesContent}
        </>
      ) : (
        manualTaxContent
      )}
      {sloveniaRulesContent}
    </div>
  );

  return (
    <Form {...form}>
      <form id="tax-rules-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {wrapSection("tax-rules", taxRulesContent)}
        {taxClausesHeader}
        {taxClausesContent && wrapSection("tax-clauses", taxClausesContent)}
      </form>
    </Form>
  );
}
