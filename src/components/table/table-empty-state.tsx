import { Sprout } from "lucide-react";

import { Button } from "@/ui/components/ui/button";

type TableEmptyStateProps = {
  resource: string;
  createNewLink?: string;
  createNewTrigger?: React.ReactNode;
  /** Number of rows to calculate height (default: 10) */
  rows?: number;
  /** Translation function */
  t?: (key: string) => string;
};

// Approximate row height in pixels (including padding/border)
const ROW_HEIGHT = 53;

/**
 * Empty state shown when table has no data
 */
export function TableEmptyState({
  createNewLink,
  createNewTrigger,
  rows = 10,
  t = (key) => key,
}: TableEmptyStateProps) {
  // Calculate height based on row count (min 200px)
  const height = Math.max(rows * ROW_HEIGHT, 200);

  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ height }}>
      <Sprout size={70} strokeWidth={0.35} className="text-muted-foreground" />
      <div className="space-y-1 text-center">
        <p className="font-light text-lg text-muted-foreground">{t("Your list is empty")}</p>
        {(createNewLink || createNewTrigger) && (
          <p className="text-muted-foreground text-sm">{t("Get started by creating your first entry")}</p>
        )}
      </div>
      {createNewLink && (
        <Button variant="default" size="sm" asChild>
          <a href={createNewLink}>{t("Create new")}</a>
        </Button>
      )}
      {createNewTrigger && !createNewLink && <div>{createNewTrigger}</div>}
    </div>
  );
}
