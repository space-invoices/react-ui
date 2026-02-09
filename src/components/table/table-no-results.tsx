import { FileX } from "lucide-react";

import { Button } from "@/ui/components/ui/button";
import { TableCell, TableRow } from "@/ui/components/ui/table";

type TableNoResultsProps = {
  resource: string;
  search?: (value: null) => void;
  /** Number of rows to calculate height (default: 10) */
  rows?: number;
  /** Translation function */
  t?: (key: string) => string;
};

// Approximate row height in pixels (including padding/border)
const ROW_HEIGHT = 53;

/**
 * No results message shown when search returns empty
 */
export function TableNoResults({ search, rows = 10, t = (key) => key }: TableNoResultsProps) {
  // Calculate height based on row count (min 150px)
  const height = Math.max(rows * ROW_HEIGHT, 150);

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={100} className="text-center align-middle" style={{ height }}>
        <div className="flex flex-col items-center gap-3">
          <FileX size={32} strokeWidth={1.5} className="text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">{t("No results found")}</p>
            {search && <p className="text-muted-foreground text-sm">{t("Try adjusting your search criteria")}</p>}
          </div>
          {search && (
            <Button variant="link" size="sm" onClick={() => search(null)} className="underline">
              {t("Clear search")}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
