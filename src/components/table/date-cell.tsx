type FormattedDateProps = {
  date: string | number | Date | null | undefined;
  format?: Intl.DateTimeFormatOptions;
};

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

    return <>{dateObj.toLocaleDateString(undefined, format)}</>;
  } catch (error) {
    console.error("Error formatting date:", error);
    return <span className="text-destructive">{String(date)}</span>;
  }
}
