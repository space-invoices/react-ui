import { zodResolver } from "@hookform/resolvers/zod";
import { type Invoice, invoices, paymentReminders } from "@spaceinvoices/js-sdk";
import { AlertCircle, Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { InputWithPreview } from "@/ui/components/entities/settings/shared/input-with-preview";
import { Alert, AlertDescription } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Spinner } from "@/ui/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { Textarea } from "@/ui/components/ui/textarea";
import { sendPaymentReminderSchema } from "@/ui/generated/schemas/paymentreminder";
import { normalizeDateOnlyInput, toLocalDateOnlyString } from "@/ui/lib/date-only";
import { DEFAULT_CONTENT_LOCALE, type DocumentContentLocaleMode } from "@/ui/lib/document-content-translations";
import { getDisplayDocumentNumber } from "@/ui/lib/document-display";
import { getFullLocale } from "@/ui/lib/locale";
import { replaceTemplateVariablesForMarkdownPreview } from "@/ui/lib/template-variables";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { getSendEmailErrorMessage, isEmailVerificationRequiredError } from "../send-email-dialog/error-utils";
import translations from "./payment-reminder-translations";

const LOCALE_OPTIONS = [
  "en-US",
  "de-DE",
  "it-IT",
  "fr-FR",
  "es-ES",
  "sl-SI",
  "pt-PT",
  "nl-NL",
  "pl-PL",
  "hr-HR",
  "sv-SE",
  "fi-FI",
  "et-EE",
  "bg-BG",
  "cs-CZ",
  "sk-SK",
  "nb-NO",
  "is-IS",
] as const;

const DEFAULT_LANGUAGE_VALUE = DEFAULT_CONTENT_LOCALE;
const EMPTY_SETTINGS: Record<string, any> = {};
const EMPTY_REMINDER_DEFAULTS: Record<string, any> = {};
const EMPTY_REMINDER_TRANSLATIONS: Record<string, any> = {};
const MAX_INLINE_PREVIEW_INVOICES = 8;

type ReminderDraft = {
  subject: string;
  introText: string;
  paymentInstructions: string;
  closingText: string;
};

type SendPaymentReminderDialogProps = {
  invoice?: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onEmailVerificationRequired?: () => void | Promise<void>;
} & ComponentTranslationProps;

function capitalizeFirstLabelCharacter(value: string, locale: string): string {
  if (!value) return value;

  const [firstCharacter, ...rest] = Array.from(value);
  return `${firstCharacter.toLocaleUpperCase(locale)}${rest.join("")}`;
}

function getLocalizedLocaleLabel(localeCode: string, displayLocale: string): string {
  const resolvedDisplayLocale = getFullLocale(displayLocale);
  const [languageCode, regionCode] = localeCode.split("-");
  const languageNames = new Intl.DisplayNames([resolvedDisplayLocale], { type: "language" });
  const regionNames = new Intl.DisplayNames([resolvedDisplayLocale], { type: "region" });

  const languageLabel = capitalizeFirstLabelCharacter(
    languageNames.of(languageCode) ?? localeCode,
    resolvedDisplayLocale,
  );
  if (!regionCode) return languageLabel;

  const regionLabel = regionNames.of(regionCode) ?? regionCode;
  return `${languageLabel} (${regionLabel})`;
}

function getDefaultBankAccount(entitySettings: Record<string, any>) {
  const accounts = entitySettings.bank_accounts ?? [];
  return accounts.find((account: any) => account?.is_default) ?? accounts[0] ?? null;
}

function applyBankPlaceholders(template: string, entitySettings: Record<string, any>): string {
  const account = getDefaultBankAccount(entitySettings);
  if (!template || !account) return template;

  return template
    .replace(/\{iban\}/g, account.iban || "")
    .replace(/\{bic\}/g, account.bic || "")
    .replace(/\{bank_name\}/g, account.bank_name || "")
    .replace(/\{account_number\}/g, account.account_number || "")
    .replace(/\{routing_number\}/g, account.routing_number || "")
    .replace(/\{sort_code\}/g, account.sort_code || "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined, locale: string): string {
  return new Intl.NumberFormat(getFullLocale(locale), {
    style: "currency",
    currency: currency || "EUR",
  }).format(Number(value ?? 0));
}

function formatAmountWithCurrencyCode(value: number, currency: string | null | undefined, locale: string): string {
  return `${new Intl.NumberFormat(getFullLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ${currency || "EUR"}`;
}

function formatGroupedInvoiceTotals(invoicesToTotal: Invoice[], locale: string): string {
  const totalsByCurrency = new Map<string, number>();

  for (const row of invoicesToTotal) {
    const currency = row.currency_code || "EUR";
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + Number(row.total_due ?? 0));
  }

  return Array.from(totalsByCurrency.entries())
    .map(([currency, total]) => formatAmountWithCurrencyCode(total, currency, locale))
    .join(", ");
}

function isOverdueUnpaidInvoice(invoice: Invoice): boolean {
  if (!invoice.date_due || invoice.paid_in_full || invoice.voided_at || Number(invoice.total_due ?? 0) <= 0) {
    return false;
  }

  const dateDue = normalizeDateOnlyInput(String(invoice.date_due));
  if (!dateDue) return false;

  return dateDue < toLocalDateOnlyString(new Date());
}

function buildInvoiceListPreview(invoicesToPreview: Invoice[], translate: (key: string) => string, locale: string) {
  if (invoicesToPreview.length === 0) {
    return "";
  }

  const visibleInvoices = invoicesToPreview.slice(0, MAX_INLINE_PREVIEW_INVOICES);
  const rows = visibleInvoices.map((row) => {
    const number = getDisplayDocumentNumber(row, translate, "");
    const dueDate = row.date_due ? String(row.date_due).slice(0, 10) : "";
    const amount = formatCurrency(row.total_due, row.currency_code, locale);
    return dueDate ? `${number} · ${dueDate} · ${amount}` : `${number} · ${amount}`;
  });

  const remainingCount = invoicesToPreview.length - visibleInvoices.length;
  if (remainingCount > 0) {
    rows.push(`+${remainingCount} ${translate("overdue")}`);
  }

  return rows.join("\n");
}

function cleanReminderSegment(value: string): string {
  return value
    .replace(/{payment_instructions}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitReminderBodyTemplate(body: string): Pick<ReminderDraft, "introText" | "closingText"> {
  const [intro = body, ...rest] = body.split("{invoice_list}");

  return {
    introText: cleanReminderSegment(intro),
    closingText: cleanReminderSegment(rest.join("{invoice_list}")),
  };
}

function composeReminderBodyTemplate({
  introText,
  paymentInstructions,
  closingText,
}: Pick<ReminderDraft, "introText" | "paymentInstructions" | "closingText">): string {
  return [
    introText.trim(),
    "{invoice_list}",
    paymentInstructions.trim() ? "{payment_instructions}" : "",
    closingText.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function SendPaymentReminderDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
  onEmailVerificationRequired,
  locale = "en",
  t: translateProp,
  namespace,
  translationLocale,
}: SendPaymentReminderDialogProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });
  const { activeEntity } = useEntities();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceLoadError, setInvoiceLoadError] = useState(false);
  const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([]);
  const [language, setLanguage] = useState<DocumentContentLocaleMode>(DEFAULT_LANGUAGE_VALUE);
  const [drafts, setDrafts] = useState<Record<string, ReminderDraft>>({});

  const entitySettings = (activeEntity?.settings as Record<string, any>) || EMPTY_SETTINGS;
  const entityLocale = (activeEntity as any)?.locale || "en-US";
  const customerName = invoice?.customer?.name || t("Customer");
  const customerId = invoice?.customer_id || "";
  const reminderDefaults = entitySettings.payment_reminders || EMPTY_REMINDER_DEFAULTS;
  const legacyReminderDefaults = entitySettings.overdue_notifications || EMPTY_REMINDER_DEFAULTS;
  const reminderTranslations = entitySettings.translations?.payment_reminders || EMPTY_REMINDER_TRANSLATIONS;

  const baseSubject = reminderDefaults.email_subject || legacyReminderDefaults.email_subject || t("Payment reminder");
  const baseBody =
    reminderDefaults.email_body ||
    legacyReminderDefaults.email_body ||
    t("Hello {customer_name},\n\nThe following invoices are overdue:\n{invoice_list}");
  const basePaymentInstructions =
    reminderDefaults.payment_instructions || entitySettings.default_invoice_payment_terms || "";

  const resolveDraftForLanguage = useCallback(
    (nextLanguage: DocumentContentLocaleMode): ReminderDraft => {
      if (nextLanguage === DEFAULT_LANGUAGE_VALUE) {
        const bodySegments = splitReminderBodyTemplate(baseBody);

        return {
          subject: baseSubject,
          ...bodySegments,
          paymentInstructions: applyBankPlaceholders(basePaymentInstructions, entitySettings),
        };
      }

      const bodySegments = splitReminderBodyTemplate(reminderTranslations.email_body?.[nextLanguage] || baseBody);

      return {
        subject: reminderTranslations.email_subject?.[nextLanguage] || baseSubject,
        ...bodySegments,
        paymentInstructions: applyBankPlaceholders(
          reminderTranslations.payment_instructions?.[nextLanguage] || basePaymentInstructions,
          entitySettings,
        ),
      };
    },
    [baseSubject, baseBody, basePaymentInstructions, entitySettings, reminderTranslations],
  );

  const formSchema = useMemo(
    () =>
      sendPaymentReminderSchema.extend({
        subject: z.string().trim().min(1, t("Subject is required")).max(255),
        body_text: z.string().trim().min(1, t("Message is required")),
        payment_instructions: z.string().optional(),
        closing_text: z.string().optional(),
        recipient_email: z.string().trim().email(t("Invalid email address")),
      }),
    [t],
  );

  type FormSchema = z.infer<typeof formSchema>;

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema) as Resolver<FormSchema>,
    defaultValues: {
      customer_id: customerId,
      recipient_email: invoice?.customer?.email || "",
      subject: baseSubject,
      body_text: splitReminderBodyTemplate(baseBody).introText,
      payment_instructions: applyBankPlaceholders(basePaymentInstructions, entitySettings),
      closing_text: splitReminderBodyTemplate(baseBody).closingText,
    },
  });
  const subjectValue = useWatch({ control: form.control, name: "subject" });
  const introTextValue = useWatch({ control: form.control, name: "body_text" });
  const paymentInstructionsValue = useWatch({ control: form.control, name: "payment_instructions" });
  const closingTextValue = useWatch({ control: form.control, name: "closing_text" });

  const displayLocale = translationLocale || locale;
  const entityLocaleLabel = getLocalizedLocaleLabel(entityLocale, displayLocale);
  const defaultLanguageLabel = `${t("Default")} (${entityLocaleLabel})`;
  const selectedLanguageLabel =
    language === DEFAULT_LANGUAGE_VALUE ? defaultLanguageLabel : getLocalizedLocaleLabel(language, displayLocale);
  const reminderFormatLocale = language === DEFAULT_LANGUAGE_VALUE ? entityLocale : language;

  const totalOverdue = overdueInvoices.reduce((sum, item) => sum + Number(item.total_due ?? 0), 0);
  const totalOverdueLabel = formatGroupedInvoiceTotals(overdueInvoices, reminderFormatLocale);
  const firstCurrency = overdueInvoices[0]?.currency_code || invoice?.currency_code || "EUR";
  const reminderPreviewDocument = useMemo(
    () => ({
      ...invoice,
      total_due: totalOverdue,
      currency_code: firstCurrency,
      total_amount: totalOverdueLabel,
      invoice_list: buildInvoiceListPreview(overdueInvoices, t, reminderFormatLocale),
      payment_instructions: paymentInstructionsValue || "",
      overdue_count: overdueInvoices.length,
    }),
    [
      invoice,
      totalOverdue,
      firstCurrency,
      totalOverdueLabel,
      overdueInvoices,
      t,
      reminderFormatLocale,
      paymentInstructionsValue,
    ],
  );
  const previewEntity = activeEntity ?? ({} as any);
  const subjectPreview = replaceTemplateVariablesForMarkdownPreview(
    subjectValue || "",
    previewEntity,
    reminderPreviewDocument,
    t,
  ).trim();
  const introPreview = replaceTemplateVariablesForMarkdownPreview(
    introTextValue || "",
    previewEntity,
    reminderPreviewDocument,
    t,
  ).trim();
  const paymentInstructionsPreview = replaceTemplateVariablesForMarkdownPreview(
    paymentInstructionsValue || "",
    previewEntity,
    reminderPreviewDocument,
    t,
  ).trim();
  const closingPreview = replaceTemplateVariablesForMarkdownPreview(
    closingTextValue || "",
    previewEntity,
    reminderPreviewDocument,
    t,
  ).trim();

  useEffect(() => {
    if (!open || !invoice || !customerId || !activeEntity?.id) {
      return;
    }

    const initialDraft = resolveDraftForLanguage(DEFAULT_LANGUAGE_VALUE);
    form.reset({
      customer_id: customerId,
      recipient_email: invoice.customer?.email || "",
      subject: initialDraft.subject,
      body_text: initialDraft.introText,
      payment_instructions: initialDraft.paymentInstructions,
      closing_text: initialDraft.closingText,
    });
    setLanguage(DEFAULT_LANGUAGE_VALUE);
    setDrafts({ [DEFAULT_LANGUAGE_VALUE]: initialDraft });

    let cancelled = false;
    const loadOverdueInvoices = async () => {
      setIsLoadingInvoices(true);
      setInvoiceLoadError(false);
      try {
        const today = toLocalDateOnlyString(new Date());
        const response = await invoices.list({
          entity_id: activeEntity.id,
          limit: 100,
          order_by: "date_due",
          query: JSON.stringify({
            customer_id: customerId,
            paid_in_full: { equals: false },
            total_due: { gt: 0 },
            voided_at: { equals: null },
            date_due: { lt: today },
          }),
        });

        if (!cancelled) {
          const rows = response.data.filter((row) => isOverdueUnpaidInvoice(row));
          setOverdueInvoices(rows.length > 0 ? rows : isOverdueUnpaidInvoice(invoice) ? [invoice] : []);
        }
      } catch {
        if (!cancelled) {
          setOverdueInvoices(isOverdueUnpaidInvoice(invoice) ? [invoice] : []);
          setInvoiceLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingInvoices(false);
        }
      }
    };

    loadOverdueInvoices();

    return () => {
      cancelled = true;
    };
  }, [open, invoice, customerId, activeEntity?.id, form, resolveDraftForLanguage]);

  const syncDraftField = (field: keyof ReminderDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [language]: {
        ...(prev[language] ?? resolveDraftForLanguage(language)),
        [field]: value,
      },
    }));
  };

  const handleLanguageChange = (value: string | null) => {
    const nextLanguage = (value ?? DEFAULT_LANGUAGE_VALUE) as DocumentContentLocaleMode;
    const nextDrafts = {
      ...drafts,
      [language]: {
        subject: form.getValues("subject") || "",
        introText: form.getValues("body_text") || "",
        paymentInstructions: form.getValues("payment_instructions") || "",
        closingText: form.getValues("closing_text") || "",
      },
    };
    const nextDraft = nextDrafts[nextLanguage] ?? resolveDraftForLanguage(nextLanguage);

    setDrafts(nextDrafts);
    setLanguage(nextLanguage);
    form.setValue("subject", nextDraft.subject, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
    form.setValue("body_text", nextDraft.introText, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
    form.setValue("payment_instructions", nextDraft.paymentInstructions, {
      shouldValidate: false,
      shouldDirty: false,
      shouldTouch: false,
    });
    form.setValue("closing_text", nextDraft.closingText, {
      shouldValidate: false,
      shouldDirty: false,
      shouldTouch: false,
    });
  };

  if (!invoice || !customerId) {
    return null;
  }

  const onSubmit = async (values: FormSchema) => {
    if (!activeEntity?.id) throw new Error("Entity context required");

    setIsLoading(true);
    try {
      const languageOverride = language !== DEFAULT_LANGUAGE_VALUE ? language : undefined;
      const response = await paymentReminders.sendPaymentReminder(
        {
          customer_id: customerId,
          recipient_email: values.recipient_email,
          subject: values.subject,
          body_text: composeReminderBodyTemplate({
            introText: values.body_text,
            paymentInstructions: values.payment_instructions ?? "",
            closingText: values.closing_text ?? "",
          }),
          payment_instructions: values.payment_instructions ?? "",
          language: languageOverride,
          sandbox_skip_delivery: false,
        },
        { entity_id: activeEntity.id },
      );

      toast.success(t("Payment reminder sent"), {
        description: `${response.overdue_invoice_count} ${t("overdue invoices sent to")} ${response.to}`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const requiresEmailVerification = isEmailVerificationRequiredError(error);
      const errorMessage = getSendEmailErrorMessage(error, t);

      toast.error(requiresEmailVerification ? t("Email verification required") : t("Failed to send payment reminder"), {
        description: errorMessage,
        duration: requiresEmailVerification && onEmailVerificationRequired ? 10000 : 5000,
        action:
          requiresEmailVerification && onEmailVerificationRequired
            ? {
                label: t("Resend verification email"),
                onClick: () => {
                  void Promise.resolve(onEmailVerificationRequired()).catch(() => undefined);
                },
              }
            : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t("Send payment reminder")}
          </DialogTitle>
          <DialogDescription>
            {t("Send one reminder for all overdue unpaid invoices for")} {customerName}.
          </DialogDescription>
        </DialogHeader>

        {activeEntity?.environment === "sandbox" && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {t("Sandbox email warning")}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-lg border bg-muted/20 px-3 py-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="recipient_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Recipient email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="customer@example.com"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>{t("Reminder language")}</FormLabel>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger id="payment-reminder-language" className="w-full">
                      <SelectValue>{selectedLanguageLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_LANGUAGE_VALUE}>{defaultLanguageLabel}</SelectItem>
                      {LOCALE_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {getLocalizedLocaleLabel(value, displayLocale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 text-muted-foreground text-sm">
                {isLoadingInvoices
                  ? t("Loading overdue invoices...")
                  : `${overdueInvoices.length} ${t("overdue")} · ${
                      totalOverdueLabel || formatCurrency(totalOverdue, firstCurrency, reminderFormatLocale)
                    }`}
              </div>
              {invoiceLoadError && (
                <p className="mt-2 text-amber-700 text-xs dark:text-amber-300">
                  {t("Could not load the full overdue invoice preview. Please try again.")}
                </p>
              )}
            </div>

            <Tabs defaultValue="compose" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="compose">{t("Compose")}</TabsTrigger>
                <TabsTrigger value="preview">{t("Preview")}</TabsTrigger>
              </TabsList>

              <TabsContent value="compose" className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Subject")}</FormLabel>
                      <FormControl>
                        <InputWithPreview
                          value={field.value || ""}
                          onChange={(nextValue) => {
                            field.onChange(nextValue);
                            syncDraftField("subject", nextValue);
                          }}
                          placeholder={t("Payment reminder")}
                          entity={activeEntity!}
                          document={reminderPreviewDocument}
                          translatePreviewLabel={t}
                          disabled={isLoading}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Intro message")}</FormLabel>
                      <FormControl>
                        <Textarea
                          value={field.value || ""}
                          onChange={(event) => {
                            field.onChange(event.target.value);
                            syncDraftField("introText", event.target.value);
                          }}
                          onBlur={field.onBlur}
                          placeholder={t("Email message placeholder")}
                          disabled={isLoading}
                          rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg border bg-muted/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-sm">{t("Overdue invoices")}</p>
                    <p className="text-muted-foreground text-xs">{t("Added automatically")}</p>
                  </div>
                  <div className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-md border bg-background px-3 py-2 text-sm">
                    {reminderPreviewDocument.invoice_list || t("No overdue invoices")}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="payment_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Payment instructions")}</FormLabel>
                      <FormControl>
                        <Textarea
                          value={field.value || ""}
                          onChange={(event) => {
                            field.onChange(event.target.value);
                            syncDraftField("paymentInstructions", event.target.value);
                          }}
                          onBlur={field.onBlur}
                          placeholder={t("Payment instructions")}
                          disabled={isLoading}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="closing_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Closing")}</FormLabel>
                      <FormControl>
                        <Textarea
                          value={field.value || ""}
                          onChange={(event) => {
                            field.onChange(event.target.value);
                            syncDraftField("closingText", event.target.value);
                          }}
                          onBlur={field.onBlur}
                          placeholder={t("Best regards,")}
                          disabled={isLoading}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="max-h-[52vh] overflow-auto rounded-lg border bg-background">
                  <div className="border-b px-4 py-3">
                    <p className="text-muted-foreground text-xs">{t("Subject")}</p>
                    <p className="font-medium">{subjectPreview || t("Payment reminder")}</p>
                  </div>
                  <div className="space-y-4 px-4 py-4 text-sm">
                    {introPreview && <div className="whitespace-pre-wrap">{introPreview}</div>}

                    <div className="overflow-auto rounded-md border">
                      <table className="w-full min-w-[520px] border-collapse text-sm">
                        <thead className="bg-muted/60 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">{t("Invoice")}</th>
                            <th className="px-3 py-2 text-left font-medium">{t("Due date")}</th>
                            <th className="px-3 py-2 text-right font-medium">{t("Amount due")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overdueInvoices.length > 0 ? (
                            overdueInvoices.map((row) => (
                              <tr key={row.id} className="border-t">
                                <td className="px-3 py-2 font-medium">{getDisplayDocumentNumber(row, t, "")}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {row.date_due ? String(row.date_due).slice(0, 10) : ""}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {formatCurrency(row.total_due, row.currency_code, reminderFormatLocale)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                                {t("No overdue invoices")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {paymentInstructionsPreview && (
                      <div className="whitespace-pre-wrap rounded-md border bg-muted/20 px-3 py-2">
                        {paymentInstructionsPreview}
                      </div>
                    )}
                    {closingPreview && <div className="whitespace-pre-wrap">{closingPreview}</div>}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t("Cancel")}
              </Button>
              <Button
                type="submit"
                className="min-w-[120px] cursor-pointer"
                disabled={isLoading || isLoadingInvoices || overdueInvoices.length === 0}
              >
                {isLoading ? <Spinner /> : t("Send reminder")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
