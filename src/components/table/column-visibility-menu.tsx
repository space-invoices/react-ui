import { Columns3 } from "lucide-react";

import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";

import type { Column } from "./types";

type ColumnVisibilityMenuProps<T> = {
  columns: Column<T>[];
  canToggle: (column: Column<T>) => boolean;
  isVisible: (column: Column<T>) => boolean;
  onReset: () => void;
  onToggle: (column: Column<T>) => void;
  t: (key: string) => string;
};

function labelForColumn<T>(column: Column<T>) {
  return typeof column.header === "string" ? column.header : column.visibilityLabel;
}

export function ColumnVisibilityMenu<T>({
  columns,
  canToggle,
  isVisible,
  onReset,
  onToggle,
  t,
}: ColumnVisibilityMenuProps<T>) {
  const selectableColumns = columns.filter(
    (column) => column.id !== "actions" && column.hideable !== false && Boolean(labelForColumn(column)),
  );

  if (selectableColumns.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" aria-label={t("Columns")}>
          <Columns3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("Columns")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {selectableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={isVisible(column)}
            disabled={!canToggle(column)}
            onCheckedChange={() => onToggle(column)}
          >
            {labelForColumn(column)}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset}>{t("Reset columns")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
