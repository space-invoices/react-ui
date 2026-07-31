import { Check, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

type TableRefreshButtonProps = {
  onRefresh?: () => unknown;
  isRefreshing?: boolean;
  t?: (key: string) => string;
  className?: string;
};

type RefreshState = "idle" | "loading" | "success" | "error";

const MIN_MANUAL_REFRESH_MS = 500;
const MAX_MANUAL_REFRESH_MS = 10_000;
const REFRESH_FEEDBACK_MS = 1000;

export function TableRefreshButton({
  onRefresh,
  isRefreshing = false,
  t = (key) => key,
  className,
}: TableRefreshButtonProps) {
  const [manualState, setManualState] = useState<RefreshState>("idle");
  const [announcement, setAnnouncement] = useState("");
  const mountedRef = useRef(true);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }
    };
  }, []);

  if (!onRefresh) {
    return null;
  }

  const label = t("Refresh list");
  const isManuallyRefreshing = manualState === "loading";
  const showSuccess = manualState === "success";
  const title = manualState === "success" ? t("List refreshed") : manualState === "error" ? t("Refresh failed") : label;

  const handleRefresh = () => {
    if (isManuallyRefreshing) {
      return;
    }

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
    }

    setManualState("loading");
    setAnnouncement("");
    const startedAt = Date.now();
    let finished = false;

    const finish = (state: Extract<RefreshState, "success" | "error">, statusMessage: string) => {
      if (finished) {
        return;
      }

      finished = true;

      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }

      const remainingMs = Math.max(0, MIN_MANUAL_REFRESH_MS - (Date.now() - startedAt));
      feedbackTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) {
          return;
        }

        setManualState(state);
        setAnnouncement(statusMessage);
        feedbackTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setManualState("idle");
            setAnnouncement("");
          }
        }, REFRESH_FEEDBACK_MS);
      }, remainingMs);
    };

    timeoutTimerRef.current = setTimeout(() => {
      finish("error", t("Refresh timed out"));
    }, MAX_MANUAL_REFRESH_MS);

    try {
      void Promise.resolve(onRefresh()).then(
        () => finish("success", t("List refreshed")),
        () => finish("error", t("Refresh failed")),
      );
    } catch {
      finish("error", t("Refresh failed"));
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={cn(
          "ml-auto h-8 w-8 transition-colors",
          manualState === "error" && "border-destructive/60 text-destructive",
          className,
        )}
        onClick={handleRefresh}
        disabled={isManuallyRefreshing}
        aria-label={label}
        title={title}
        aria-busy={isManuallyRefreshing || undefined}
        data-background-refreshing={isRefreshing || undefined}
        data-refresh-state={manualState}
      >
        {showSuccess ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <RefreshCw className={cn("h-3.5 w-3.5", isManuallyRefreshing && "animate-spin")} />
        )}
      </Button>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
