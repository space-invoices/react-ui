const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toLocalDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeDateOnlyInput(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (DATE_ONLY_PATTERN.test(value)) return value;

  const utcMidnightMatch = value.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?Z$/);
  if (utcMidnightMatch) {
    return utcMidnightMatch[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return toLocalDateOnlyString(date);
}

export function toUtcMidnightIsoString(value: string | undefined): string | undefined {
  const dateOnly = normalizeDateOnlyInput(value);
  return dateOnly ? `${dateOnly}T00:00:00.000Z` : undefined;
}
