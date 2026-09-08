"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { type ComponentTranslationProps, createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";
import translations from "./locales";

/**
 * Why a dashboard widget cannot show a value:
 * - `error`: the query failed; the user can retry.
 * - `conversion`: at least one document lacks a usable entity-currency amount, so a total would be wrong.
 * - `currency`: the entity has no currency configured, so amounts cannot be labelled.
 */
export type DashboardUnavailableReason = "error" | "conversion" | "currency";

const REASON_MESSAGE_KEYS: Record<DashboardUnavailableReason, string> = {
  error: "This data could not be loaded.",
  conversion: "Some historical amounts need verification before this total can be shown.",
  currency: "Set the entity currency in settings to show amounts.",
};

export type DashboardUnavailableProps = {
  reason: DashboardUnavailableReason;
  /** Offered for `error` only; conversion and currency problems are not fixed by refetching. */
  onRetry?: () => void;
  className?: string;
} & Pick<ComponentTranslationProps, "locale" | "translationLocale" | "t" | "namespace">;

/** Inline unavailable notice for use inside any dashboard card body. */
export function DashboardUnavailable({
  reason,
  onRetry,
  className,
  locale,
  translationLocale,
  t: externalT,
  namespace,
}: DashboardUnavailableProps) {
  const t = createTranslation({ t: externalT, namespace, locale, translationLocale, translations });
  const canRetry = reason === "error" && !!onRetry;

  return (
    <div role="status" className={cn("flex flex-col gap-2 text-muted-foreground text-sm", className)}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="font-medium text-foreground">{t("Unavailable")}</div>
          <p className="break-words">{t(REASON_MESSAGE_KEYS[reason])}</p>
        </div>
      </div>
      {canRetry && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {t("Try again")}
          </Button>
        </div>
      )}
    </div>
  );
}

export type UnavailableCardProps = DashboardUnavailableProps & {
  title: string;
  description?: string;
  cardClassName?: string;
};

/** A titled card whose body is the unavailable notice; drop-in replacement for a stat or chart card. */
export function UnavailableCard({ title, description, cardClassName, className, ...props }: UnavailableCardProps) {
  return (
    <Card className={cn("gap-2", cardClassName)}>
      <CardHeader className="pb-1">
        <CardTitle className="font-medium text-muted-foreground text-sm">{title}</CardTitle>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </CardHeader>
      <CardContent className="pt-0">
        <DashboardUnavailable className={className} {...props} />
      </CardContent>
    </Card>
  );
}
