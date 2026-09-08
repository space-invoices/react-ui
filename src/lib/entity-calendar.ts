/**
 * Entity calendar helpers.
 *
 * Dashboard periods are business calendar dates in the entity's IANA timezone
 * (`entity.timezone`, stored NOT NULL with a `UTC` default by the API), not the
 * browser's local calendar. All helpers work on plain calendar tuples so no
 * `new Date("YYYY-MM-DD")` parsing (UTC midnight) can shift a day or month.
 */

export const DEFAULT_ENTITY_TIME_ZONE = "UTC";

export type CalendarDate = { year: number; month: number; day: number };
export type CalendarMonth = { year: number; month: number };
export type CalendarRange = { from: string; to: string };

const timeZoneValidity = new Map<string, boolean>();

export function isValidTimeZone(timeZone: string): boolean {
  const cached = timeZoneValidity.get(timeZone);
  if (cached !== undefined) return cached;
  let valid = false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    valid = true;
  } catch {
    valid = false;
  }
  timeZoneValidity.set(timeZone, valid);
  return valid;
}

/** Entity timezone with the API's own fallback (`UTC`) for missing or unusable values. */
export function resolveEntityTimeZone(entity: { timezone?: string | null } | null | undefined): string {
  const timeZone = entity?.timezone?.trim();
  return timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_ENTITY_TIME_ZONE;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

const calendarFormatters = new Map<string, Intl.DateTimeFormat>();

function getCalendarFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = calendarFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    calendarFormatters.set(timeZone, formatter);
  }
  return formatter;
}

export function getCalendarDateInTimeZone(instant: Date, timeZone: string): CalendarDate {
  const parts = getCalendarFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

export function formatCalendarDate({ year, month, day }: CalendarDate): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function formatCalendarMonth({ year, month }: CalendarMonth): string {
  return `${year}-${pad(month)}`;
}

export function shiftCalendarMonth({ year, month }: CalendarMonth, months: number): CalendarMonth {
  const index = year * 12 + (month - 1) + months;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

function daysInMonth({ year, month }: CalendarMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getCalendarMonthRange(month: CalendarMonth): CalendarRange {
  return {
    from: formatCalendarDate({ ...month, day: 1 }),
    to: formatCalendarDate({ ...month, day: daysInMonth(month) }),
  };
}

export function getCalendarYearRange(year: number): CalendarRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/** Calendar year from 1 January through the given day, inclusive. */
export function getCalendarYearToDateRange(today: CalendarDate): CalendarRange {
  return { from: `${today.year}-01-01`, to: formatCalendarDate(today) };
}

/** The last `count` calendar months ending with the month of `today`, oldest first. */
export function getRecentCalendarMonths(today: CalendarDate, count: number): CalendarRange & { months: string[] } {
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    months.push(formatCalendarMonth(shiftCalendarMonth(today, -offset)));
  }
  return {
    months,
    from: getCalendarMonthRange(shiftCalendarMonth(today, -(count - 1))).from,
    to: getCalendarMonthRange(today).to,
  };
}

/** Locale label for a `YYYY-MM` key without browser-timezone month rollback. */
export function formatCalendarMonthLabel(
  month: string,
  locale?: string,
  options: Intl.DateTimeFormatOptions = { month: "short" },
): string {
  const [year, monthIndex] = month.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) return month;
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(year, monthIndex - 1, 1)),
  );
}
