import { useEffect, useId, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { RefinementCtx } from "zod";
import { Button } from "@/ui/components/ui/button";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
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
import {
  applyPtExemptionCodeChange,
  getPtExemptionAutomaticReasonSeed,
  PT_EXEMPTION_OPTIONS,
  PT_EXEMPTION_SUGGESTIONS,
  requiresPtExemptionCustomReason,
} from "./pt-exemption-suggestions";

const translations = {
  en,
  sl,
  de,
  it,
  fr,
  es,
  pt,
  nl,
  pl,
  hr,
  sv,
  fi,
  et,
  bg,
  cs,
  sk,
  nb,
  is,
} as const;

const CODE_FIELD = "pt_exemption_code";
const REASON_FIELD = "pt_exemption_reason";

type PortugalExemptionValues = {
  pt_exemption_code?: string;
  pt_exemption_reason?: string;
};

type PortugalExemptionFieldsProps = ComponentTranslationProps;

type PortugalExemptionTaxValues = {
  tax_rates: Array<{ rate: number }>;
  pt_exemption_code?: string | null;
  pt_exemption_reason?: string | null;
};

type PortugalExemptionReasonRuleOptions = ComponentTranslationProps & {
  /** The form's `showPortugalExemptionFields`. */
  enabled: boolean;
};

/** Only 0% taxes carry Portugal exemption metadata. */
export function isPortugalExemptionRate(rate?: number | null) {
  return Number(rate ?? 0) === 0;
}

/**
 * Tax create/edit schema refinement for this block. M19 has no standard wording, so a zero-rate
 * Portugal tax using it must carry a non-blank custom reason; standard codes keep the reason
 * optional. No-op for other countries and positive rates.
 */
export function createPortugalExemptionReasonRule({ enabled, ...i18nProps }: PortugalExemptionReasonRuleOptions) {
  const t = createTranslation({ ...i18nProps, translations });

  return (values: PortugalExemptionTaxValues, ctx: RefinementCtx) => {
    if (!enabled || !isPortugalExemptionRate(values.tax_rates[0]?.rate)) return;
    if (!requiresPtExemptionCustomReason(values.pt_exemption_code) || values.pt_exemption_reason?.trim()) return;

    ctx.addIssue({
      code: "custom",
      path: [REASON_FIELD],
      message: t("Enter the legal reason for this M19 exemption."),
    });
  };
}

/**
 * Shared Portugal zero-rate exemption block for the tax create and edit forms.
 *
 * The code stays free text so an entity can enter any AT code, and the reason stays editable.
 * Picking or typing one of the suggested codes fills its legal reason only while the reason is
 * empty or still holds the suggestion this component last applied; a custom or edited reason is
 * always preserved.
 */
export function PortugalExemptionFields(i18nProps: PortugalExemptionFieldsProps) {
  const form = useFormContext<PortugalExemptionValues>();
  const codeOptionsId = useId();
  const t = createTranslation({ ...i18nProps, translations });
  const code = useWatch({ control: form.control, name: CODE_FIELD });
  const automaticReasonRef = useRef<{ seeded: boolean; value?: string }>({ seeded: false });
  const { getFieldState, getValues, setValue, trigger } = form;
  const reasonHelp = requiresPtExemptionCustomReason(code)
    ? t("M19 has no standard wording. Enter the legal basis your accountant advises; it is printed on the invoice.")
    : t("This reason is printed on the invoice. Change it to the legal basis your accountant advises.");

  useEffect(() => {
    const currentReason = getValues(REASON_FIELD);

    if (!automaticReasonRef.current.seeded) {
      automaticReasonRef.current = {
        seeded: true,
        value: getPtExemptionAutomaticReasonSeed(code, currentReason),
      };
    }

    const next = applyPtExemptionCodeChange({
      code,
      reason: currentReason,
      automaticReason: automaticReasonRef.current.value,
    });
    automaticReasonRef.current.value = next.automaticReason;

    if ((currentReason ?? "") !== (next.reason ?? "")) {
      setValue(REASON_FIELD, next.reason, { shouldDirty: true });
    }

    // The reason rule depends on the code, so a code change can settle an error shown on submit.
    if (getFieldState(REASON_FIELD).error) {
      void trigger(REASON_FIELD);
    }
  }, [code, getFieldState, getValues, setValue, trigger]);

  return (
    <div className="space-y-4 rounded-lg border border-dashed p-4">
      <div className="space-y-1">
        <p className="font-medium text-sm">{t("Portugal exemption metadata")}</p>
        <p className="text-muted-foreground text-sm">
          {t("0% Portugal taxes require an exemption code and legal reason for SAF-T and certified documents.")}
        </p>
      </div>

      <FormField
        control={form.control}
        name={CODE_FIELD}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Exemption code")}</FormLabel>
            <FormControl>
              <Input
                list={codeOptionsId}
                placeholder={t("Enter exemption code")}
                {...field}
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value)}
              />
            </FormControl>
            <FormMessage />
            <datalist id={codeOptionsId}>
              {PT_EXEMPTION_OPTIONS.map(({ code, reason }) => (
                <option key={code} value={code}>
                  {reason}
                </option>
              ))}
              <option value="M19">Outras isenções</option>
            </datalist>
            <FormDescription>{t("Common exemption codes")}</FormDescription>
            <div className="flex flex-wrap gap-2">
              {PT_EXEMPTION_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion.code}
                  type="button"
                  variant="outline"
                  size="xs"
                  aria-label={`${suggestion.code} — ${suggestion.reason}`}
                  title={suggestion.reason}
                  onClick={() => setValue(CODE_FIELD, suggestion.code, { shouldDirty: true })}
                >
                  {suggestion.code}
                </Button>
              ))}
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={REASON_FIELD}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Exemption reason")}</FormLabel>
            <FormControl>
              <Textarea
                className="min-h-16"
                placeholder={t("Enter exemption reason")}
                {...field}
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value || undefined)}
              />
            </FormControl>
            <FormDescription>
              {reasonHelp} {t("SAF-T accepts at most 60 characters.")}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export type { PortugalExemptionFieldsProps };
