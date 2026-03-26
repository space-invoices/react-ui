import type { Column, TableColumnSort, TableOrderByValue, TableSortDirection } from "./types";

export function orderByEquals(left: TableOrderByValue | undefined, right: TableOrderByValue | undefined) {
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
  }

  return left === right;
}

function resolveColumnSort<T>(column: Column<T>): Required<TableColumnSort> | null {
  if (!column.sort) {
    return null;
  }

  if (column.sort === true) {
    return {
      asc: column.id,
      desc: `-${column.id}`,
      defaultDirection: "asc",
      clearOnThirdClick: true,
    };
  }

  return {
    asc: column.sort.asc ?? column.id,
    desc: column.sort.desc ?? `-${column.id}`,
    defaultDirection: column.sort.defaultDirection ?? "asc",
    clearOnThirdClick: column.sort.clearOnThirdClick ?? true,
  };
}

export function getColumnSortDirection<T>(
  column: Column<T>,
  orderBy: TableOrderByValue | undefined,
): TableSortDirection | null {
  const sort = resolveColumnSort(column);
  if (!sort) {
    return null;
  }

  if (orderByEquals(orderBy, sort.asc)) {
    return "asc";
  }

  if (orderByEquals(orderBy, sort.desc)) {
    return "desc";
  }

  return null;
}

export function getNextColumnOrderBy<T>(
  column: Column<T>,
  currentOrderBy: TableOrderByValue | undefined,
): TableOrderByValue | undefined {
  const sort = resolveColumnSort(column);
  if (!sort) {
    return currentOrderBy;
  }

  const currentDirection = getColumnSortDirection(column, currentOrderBy);

  if (currentDirection === null) {
    return sort.defaultDirection === "desc" ? sort.desc : sort.asc;
  }

  const reverseDirection = sort.defaultDirection === "desc" ? "asc" : "desc";

  if (currentDirection === sort.defaultDirection) {
    return reverseDirection === "desc" ? sort.desc : sort.asc;
  }

  return sort.clearOnThirdClick ? undefined : sort.defaultDirection === "desc" ? sort.desc : sort.asc;
}

export function isSortableColumn<T>(column: Column<T>) {
  return resolveColumnSort(column) !== null;
}
