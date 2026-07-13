import { type FocusEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Input } from "../components/ui/input";

export function getLocaleNumberSeparators(locale: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.8);

  return {
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
    group: parts.find((part) => part.type === "group")?.value,
  };
}

/** A group separator is only plausible when every group after the first has exactly 3 digits ("1,234", "12,345,678"). */
function looksLikeGrouping(value: string, group: string) {
  const segments = value.split(group);
  return segments.length > 1 && segments.slice(1).every((segment) => /^\d{3}$/.test(segment));
}

/**
 * Parse a user-typed numeric string using the locale's decimal/group separators.
 * A lone group separator that can't be grouping (e.g. "12,5" in an en locale \u2014
 * common when EU users type decimal commas on the English UI) is treated as the
 * decimal separator instead of being silently stripped into a 10\u00D7 amount.
 * Returns a number when parseable, the raw string otherwise (so validation can
 * flag it instead of silently zeroing the value), and "" for empty input.
 */
export function parseNumericFormValue(rawValue: string, locale: string) {
  const trimmedValue = rawValue.trim();
  if (trimmedValue === "") return "";

  const { decimal, group } = getLocaleNumberSeparators(locale);
  const compactValue = trimmedValue.replace(/[\s\u00A0\u202F]/g, "");
  const hasDecimal = compactValue.includes(decimal);
  const groupCount = group ? compactValue.split(group).length - 1 : 0;
  let normalizedValue: string;
  if (!!group && groupCount === 1 && !hasDecimal && group !== decimal && !looksLikeGrouping(compactValue, group)) {
    // "12,5" in en / "12.5" in sl \u2014 a single separator that can't be grouping is a decimal point.
    normalizedValue = compactValue.replace(group, ".");
  } else {
    const shouldStripGroup = !!group && (group !== "." || hasDecimal);
    normalizedValue = (shouldStripGroup ? compactValue.replaceAll(group, "") : compactValue).replace(decimal, ".");
  }
  const parsed = Number(normalizedValue);
  return Number.isNaN(parsed) ? rawValue : parsed;
}

export function formatNumericDisplayValue(value: unknown, locale: string) {
  if (value == null || value === "") return "";
  if (typeof value !== "number" || Number.isNaN(value)) return String(value);

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 20,
  }).format(value);
}

export type NumericInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: unknown;
  onValueChange: (value: string | number) => void;
  inputLocale: string;
};

/**
 * Locale-aware masked numeric input: displays grouped/localized numbers while
 * blurred, keeps the raw typing buffer while focused, and emits parsed numbers
 * (or the raw string when unparseable) through `onValueChange`.
 * Cmd/Ctrl+Backspace clears the field.
 */
export function NumericInput({
  value,
  onValueChange,
  inputLocale,
  onBlur,
  onFocus,
  onKeyDown,
  ...props
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState(formatNumericDisplayValue(value, inputLocale));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (isFocusedRef.current) return;
    setDisplayValue(formatNumericDisplayValue(value, inputLocale));
  }, [inputLocale, value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setDisplayValue(nextValue);
    onValueChange(parseNumericFormValue(nextValue, inputLocale));
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    const parsed = parseNumericFormValue(displayValue, inputLocale);
    if (typeof parsed === "number") {
      setDisplayValue(formatNumericDisplayValue(parsed, inputLocale));
    }
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setDisplayValue("");
      onValueChange("");
      return;
    }

    onKeyDown?.(event);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
