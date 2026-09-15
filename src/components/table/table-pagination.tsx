import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/ui/components/ui/button";

export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type PaginationProps = {
  prevCursor?: string | null;
  nextCursor?: string | null;
  onPageChange: (cursor: { prev?: string; next?: string }) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  t?: (key: string) => string;
};

/**
 * Cursor-based pagination controls
 */
export function Pagination({
  prevCursor,
  nextCursor,
  onPageChange,
  limit,
  onLimitChange,
  t = (key) => key,
}: PaginationProps) {
  const hasPrevious = Boolean(prevCursor);
  const hasNext = Boolean(nextCursor);
  const resolvedLimit = limit ?? 10;
  const pageSizeOptions = [
    ...new Set([...TABLE_PAGE_SIZE_OPTIONS, ...(resolvedLimit >= 1 && resolvedLimit <= 100 ? [resolvedLimit] : [])]),
  ].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center justify-start gap-3">
      <div className="flex items-center justify-start space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 cursor-pointer p-0"
          onClick={() => onPageChange({ prev: prevCursor ?? undefined })}
          disabled={!hasPrevious}
          aria-label={t("Previous page")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 cursor-pointer p-0"
          onClick={() => onPageChange({ next: nextCursor ?? undefined })}
          disabled={!hasNext}
          aria-label={t("Next page")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {onLimitChange && (
        <label className="flex items-center gap-2 text-muted-foreground text-sm">
          <span>{t("Rows per page")}</span>
          <select
            aria-label={t("Rows per page")}
            className="h-8 rounded-md border border-input bg-background px-2 text-foreground text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={String(resolvedLimit)}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
