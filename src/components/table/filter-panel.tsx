import { CalendarIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/ui/components/ui/button";
import { Calendar } from "@/ui/components/ui/calendar";
import { Label } from "@/ui/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/ui/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";

import type {
  DateFilter,
  FilterConfig,
  FilterState,
  HttpMethodFilter,
  HttpStatusCodeFilter,
  StatusFilter,
} from "./types";

type FilterPanelProps = {
  /** Filter configuration */
  config?: FilterConfig;
  /** Current filter state */
  state?: FilterState;
  /** Change handler */
  onChange?: (state: FilterState | null) => void;
  /** Translation function */
  t?: (key: string) => string;
  /** Locale for date picker */
  locale?: string;
};

const STATUS_OPTIONS: StatusFilter[] = ["paid", "unpaid", "overdue", "voided"];
const HTTP_METHOD_OPTIONS: HttpMethodFilter[] = ["GET", "POST", "PATCH", "PUT", "DELETE"];
const HTTP_STATUS_CODE_OPTIONS: HttpStatusCodeFilter[] = ["2xx", "4xx", "5xx"];

/**
 * Filter panel with date range and status filters
 */
export function FilterPanel({ config, state, onChange, t = (key) => key, locale }: FilterPanelProps) {
  const hasDateFilters = config?.dateFields && config.dateFields.length > 0;
  const hasStatusFilter = config?.statusFilter;
  const hasHttpMethodFilter = config?.httpMethodFilter;
  const hasHttpStatusCodeFilter = config?.httpStatusCodeFilter;

  const handleDateFilterChange = useCallback(
    (dateFilter: DateFilter | undefined) => {
      const newState: FilterState = {
        ...state,
        dateFilter,
      };
      onChange?.(hasActiveFilters(newState) ? newState : null);
    },
    [state, onChange],
  );

  const handleStatusFilterChange = useCallback(
    (statusFilters: StatusFilter[]) => {
      const newState: FilterState = {
        ...state,
        statusFilters: statusFilters.length > 0 ? statusFilters : undefined,
      };
      onChange?.(hasActiveFilters(newState) ? newState : null);
    },
    [state, onChange],
  );

  const handleHttpMethodChange = useCallback(
    (httpMethod: HttpMethodFilter | undefined) => {
      const newState: FilterState = {
        ...state,
        httpMethod,
      };
      onChange?.(hasActiveFilters(newState) ? newState : null);
    },
    [state, onChange],
  );

  const handleHttpStatusCodeChange = useCallback(
    (httpStatusCode: HttpStatusCodeFilter | undefined) => {
      const newState: FilterState = {
        ...state,
        httpStatusCode,
      };
      onChange?.(hasActiveFilters(newState) ? newState : null);
    },
    [state, onChange],
  );

  const handleClearAll = useCallback(() => {
    onChange?.(null);
  }, [onChange]);

  const hasAnyFilters = hasActiveFilters(state);

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        {/* Date Range Section */}
        {hasDateFilters && (
          <DateRangeFilter
            fields={config.dateFields!}
            value={state?.dateFilter}
            onChange={handleDateFilterChange}
            t={t}
            locale={locale}
          />
        )}

        {/* Status Section */}
        {hasStatusFilter && (
          <StatusFilterSection value={state?.statusFilters ?? []} onChange={handleStatusFilterChange} t={t} />
        )}

        {/* HTTP Method Section */}
        {hasHttpMethodFilter && (
          <HttpMethodFilterSection value={state?.httpMethod} onChange={handleHttpMethodChange} t={t} />
        )}

        {/* HTTP Status Code Section */}
        {hasHttpStatusCodeFilter && (
          <HttpStatusCodeFilterSection value={state?.httpStatusCode} onChange={handleHttpStatusCodeChange} t={t} />
        )}

        {/* Clear Button */}
        <div className="flex items-end md:ml-auto">
          <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={!hasAnyFilters} className="gap-1.5">
            <XIcon className="h-3.5 w-3.5" />
            {t("Clear filters")}
          </Button>
        </div>
      </div>
    </div>
  );
}

type DateRangeFilterProps = {
  fields: Array<{ id: string; label: string }>;
  value?: DateFilter;
  onChange: (value: DateFilter | undefined) => void;
  t: (key: string) => string;
  locale?: string;
};

function DateRangeFilter({ fields, value, onChange, t, locale }: DateRangeFilterProps) {
  const selectedField = value?.field ?? fields[0]?.id;

  const handleFieldChange = useCallback(
    (field: string) => {
      onChange({
        field,
        range: value?.range ?? {},
      });
    },
    [onChange, value?.range],
  );

  const handleFromChange = useCallback(
    (date: Date | undefined) => {
      const newRange = { ...value?.range, from: date };
      if (!date && !newRange.to) {
        onChange(undefined);
      } else {
        onChange({
          field: selectedField,
          range: newRange,
        });
      }
    },
    [onChange, selectedField, value?.range],
  );

  const handleToChange = useCallback(
    (date: Date | undefined) => {
      const newRange = { ...value?.range, to: date };
      if (!date && !newRange.from) {
        onChange(undefined);
      } else {
        onChange({
          field: selectedField,
          range: newRange,
        });
      }
    },
    [onChange, selectedField, value?.range],
  );

  return (
    <div className="space-y-3">
      <Label className="font-medium text-muted-foreground text-xs uppercase">{t("Date Range")}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {/* Field selector */}
        <Select value={selectedField} onValueChange={(v) => v && handleFieldChange(v)}>
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* From date */}
        <DatePicker value={value?.range.from} onChange={handleFromChange} placeholder={t("From")} locale={locale} />

        <span className="text-muted-foreground">–</span>

        {/* To date */}
        <DatePicker
          value={value?.range.to}
          onChange={handleToChange}
          placeholder={t("To")}
          locale={locale}
          minDate={value?.range.from}
        />
      </div>
    </div>
  );
}

type DatePickerProps = {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
  locale?: string;
  minDate?: Date;
};

function DatePicker({ value, onChange, placeholder, minDate }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      onChange(date);
      setOpen(false);
    },
    [onChange],
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-[130px] cursor-pointer justify-start gap-2 font-normal">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {value ? formatDate(value) : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={minDate ? { before: minDate } : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}

type StatusFilterSectionProps = {
  value: StatusFilter[];
  onChange: (value: StatusFilter[]) => void;
  t: (key: string) => string;
};

function StatusFilterSection({ value, onChange, t }: StatusFilterSectionProps) {
  const handleChange = useCallback(
    (status: string) => {
      // Empty string means "clear selection"
      if (status === "") {
        onChange([]);
      } else {
        onChange([status as StatusFilter]);
      }
    },
    [onChange],
  );

  const statusLabels: Record<StatusFilter, string> = {
    paid: t("Paid"),
    unpaid: t("Unpaid"),
    overdue: t("Overdue"),
    voided: t("Voided"),
  };

  return (
    <div className="space-y-3">
      <Label className="font-medium text-muted-foreground text-xs uppercase">{t("Status")}</Label>
      <RadioGroup
        value={value[0] ?? ""}
        onValueChange={(v) => handleChange(v as string)}
        className="flex h-8 flex-wrap items-center gap-4"
      >
        {STATUS_OPTIONS.map((status) => (
          <div key={status} className="flex cursor-pointer items-center gap-2">
            <RadioGroupItem value={status} id={`status-${status}`} className="cursor-pointer" />
            <Label htmlFor={`status-${status}`} className="cursor-pointer font-normal text-sm">
              {statusLabels[status]}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

type HttpMethodFilterSectionProps = {
  value?: HttpMethodFilter;
  onChange: (value: HttpMethodFilter | undefined) => void;
  t: (key: string) => string;
};

function HttpMethodFilterSection({ value, onChange, t }: HttpMethodFilterSectionProps) {
  const handleChange = useCallback(
    (method: string) => {
      if (method === "" || method === "all") {
        onChange(undefined);
      } else {
        onChange(method as HttpMethodFilter);
      }
    },
    [onChange],
  );

  return (
    <div className="space-y-3">
      <Label className="font-medium text-muted-foreground text-xs uppercase">{t("Method")}</Label>
      <Select value={value ?? "all"} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="w-[120px]">
          <SelectValue placeholder={t("All")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("All")}</SelectItem>
          {HTTP_METHOD_OPTIONS.map((method) => (
            <SelectItem key={method} value={method} className="font-mono">
              {method}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type HttpStatusCodeFilterSectionProps = {
  value?: HttpStatusCodeFilter;
  onChange: (value: HttpStatusCodeFilter | undefined) => void;
  t: (key: string) => string;
};

function HttpStatusCodeFilterSection({ value, onChange, t }: HttpStatusCodeFilterSectionProps) {
  const handleChange = useCallback(
    (status: string) => {
      if (status === "" || status === "all") {
        onChange(undefined);
      } else {
        onChange(status as HttpStatusCodeFilter);
      }
    },
    [onChange],
  );

  const statusLabels: Record<HttpStatusCodeFilter, string> = {
    "2xx": t("2xx Success"),
    "4xx": t("4xx Client Error"),
    "5xx": t("5xx Server Error"),
  };

  return (
    <div className="space-y-3">
      <Label className="font-medium text-muted-foreground text-xs uppercase">{t("Status")}</Label>
      <Select value={value ?? "all"} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="w-[160px]">
          <SelectValue placeholder={t("All")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("All")}</SelectItem>
          {HTTP_STATUS_CODE_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function hasActiveFilters(state?: FilterState): boolean {
  if (!state) return false;
  if (state.dateFilter?.range.from || state.dateFilter?.range.to) return true;
  if (state.statusFilters?.length) return true;
  if (state.httpMethod) return true;
  if (state.httpStatusCode) return true;
  return false;
}
