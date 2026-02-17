import type { GetActivities200DataItem } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Skeleton } from "@/ui/components/ui/skeleton";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";

const translations = { sl, de, it, fr, es, pt, nl, pl, hr } as const;

const PAGE_SIZE = 5;

interface DocumentActivitiesListProps extends ComponentTranslationProps {
  documentId: string;
  entityId: string;
  currentUserId?: string;
  locale?: string;
  variant?: "card" | "inline";
}

function formatActivityDate(date: string, locale: string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getActionLabel(action: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    created: t("Created"),
    updated: t("Updated"),
    voided: t("Voided"),
    sent: t("Sent"),
    deleted: t("Deleted"),
  };
  return labels[action] || action;
}

function getActorLabel(activity: GetActivities200DataItem, t: (key: string) => string, currentUserId?: string): string {
  if (currentUserId && activity.actor_id === currentUserId) return t("me");
  if (activity.actor_label) return activity.actor_label;
  const typeLabels: Record<string, string> = {
    system: t("System"),
    api_key: "API",
    cron: t("Scheduled"),
    webhook: "Webhook",
  };
  return typeLabels[activity.actor_type] || activity.actor_type;
}

export function DocumentActivitiesList({
  documentId,
  entityId,
  currentUserId,
  locale = "en",
  variant = "card",
  ...i18nProps
}: DocumentActivitiesListProps) {
  const t = createTranslation({ translations, locale, ...i18nProps });
  const { sdk } = useSDK();

  const [cursors, setCursors] = useState<string[]>([]);
  const currentCursor = cursors.length > 0 ? cursors[cursors.length - 1] : undefined;

  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ["activities", documentId, entityId, currentCursor],
    queryFn: async () => {
      if (!sdk) throw new Error("SDK not initialized");

      return sdk.activities.list({
        entity_id: entityId,
        resource_id: documentId,
        order_by: "-created_at",
        limit: PAGE_SIZE,
        next_cursor: currentCursor,
      });
    },
    enabled: !!sdk && !!entityId && !!documentId,
  });

  const activities = activitiesData?.data || [];
  const pagination = activitiesData?.pagination;

  const handleNextPage = () => {
    if (pagination?.next_cursor) {
      setCursors((prev) => [...prev, pagination.next_cursor!]);
    }
  };

  const handlePrevPage = () => {
    setCursors((prev) => prev.slice(0, -1));
  };

  const hasPrev = cursors.length > 0;
  const hasNext = !!pagination?.has_more;

  const paginationButtons = (hasPrev || hasNext) && (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrevPage}
        disabled={!hasPrev}
        className="h-8 w-8 cursor-pointer p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNextPage}
        disabled={!hasNext}
        className="h-8 w-8 cursor-pointer p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const bodyContent = isLoading ? (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : activities.length === 0 ? (
    <p className="py-4 text-center text-muted-foreground text-sm">{t("No activity")}</p>
  ) : (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start justify-between rounded-md border p-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">{getActionLabel(activity.action, t)}</span>
            <span className="text-muted-foreground text-xs">
              {t("by")} {getActorLabel(activity, t, currentUserId)}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">{formatActivityDate(activity.created_at, locale)}</span>
        </div>
      ))}
    </div>
  );

  if (variant === "inline") {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-sm">
            {t("Activity")} {pagination && pagination.total > 0 && `(${pagination.total})`}
          </h3>
          {paginationButtons}
        </div>
        {bodyContent}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">
          {t("Activity")} {pagination && pagination.total > 0 && `(${pagination.total})`}
        </CardTitle>
        {paginationButtons}
      </CardHeader>
      <CardContent>{bodyContent}</CardContent>
    </Card>
  );
}
