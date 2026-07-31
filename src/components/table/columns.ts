import type { Column, ColumnOverride } from "./types";

export function mergeColumnOverrides<T>(
  columns: Column<T>[],
  overrides?: Partial<Record<string, ColumnOverride<T>>>,
): Column<T>[] {
  if (!overrides) return columns;

  return columns.map((column) => ({ ...column, ...overrides[column.id] }));
}
