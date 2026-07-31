function formatNumber(value: number, locale: string | undefined, options: Intl.NumberFormatOptions): string {
  const formatter = new Intl.NumberFormat(locale, {
    ...options,
    trailingZeroDisplay: options.trailingZeroDisplay ?? "stripIfInteger",
  });

  const isNegative = value < 0 || Object.is(value, -0);
  if (isNegative && formatter.format(Math.abs(value)) === formatter.format(0)) {
    return formatter.format(0);
  }

  return formatter.format(value);
}

export function formatDecimalValue(value: number, locale?: string, options: Intl.NumberFormatOptions = {}): string {
  const minimumFractionDigits = options.minimumFractionDigits ?? Math.min(2, options.maximumFractionDigits ?? 2);
  const maximumFractionDigits = options.maximumFractionDigits ?? Math.max(2, minimumFractionDigits);

  return formatNumber(value, locale, {
    ...options,
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

export function formatCurrencyValue(
  amount: number,
  currencyCode: string,
  locale?: string,
  options: Intl.NumberFormatOptions = {},
): string {
  return formatNumber(amount, locale, {
    ...options,
    style: "currency",
    currency: currencyCode || "USD",
  });
}

export function formatCurrencyCents(cents: number, currencyCode: string, locale?: string): string {
  return formatCurrencyValue(cents / 100, currencyCode, locale);
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
