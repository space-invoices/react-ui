import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

type SortableHeaderProps = {
  children: React.ReactNode;
  field: string;
  currentOrder?: string;
  align?: "left" | "center" | "right";
  onSort?: (order: string | null) => void;
};

/**
 * Sortable column header with visual indicators
 * Cycles through: none -> asc -> desc -> none
 */
export function SortableHeader({ children, field, currentOrder, align = "left", onSort }: SortableHeaderProps) {
  const isActive = currentOrder?.replace(/^-/, "") === field;
  const isDesc = currentOrder?.startsWith("-");

  // Determine next sort state
  const getNextOrder = () => {
    if (!isActive) return field; // Not active -> ascending
    if (!isDesc) return `-${field}`; // Ascending -> descending
    return null; // Descending -> none
  };

  const nextOrder = getNextOrder();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort?.(nextOrder)}
      className={cn(
        "h-8 gap-1",
        isActive && "font-semibold",
        align === "left" && "-ml-3",
        align === "right" && "-mr-3",
      )}
      aria-label={`Sort by ${field}${isActive ? (isDesc ? " descending" : " ascending") : ""}`}
    >
      {children}
      {isActive ? (
        isDesc ? (
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />
      )}
    </Button>
  );
}
