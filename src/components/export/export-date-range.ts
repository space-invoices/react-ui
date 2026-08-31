const MAX_DATE_RANGE_MS = 365 * 24 * 60 * 60 * 1000;

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPreviousMonthRange(): { from: string; to: string } {
  const now = new Date();
  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: formatDateLocal(firstDayPrevMonth),
    to: formatDateLocal(lastDayPrevMonth),
  };
}

export function isDateRangeValid(dateFrom: string, dateTo: string): boolean {
  if (!dateFrom || !dateTo) return true;
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const duration = to.getTime() - from.getTime();
  return duration >= 0 && duration <= MAX_DATE_RANGE_MS;
}
