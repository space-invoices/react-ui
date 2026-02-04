import type { Activity } from "@spaceinvoices/js-sdk";
import { CheckCircle2, Circle, Clock, Mail, Pencil, Receipt, RefreshCw, Trash2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import de from "./locales/de";
import sl from "./locales/sl";

const translations = { de, sl } as const;

// Re-export for convenience
export type { Activity };

interface ActivityTimelineProps extends ComponentTranslationProps {
  activities: Activity[];
  isLoading?: boolean;
}

/**
 * Get icon and color for activity action type
 */
function getActivityIcon(action: string) {
  const iconMap: Record<string, { icon: typeof Circle; color: string }> = {
    created: { icon: CheckCircle2, color: "text-green-500" },
    updated: { icon: Pencil, color: "text-blue-500" },
    deleted: { icon: Trash2, color: "text-red-500" },
    voided: { icon: XCircle, color: "text-gray-500" },
    sent: { icon: Mail, color: "text-purple-500" },
    exported: { icon: Receipt, color: "text-orange-500" },
    synced: { icon: RefreshCw, color: "text-cyan-500" },
    fiscalized: { icon: CheckCircle2, color: "text-emerald-500" },
  };
  return iconMap[action] || { icon: Circle, color: "text-gray-400" };
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date | string, t: (key: string) => string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("just now");
  if (diffMins < 60) return `${diffMins} ${t("minutes ago")}`;
  if (diffHours < 24) return `${diffHours} ${t("hours ago")}`;
  return `${diffDays} ${t("days ago")}`;
}

/**
 * Get display label for actor
 */
function getActorLabel(activity: Activity, t: (key: string) => string): string {
  if (activity.actor_label) return activity.actor_label;
  if (activity.actor_type === "user") return t("user");
  if (activity.actor_type === "system") return t("system");
  if (activity.actor_type === "cron") return t("cron");
  if (activity.actor_type === "webhook") return t("webhook");
  return activity.actor_type;
}

/**
 * Activity Timeline Component
 *
 * Displays a chronological list of activities for a resource.
 * Shows icon, action, actor, and relative timestamp.
 */
export function ActivityTimeline({ activities, isLoading, ...i18nProps }: ActivityTimelineProps) {
  const t = createTranslation({ translations, ...i18nProps });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("Activity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-start gap-3">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("Activity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            <span>{t("No activities yet for this resource")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("Activity")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-3 bottom-3 left-2.5 w-px bg-border" />

          {/* Activity items */}
          <div className="space-y-4">
            {activities.map((activity) => {
              const { icon: Icon, color } = getActivityIcon(activity.action);
              return (
                <div key={activity.id} className="relative flex items-start gap-3 pl-0">
                  {/* Icon */}
                  <div className={`relative z-10 bg-background ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t(activity.action)}</span>
                      <span className="text-muted-foreground text-xs">{getActorLabel(activity, t)}</span>
                    </div>
                    <div className="mt-0.5 text-muted-foreground text-xs">
                      {formatRelativeTime(activity.created_at, t)}
                    </div>
                    {/* Details if available */}
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="mt-1 text-muted-foreground text-xs">
                        {activity.action === "sent" && (activity.details as { to?: string }).to && (
                          <span>to {(activity.details as { to: string }).to}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
