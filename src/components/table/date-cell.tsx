import { formatDateOnlyForDisplay } from "@/ui/lib/date-only";

type FormattedDateProps = {
  date: string | number | Date | null | undefined;
  format?: Intl.DateTimeFormatOptions;
  locale?: string;
  /**
   * Treat the value as a business calendar date (an API `date` column) rather
   * than an instant. Besides the bare `YYYY-MM-DD` form, this also accepts the
   * midnight-UTC form the API emits for such columns (`YYYY-MM-DDT00:00:00.000Z`)
   * and renders the same calendar day in every browser time zone. Leave it off
   * for real timestamps (`created_at`, `ordered_at`), which keep local-time
   * rendering even when they happen to fall exactly on UTC midnight.
   */
  calendar?: boolean;
};

// A bare `YYYY-MM-DD` can only describe a calendar day. `new Date("2026-07-03")`
// is UTC midnight, which is still July 2 west of UTC, so it must never be
// formatted through local time.
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// The midnight-UTC form is ambiguous on its own (a real timestamp can land on it),
// so it is only treated as a calendar date when the consumer says so.
const UTC_MIDNIGHT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/;

function isCalendarDateString(value: FormattedDateProps["date"], calendar: boolean): value is string {
  if (typeof value !== "string") return false;
  return DATE_ONLY_PATTERN.test(value) || (calendar && UTC_MIDNIGHT_DATE_PATTERN.test(value));
}

/**
 * Formatted date cell component
 */
export function FormattedDate({
  date,
  format = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
  locale,
  calendar = false,
}: FormattedDateProps) {
  if (!date) {
    return <span className="text-muted-foreground">—</span>;
  }

  try {
    const dateObj = new Date(date);

    // Check if date is valid
    if (Number.isNaN(dateObj.getTime())) {
      console.error("Invalid date:", date);
      return <span className="text-destructive">{String(date)}</span>;
    }

    if (isCalendarDateString(date, calendar)) {
      return <>{formatDateOnlyForDisplay(date, locale, format)}</>;
    }

    return <>{dateObj.toLocaleDateString(locale, format)}</>;
  } catch (error) {
    console.error("Error formatting date:", error);
    return <span className="text-destructive">{String(date)}</span>;
  }
}
