const FORMATTER_CACHE_LIMIT = 64;
const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function cachedFormatter<T>(cache: Map<string, T>, key: string, create: () => T): T {
  const existing = cache.get(key);
  if (existing) {
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }
  const formatter = create();
  cache.set(key, formatter);
  if (cache.size > FORMATTER_CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return formatter;
}

function formatterKey(locale: string | undefined, options: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions) {
  return JSON.stringify([locale, Object.entries(options).sort(([a], [b]) => a.localeCompare(b))]);
}

export function getNumberFormatter(locale?: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  return cachedFormatter(numberFormatters, formatterKey(locale, options), () => new Intl.NumberFormat(locale, options));
}

function formatNumber(value: number, locale: string | undefined, options: Intl.NumberFormatOptions): string {
  const formatter = getNumberFormatter(locale, {
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

  return cachedFormatter(
    dateFormatters,
    formatterKey(locale, format),
    () => new Intl.DateTimeFormat(locale, format),
  ).format(dateObj);
}
