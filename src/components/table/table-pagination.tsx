import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/ui/components/ui/button";

type PaginationProps = {
  prevCursor?: string | null;
  nextCursor?: string | null;
  onPageChange: (cursor: { prev?: string; next?: string }) => void;
};

/**
 * Cursor-based pagination controls
 */
export function Pagination({ prevCursor, nextCursor, onPageChange }: PaginationProps) {
  const hasPrevious = Boolean(prevCursor);
  const hasNext = Boolean(nextCursor);

  return (
    <div className="flex items-center justify-end space-x-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 cursor-pointer p-0"
        onClick={() => onPageChange({ prev: prevCursor ?? undefined })}
        disabled={!hasPrevious}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 cursor-pointer p-0"
        onClick={() => onPageChange({ next: nextCursor ?? undefined })}
        disabled={!hasNext}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
