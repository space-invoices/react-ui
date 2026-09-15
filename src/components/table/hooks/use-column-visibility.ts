import { useCallback, useEffect, useMemo, useState } from "react";

import type { Column } from "../types";

const STORAGE_PREFIX = "space-invoices.table-columns.v1";

type VisibilityState = {
  key: string | false;
  signature: string;
  overrides: Record<string, boolean>;
};

function storageKey(key: string) {
  return `${STORAGE_PREFIX}:${key}`;
}

function isHideableColumn<T>(column: Column<T>) {
  return column.id !== "actions" && column.hideable !== false;
}

function readOverrides(key: string, ids: string[]) {
  if (typeof window === "undefined") return {} as Record<string, boolean>;

  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey(key)) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, boolean>;

    const knownIds = new Set(ids);
    return Object.fromEntries(
      Object.entries(value).filter(([id, visible]) => knownIds.has(id) && typeof visible === "boolean"),
    ) as Record<string, boolean>;
  } catch {
    return {} as Record<string, boolean>;
  }
}

function pruneOverrides(overrides: Record<string, boolean>, ids: string[]) {
  const knownIds = new Set(ids);
  return Object.fromEntries(
    Object.entries(overrides).filter(([id, visible]) => knownIds.has(id) && typeof visible === "boolean"),
  ) as Record<string, boolean>;
}

function writeOverrides(key: string, overrides: Record<string, boolean>) {
  if (typeof window === "undefined") return;

  try {
    if (Object.keys(overrides).length === 0) {
      window.localStorage.removeItem(storageKey(key));
    } else {
      window.localStorage.setItem(storageKey(key), JSON.stringify(overrides));
    }
  } catch {
    // Private browsing and embedded consumers can deny storage access.
  }
}

export function useColumnVisibility<T>(key: string | false, columns: Column<T>[]) {
  const hideableIds = useMemo(() => columns.filter(isHideableColumn).map((column) => column.id), [columns]);
  const signature = JSON.stringify(hideableIds);
  const [state, setState] = useState<VisibilityState>(() => ({
    key,
    signature,
    overrides: key ? readOverrides(key, hideableIds) : {},
  }));
  const overrides =
    state.key === key ? pruneOverrides(state.overrides, hideableIds) : key ? readOverrides(key, hideableIds) : {};

  useEffect(() => {
    setState((current) => {
      if (current.key === key) {
        if (current.signature === signature) return current;
        return { ...current, signature, overrides: pruneOverrides(current.overrides, hideableIds) };
      }
      return { key, signature, overrides: key ? readOverrides(key, hideableIds) : {} };
    });
  }, [hideableIds, key, signature]);

  const rawIsVisible = useCallback(
    (column: Column<T>) => {
      if (column.id === "actions") return true;
      if (!isHideableColumn(column)) return true;
      return overrides[column.id] ?? column.defaultVisible !== false;
    },
    [overrides],
  );

  const forcedVisibleId = useMemo(() => {
    const dataColumns = columns.filter((column) => column.id !== "actions");
    if (dataColumns.some(rawIsVisible)) return undefined;
    return dataColumns.find((column) => column.defaultVisible !== false)?.id ?? dataColumns[0]?.id;
  }, [columns, rawIsVisible]);

  const isVisible = useCallback(
    (column: Column<T>) => column.id === forcedVisibleId || rawIsVisible(column),
    [forcedVisibleId, rawIsVisible],
  );
  const visibleColumns = useMemo(() => columns.filter(isVisible), [columns, isVisible]);

  const canToggle = useCallback(
    (column: Column<T>) => {
      if (!key || !isHideableColumn(column)) return false;
      if (!isVisible(column)) return true;
      return columns.filter((candidate) => candidate.id !== "actions" && isVisible(candidate)).length > 1;
    },
    [columns, isVisible, key],
  );

  const toggle = useCallback(
    (column: Column<T>) => {
      if (!key || !canToggle(column)) return;

      const nextVisible = !isVisible(column);
      const next = { ...overrides };
      if (nextVisible === (column.defaultVisible !== false)) {
        delete next[column.id];
      } else {
        next[column.id] = nextVisible;
      }
      writeOverrides(key, next);
      setState({ key, signature, overrides: next });
    },
    [canToggle, isVisible, key, overrides, signature],
  );

  const reset = useCallback(() => {
    if (!key) return;
    writeOverrides(key, {});
    setState({ key, signature, overrides: {} });
  }, [key, signature]);

  return { canToggle, isVisible, reset, toggle, visibleColumns };
}
