export function formatCurrencyValue(amount: number, currencyCode: string, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(amount);
}

export function formatDateValue(
  date: string | number | Date | null | undefined,
  locale?: string,
  format: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  if (!date) {
    return "—";
  }

  const dateObj = new Date(date);
  if (Number.isNaN(dateObj.getTime())) {
    return String(date);
  }

  return new Intl.DateTimeFormat(locale, format).format(dateObj);
}
