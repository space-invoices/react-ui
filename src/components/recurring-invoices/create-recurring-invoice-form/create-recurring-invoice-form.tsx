import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateRecurringInvoiceBody, RecurringInvoice, UpdateRecurringInvoiceBody } from "@spaceinvoices/js-sdk";
import { CalendarIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/ui/components/ui/button";
import { Calendar } from "@/ui/components/ui/calendar";
import { Checkbox } from "@/ui/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import type { CreateRecurringInvoiceSchema } from "@/ui/generated/schemas/recurringinvoice";
import { createRecurringInvoiceSchema } from "@/ui/generated/schemas/recurringinvoice";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";

import { useCreateRecurringInvoice, useUpdateRecurringInvoice } from "../recurring-invoices.hooks";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import et from "./locales/et";
import fi from "./locales/fi";
import fr from "./locales/fr";
import hr from "./locales/hr";
import is from "./locales/is";
import it from "./locales/it";
import nb from "./locales/nb";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sk from "./locales/sk";
import sl from "./locales/sl";
import sv from "./locales/sv";

const translations = {
  en,
  sl,
  bg,
  cs,
  de,
  es,
  et,
  fi,
  fr,
  hr,
  is,
  it,
  nb,
  nl,
  pl,
  pt,
  sk,
  sv,
} as const;

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const MONTH_LABELS: Record<number, string> = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type CreateRecurringInvoiceFormProps = {
  entityId: string;
  documentId: string;
  recurringInvoice?: RecurringInvoice | null;
  onSuccess?: (recurringInvoice: RecurringInvoice) => void;
  onError?: (error: Error) => void;
  allowDrafts?: boolean;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
} & ComponentTranslationProps;

export default function CreateRecurringInvoiceForm({
  entityId,
  documentId,
  recurringInvoice,
  onSuccess,
  onError,
  allowDrafts = true,
  renderSubmitButton,
  ...i18nProps
}: CreateRecurringInvoiceFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });
  const formatDisplayDate = (value?: string) =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString(i18nProps.locale) : undefined;

  const defaultValues = useMemo<CreateRecurringInvoiceSchema>(
    () => ({
      document_id: documentId,
      name: recurringInvoice?.name ?? "",
      frequency: recurringInvoice?.frequency ?? "monthly",
      interval: recurringInvoice?.interval ?? 1,
      day_of_week: recurringInvoice?.day_of_week ?? null,
      day_of_month: recurringInvoice?.day_of_month ?? null,
      month_of_year: recurringInvoice?.month_of_year ?? null,
      start_date: recurringInvoice?.start_date ?? formatDateToYMD(new Date()),
      end_date: recurringInvoice?.end_date ?? undefined,
      auto_send: recurringInvoice?.auto_send ?? false,
      create_as_draft: recurringInvoice?.create_as_draft ?? false,
    }),
    [documentId, recurringInvoice],
  );

  const form = useForm<CreateRecurringInvoiceSchema>({
    resolver: zodResolver(createRecurringInvoiceSchema),
    defaultValues,
  });

  const frequency = useWatch({ control: form.control, name: "frequency" });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const { mutate: createRecurringInvoice, isPending } = useCreateRecurringInvoice({
    entityId,
    onSuccess: (recurringInvoice, _variables, _context) => {
      onSuccess?.(recurringInvoice);
      form.reset();
    },
    onError: (error, _variables, _context) => {
      form.setError("root", {
        type: "submit",
        message: t("There was an error creating the schedule"),
      });
      onError?.(error);
    },
  });

  const { mutate: updateRecurringInvoice, isPending: isUpdating } = useUpdateRecurringInvoice({
    entityId,
    onSuccess: (updatedRecurringInvoice, _variables, _context) => {
      onSuccess?.(updatedRecurringInvoice);
    },
    onError: (error, _variables, _context) => {
      form.setError("root", {
        type: "submit",
        message: t("There was an error creating the schedule"),
      });
      onError?.(error);
    },
  });

  const buildSubmitPayload = (values: CreateRecurringInvoiceSchema) => {
    const payload: CreateRecurringInvoiceBody = {
      document_id: documentId,
      name: values.name,
      frequency: values.frequency,
      interval: values.interval,
      start_date: values.start_date,
      end_date: values.end_date,
      auto_send: values.auto_send,
      create_as_draft: values.create_as_draft,
      day_of_week: values.frequency === "weekly" ? values.day_of_week : null,
      day_of_month: values.frequency === "monthly" || values.frequency === "yearly" ? values.day_of_month : null,
      month_of_year: values.frequency === "yearly" ? values.month_of_year : null,
    };

    return payload;
  };

  const onSubmit = async (values: CreateRecurringInvoiceSchema) => {
    const payload = buildSubmitPayload(values);

    if (recurringInvoice) {
      const { document_id, ...updateData } = payload;
      updateRecurringInvoice({
        id: recurringInvoice.id,
        data: {
          ...updateData,
          end_date: updateData.end_date ?? null,
        } satisfies UpdateRecurringInvoiceBody,
      });
      return;
    }

    createRecurringInvoice(payload);
  };

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("Name")}
                <span className="ml-1 text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t("Enter schedule name")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("Frequency")}
                  <span className="ml-1 text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select frequency")}>
                        {field.value && t(FREQUENCY_LABELS[field.value])}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {t(label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Interval")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="1"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {frequency === "weekly" && (
          <FormField
            control={form.control}
            name="day_of_week"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Day of Week")}</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value != null ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select day")}>
                        {field.value != null && t(DAY_OF_WEEK_LABELS[field.value])}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {t(label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {(frequency === "monthly" || frequency === "yearly") && (
          <FormField
            control={form.control}
            name="day_of_month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Day of Month")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {frequency === "yearly" && (
          <FormField
            control={form.control}
            name="month_of_year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Month")}</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value != null ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select month")}>
                        {field.value != null && t(MONTH_LABELS[field.value])}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(MONTH_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {t(label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("Start Date")}
                <span className="ml-1 text-red-500">*</span>
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? formatDisplayDate(field.value) : <span>{t("Pick a date")}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(`${field.value}T00:00:00`) : undefined}
                    onSelect={(date) => field.onChange(date ? formatDateToYMD(date) : undefined)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("End Date")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? formatDisplayDate(field.value) : <span>{t("No end date")}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(`${field.value}T00:00:00`) : undefined}
                    onSelect={(date) => field.onChange(date ? formatDateToYMD(date) : undefined)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="auto_send"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{t("Auto-send")}</FormLabel>
                <FormDescription>{t("Automatically email generated invoices")}</FormDescription>
              </div>
            </FormItem>
          )}
        />

        {allowDrafts ? (
          <FormField
            control={form.control}
            name="create_as_draft"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t("Create as draft")}</FormLabel>
                  <FormDescription>{t("Generated invoices will be drafts for review")}</FormDescription>
                </div>
              </FormItem>
            )}
          />
        ) : null}

        {renderSubmitButton?.({
          isSubmitting: isPending || isUpdating || form.formState.isSubmitting,
          submit: handleSubmitClick,
        })}
      </form>
    </Form>
  );
}
