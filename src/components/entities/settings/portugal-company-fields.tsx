import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/ui/collapsible";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { FormattedInput } from "@/ui/lib/formatted-input";
import {
  hasAdvancedCompanyDisclosures,
  isCompanyLegalForm,
  LEGAL_FORMS,
  type LegalDetails,
  type LegalForm,
  requiresShareCapital,
} from "@/ui/lib/legal-details";
import { NumericInput } from "@/ui/lib/numeric-input";
import { formatPortugalPhoneEntry } from "@/ui/lib/pt-entity-input";
import { cn } from "@/ui/lib/utils";

export type PortugalCompanyFieldsProps = {
  /** Host form control. Untyped like `FormInput`'s, since the host owns the field-value shape. */
  control: any;
  /** Translator already scoped to the host form's namespace. */
  t: (key: string) => string;
  /** Entity locale — capital figures are money entry and follow the entity, not the UI language. */
  inputLocale: string;
  /** Legal details already stored on the entity, so an existing disclosure is never hidden. */
  storedLegalDetails?: LegalDetails | null;
};

/** English keys double as the baseline copy; see the UI package translation model. */
export const PORTUGAL_LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  sole_trader: "Individual professional or sole trader",
  limited_liability_company: "Private limited company (Lda.)",
  public_limited_company: "Public limited company (S.A.)",
  partnership_limited_by_shares: "Partnership limited by shares",
  other_company: "Other company",
};

function hasValue(value: number | string | null | undefined): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim() !== "";
}

/**
 * The Portuguese company details an entity has to publish, asked for according to
 * what the business actually is.
 *
 * An individual professional has no company registry entry and no share capital,
 * so they are never asked for one. Companies give their registry office and
 * registration number; the capital-based forms also give their share capital,
 * where zero is a valid figure. The remaining disclosures are conditional by law
 * and stay behind an "advanced" toggle, opened automatically when the entity
 * already has one of them recorded.
 *
 * Requirement rules live in `@/ui/lib/pt-entity-input` so the create and settings
 * forms enforce one shared set.
 */
export function PortugalCompanyFields({ control, t, inputLocale, storedLegalDetails }: PortugalCompanyFieldsProps) {
  const legalForm = useWatch({ control, name: "legal_form" }) as LegalForm | null | undefined;
  const shareCapital = useWatch({ control, name: "starting_capital" }) as number | string | null | undefined;
  const companyNumber = useWatch({ control, name: "company_number" }) as string | null | undefined;
  const registrationOffice = useWatch({ control, name: "registration_office" }) as string | null | undefined;
  const [showAdvanced, setShowAdvanced] = useState(() => hasAdvancedCompanyDisclosures(storedLegalDetails));

  const isCompany = isCompanyLegalForm(legalForm);
  const needsShareCapital = requiresShareCapital(legalForm);

  // An entity that predates the legal form still has to be able to see and correct
  // what it already published, so a stored value keeps its field on screen.
  const showRegistrationFields = isCompany || hasValue(companyNumber) || hasValue(registrationOffice);
  const showShareCapital = needsShareCapital || hasValue(shareCapital);

  return (
    <div className="border-t pt-6">
      <p className="font-medium text-base">{t("Portugal Details")}</p>
      <p className="mt-1 mb-4 text-muted-foreground text-xs">
        {t("Portuguese invoices carry these details. What is required depends on your legal form.")}
      </p>

      <div className="space-y-6">
        <FormField
          control={control}
          name="legal_form"
          render={({ field }) => (
            <FormItem className="max-w-sm">
              <FormLabel className="font-medium text-base">
                {t("Legal Form")}
                <span className="ml-1 text-red-500">*</span>
              </FormLabel>
              <Select<LegalForm> value={field.value ?? null} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-10 w-full" aria-required="true">
                    <SelectValue placeholder={t("Select your legal form")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LEGAL_FORMS.map((form) => (
                    <SelectItem key={form} value={form}>
                      {t(PORTUGAL_LEGAL_FORM_LABELS[form])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs">
                {t("Decides which registration and capital details Portugal asks you for")}
              </FormDescription>
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
                <FormattedInput
                  name={field.name}
                  ref={field.ref}
                  disabled={field.disabled}
                  type="tel"
                  autoComplete="tel"
                  value={field.value || ""}
                  formatter={formatPortugalPhoneEntry}
                  onValueChange={(value) => field.onChange(value || null)}
                  onBlur={field.onBlur}
                  placeholder="912 345 678"
                  className="h-10"
                />
              </FormControl>
              <FormDescription className="text-xs">
                {t("Enter 912 345 678 for Portugal, or include + and the country code for another country.")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {showRegistrationFields && (
          <>
            <FormField
              control={control}
              name="registration_office"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel className="font-medium text-base">{t("Registry Office")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="Lisboa"
                      className="h-10"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {t("Commercial registry where the company is registered")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormDescription className="text-xs">
                    {t("Digits and slashes only, as shown on your registration.")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {showShareCapital && (
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
        )}

        {isCompany && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger className="flex cursor-pointer items-center gap-1 text-muted-foreground text-sm hover:text-foreground">
              <ChevronDown className={cn("size-4 transition-transform", showAdvanced && "rotate-180")} />
              {t("Conditional company disclosures")}
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-6 pt-4">
              <p className="text-muted-foreground text-xs">
                {t("Leave these empty unless one of them applies to your company.")}
              </p>

              <FormField
                control={control}
                name="paid_up_capital"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel className="font-medium text-base">{t("Paid-up Capital")}</FormLabel>
                    <FormControl>
                      <NumericInput
                        {...field}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        inputLocale={inputLocale}
                        placeholder={typeof shareCapital === "number" ? String(shareCapital) : "5000"}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t("Only needed when less than the share capital has actually been paid in")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="equity"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel className="font-medium text-base">{t("Equity")}</FormLabel>
                    <FormControl>
                      <NumericInput
                        {...field}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        inputLocale={inputLocale}
                        placeholder="0"
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t(
                        "Only needed when equity has fallen to half the share capital or less. Use the figure from your last approved balance sheet.",
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="in_liquidation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value === true} onCheckedChange={field.onChange} className="mt-1" />
                    </FormControl>
                    <div>
                      <FormLabel className="font-normal">{t("Company is in liquidation")}</FormLabel>
                      <FormDescription className="text-xs">
                        {t("Documents must say so while the company is being wound up")}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
