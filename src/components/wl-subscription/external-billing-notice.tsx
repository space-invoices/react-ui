import { ExternalLink, Store } from "lucide-react";

import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import type { WLExternalBillingProvider } from "../../providers/wl-subscription-provider";
import { Button } from "../ui/button";

type TranslateValues = Record<string, string | number>;

function interpolateTranslation(template: string, values?: TranslateValues) {
  if (!values) return template;

  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function createExternalBillingTranslation({ t, namespace, locale, translationLocale }: ComponentTranslationProps) {
  const fallbackTranslation = createTranslation({
    t,
    namespace,
    locale,
    translationLocale,
    translations: {
      en: {
        "entity-billing-page.external-billing.provider.shopify": "Shopify",
        "entity-billing-page.external-billing.title": "Billing is managed in {{provider}}",
        "entity-billing-page.external-billing.description":
          "Charges, approval, and cancellation for this organization happen in {{provider}}, not here. If the {{provider}} subscription is not active yet, finish or retry the setup from the {{provider}} integration.",
        "entity-billing-page.external-billing.no-local-charges":
          "No card, PayPal, or bank transfer is charged here. {{provider}} shows the price, trial, and approval screen for each connected store.",
        "entity-billing-page.external-billing.action": "Open {{provider}} integration",
      },
    },
  });

  return (key: string, options?: { defaultValue?: string } & TranslateValues) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;

    if (t) {
      const translated = (t as (key: string, options?: Record<string, unknown>) => string)(fullKey, options);
      if (translated !== fullKey && translated !== key) {
        return interpolateTranslation(translated, options);
      }
    }

    const fallback = fallbackTranslation(key);
    if (fallback !== key) {
      return interpolateTranslation(fallback, options);
    }

    return options?.defaultValue ? interpolateTranslation(options.defaultValue, options) : fallback;
  };
}

export type ExternalBillingNoticeProps = ComponentTranslationProps & {
  provider: WLExternalBillingProvider;
  /**
   * App-provided navigation to the screen where the external subscription can be resumed, retried,
   * or managed. Without it the notice only explains where billing happens.
   */
  onManage?: () => void;
  className?: string;
};

/**
 * Explains that plan charges, approval, and cancellation happen on another platform and offers the
 * app-provided route there. It never renders a checkout, card, or coupon control, so it is the safe
 * replacement for paywalls and upgrade prompts on externally billed entities.
 */
export function ExternalBillingNotice({
  provider,
  onManage,
  className,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
}: ExternalBillingNoticeProps) {
  const t = createExternalBillingTranslation({ t: translateFn, namespace, locale, translationLocale });
  const providerName = t(`entity-billing-page.external-billing.provider.${provider}`, { defaultValue: provider });
  const values = { provider: providerName };

  return (
    <section
      className={`mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-xl border bg-card p-6 text-center ${className ?? ""}`}
      data-testid="wl-external-billing-notice"
      data-provider={provider}
    >
      <div className="rounded-full bg-muted p-3">
        <Store className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold text-xl tracking-tight">
          {t("entity-billing-page.external-billing.title", values)}
        </h2>
        <p className="text-foreground/80 text-sm">{t("entity-billing-page.external-billing.description", values)}</p>
        <p className="text-foreground/60 text-sm">
          {t("entity-billing-page.external-billing.no-local-charges", values)}
        </p>
      </div>
      {onManage ? (
        <Button type="button" onClick={onManage} data-testid="wl-external-billing-manage">
          <ExternalLink className="mr-2 h-4 w-4" />
          {t("entity-billing-page.external-billing.action", values)}
        </Button>
      ) : null}
    </section>
  );
}
