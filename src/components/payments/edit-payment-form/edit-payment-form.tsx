import { zodResolver } from "@hookform/resolvers/zod";
import type { Payment } from "@spaceinvoices/js-sdk";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/ui/components/ui/button";
import { Calendar } from "@/ui/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Textarea } from "@/ui/components/ui/textarea";
import { type UpdatePaymentSchema, updatePaymentSchema } from "@/ui/generated/schemas/payment";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { cn } from "@/ui/lib/utils";

import { useUpdatePayment } from "../payments.hooks";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";

const translations = {
  sl,
  de,
  it,
  fr,
  es,
  pt,
  nl,
  pl,
  hr,
} as const;

// Labels for payment types (used for translations)
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  check: "Check",
  credit_note: "Credit Note",
  advance: "Advance",
  other: "Other",
};

// Form schema extends update schema with required fields for editing
const editFormSchema = updatePaymentSchema.required({
  amount: true,
  type: true,
  date: true,
});
type EditFormSchema = z.infer<typeof editFormSchema>;

type EditPaymentFormProps = {
  entityId: string;
  payment: Payment;
  onSuccess?: (payment: Payment) => void;
  onError?: (error: Error) => void;
  renderSubmitButton?: (props: { isSubmitting: boolean; submit: () => void }) => React.ReactNode;
} & ComponentTranslationProps;

export default function EditPaymentForm({
  entityId,
  payment,
  onSuccess,
  onError,
  renderSubmitButton,
  ...i18nProps
}: EditPaymentFormProps) {
  const t = createTranslation({
    ...i18nProps,
    translations,
  });

  // SDK converts date strings to Date objects, so we need to convert back to string
  const dateString =
    (payment.date as unknown) instanceof Date ? (payment.date as unknown as Date).toISOString() : String(payment.date);

  const form = useForm<EditFormSchema>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      amount: payment.amount,
      type: payment.type as UpdatePaymentSchema["type"],
      date: dateString,
      reference: payment.reference ?? "",
      note: payment.note ?? "",
    },
  });

  const { mutate: updatePayment, isPending } = useUpdatePayment({
    entityId,
    onSuccess: (updatedPayment, _variables, _context) => {
      onSuccess?.(updatedPayment);
    },
    onError: (error, _variables, _context) => {
      form.setError("root", {
        type: "submit",
        message: t("There was an error updating the payment"),
      });
      onError?.(error);
    },
  });

  const onSubmit = async (values: EditFormSchema) => {
    updatePayment({
      id: payment.id,
      data: values,
    });
  };

  const handleSubmitClick = () => {
    form.handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("Amount")}
                <span className="ml-1 text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t("Enter amount")}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("Payment Type")}
                <span className="ml-1 text-red-500">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select payment type")}>
                      {field.value && t(PAYMENT_TYPE_LABELS[field.value])}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
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
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Payment Date")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? new Date(field.value).toLocaleDateString() : <span>{t("Pick a date")}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date?.toISOString())}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Reference")}</FormLabel>
              <FormControl>
                <Input placeholder={t("Enter reference number")} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Note")}</FormLabel>
              <FormControl>
                <Textarea placeholder={t("Enter payment notes")} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {renderSubmitButton?.({
          isSubmitting: isPending || form.formState.isSubmitting,
          submit: handleSubmitClick,
        })}
      </form>
    </Form>
  );
}
