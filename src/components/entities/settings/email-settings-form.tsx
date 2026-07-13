import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { Mail, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ContentLocaleButton } from "@/ui/components/document-content-translations";
import { SmartCodeInsertButton } from "@/ui/components/documents/create/smart-code-insert-button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import {
  DEFAULT_CONTENT_LOCALE,
  DOCUMENT_CONTENT_TRANSLATIONS_FEATURE,
  type DocumentContentLocaleMode,
  readLocalizedValue,
  writeLocalizedValue,
} from "@/ui/lib/document-content-translations";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useWhiteLabel } from "@/ui/providers/white-label-provider";
import { useUpdateEntity } from "../entities.hooks";
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
import { InputWithPreview } from "./shared/input-with-preview";

const translations = { bg, cs, de, en, es, et, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } as const;

const localizedContentSchema = z.record(z.string(), z.string()).optional();
const emailDefaultTranslationsSchema = z
  .object({
    invoice_subject: localizedContentSchema,
    invoice_body: localizedContentSchema,
    estimate_subject: localizedContentSchema,
    estimate_body: localizedContentSchema,
    credit_note_subject: localizedContentSchema,
    credit_note_body: localizedContentSchema,
    advance_invoice_subject: localizedContentSchema,
    advance_invoice_body: localizedContentSchema,
    delivery_note_subject: localizedContentSchema,
    delivery_note_body: localizedContentSchema,
  })
  .optional();
const paymentReminderTranslationsSchema = z
  .object({
    email_subject: localizedContentSchema,
    email_body: localizedContentSchema,
    payment_instructions: localizedContentSchema,
  })
  .optional();

const emailSettingsSchema = z.object({
  email: z
    .union([z.string(), z.null()])
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Must be a valid email address",
    })
    .optional(),
  invoice_email_subject: z.union([z.string(), z.null()]).optional(),
  invoice_email_body: z.union([z.string(), z.null()]).optional(),
  estimate_email_subject: z.union([z.string(), z.null()]).optional(),
  estimate_email_body: z.union([z.string(), z.null()]).optional(),
  credit_note_email_subject: z.union([z.string(), z.null()]).optional(),
  credit_note_email_body: z.union([z.string(), z.null()]).optional(),
  advance_invoice_email_subject: z.union([z.string(), z.null()]).optional(),
  advance_invoice_email_body: z.union([z.string(), z.null()]).optional(),
  delivery_note_email_subject: z.union([z.string(), z.null()]).optional(),
  delivery_note_email_body: z.union([z.string(), z.null()]).optional(),
  payment_reminder_subject: z.union([z.string(), z.null()]).optional(),
  payment_reminder_body: z.union([z.string(), z.null()]).optional(),
  payment_reminder_payment_instructions: z.union([z.string(), z.null()]).optional(),
  translations: z
    .object({
      email_defaults: emailDefaultTranslationsSchema,
      payment_reminders: paymentReminderTranslationsSchema,
    })
    .optional(),
});

type EmailSettingsSchema = z.infer<typeof emailSettingsSchema>;
type EmailTranslationFieldKey = NonNullable<NonNullable<EmailSettingsSchema["translations"]>["email_defaults"]>;
type PaymentReminderTranslationFieldKey = NonNullable<
  NonNullable<EmailSettingsSchema["translations"]>["payment_reminders"]
>;

const EMAIL_TEMPLATE_TABS = [
  {
    value: "invoice",
    label: "Invoice",
    subjectField: "invoice_email_subject",
    bodyField: "invoice_email_body",
    subjectTranslationKey: "invoice_subject",
    bodyTranslationKey: "invoice_body",
    subjectPlaceholder: "Invoice {document_number} from {entity_name}",
    bodyPlaceholder: "Please find invoice {document_number} attached.\nDue date: {document_due_date}.",
    subjectDescription: "Subject line for invoice emails",
    bodyDescription: "Body content for invoice emails",
  },
  {
    value: "estimate",
    label: "Estimate",
    subjectField: "estimate_email_subject",
    bodyField: "estimate_email_body",
    subjectTranslationKey: "estimate_subject",
    bodyTranslationKey: "estimate_body",
    subjectPlaceholder: "Estimate {document_number} from {entity_name}",
    bodyPlaceholder: "Please find estimate {document_number} attached.\nValid until: {document_valid_until}.",
    subjectDescription: "Subject line for estimate emails",
    bodyDescription: "Body content for estimate emails",
  },
  {
    value: "credit_note",
    label: "Credit Note",
    subjectField: "credit_note_email_subject",
    bodyField: "credit_note_email_body",
    subjectTranslationKey: "credit_note_subject",
    bodyTranslationKey: "credit_note_body",
    subjectPlaceholder: "Credit note {document_number} from {entity_name}",
    bodyPlaceholder: "Please find credit note {document_number} attached.",
    subjectDescription: "Subject line for credit note emails",
    bodyDescription: "Body content for credit note emails",
  },
  {
    value: "advance_invoice",
    label: "Advance Invoice",
    subjectField: "advance_invoice_email_subject",
    bodyField: "advance_invoice_email_body",
    subjectTranslationKey: "advance_invoice_subject",
    bodyTranslationKey: "advance_invoice_body",
    subjectPlaceholder: "Advance invoice {document_number} from {entity_name}",
    bodyPlaceholder: "Please find advance invoice {document_number} attached.",
    subjectDescription: "Subject line for advance invoice emails",
    bodyDescription: "Body content for advance invoice emails",
  },
  {
    value: "delivery_note",
    label: "Delivery Note",
    subjectField: "delivery_note_email_subject",
    bodyField: "delivery_note_email_body",
    subjectTranslationKey: "delivery_note_subject",
    bodyTranslationKey: "delivery_note_body",
    subjectPlaceholder: "Delivery note {document_number} from {entity_name}",
    bodyPlaceholder: "Please find delivery note {document_number} attached.",
    subjectDescription: "Subject line for delivery note emails",
    bodyDescription: "Body content for delivery note emails",
  },
] as const;

type EmailTemplateTab = (typeof EMAIL_TEMPLATE_TABS)[number];

export type EmailSettingsFormProps = {
  entity: Entity;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
} & ComponentTranslationProps;

export function EmailSettingsForm({
  entity,
  t: translateProp,
  namespace,
  locale,
  translationLocale,
  onSuccess,
  onError,
}: EmailSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });
  const whiteLabel = useWhiteLabel();
  const translationsFeatureEnabled = whiteLabel.isFeatureVisible(DOCUMENT_CONTENT_TRANSLATIONS_FEATURE);
  const defaultContentLocale = entity.locale || "en-US";
  const [contentLocale, setContentLocale] = useState<DocumentContentLocaleMode>(DEFAULT_CONTENT_LOCALE);

  const currentSettings = (entity.settings as Record<string, any>) || {};
  const currentTranslations = (currentSettings.translations as Record<string, any> | undefined) ?? {};

  const invoiceEmailSubjectRef = useRef<HTMLInputElement>(null);
  const invoiceEmailBodyRef = useRef<HTMLTextAreaElement>(null);
  const estimateEmailSubjectRef = useRef<HTMLInputElement>(null);
  const estimateEmailBodyRef = useRef<HTMLTextAreaElement>(null);
  const creditNoteEmailSubjectRef = useRef<HTMLInputElement>(null);
  const creditNoteEmailBodyRef = useRef<HTMLTextAreaElement>(null);
  const advanceInvoiceEmailSubjectRef = useRef<HTMLInputElement>(null);
  const advanceInvoiceEmailBodyRef = useRef<HTMLTextAreaElement>(null);
  const deliveryNoteEmailSubjectRef = useRef<HTMLInputElement>(null);
  const deliveryNoteEmailBodyRef = useRef<HTMLTextAreaElement>(null);
  const paymentReminderSubjectRef = useRef<HTMLInputElement>(null);
  const paymentReminderBodyRef = useRef<HTMLTextAreaElement>(null);
  const paymentReminderPaymentInstructionsRef = useRef<HTMLTextAreaElement>(null);

  const subjectRefs = {
    invoice_email_subject: invoiceEmailSubjectRef,
    estimate_email_subject: estimateEmailSubjectRef,
    credit_note_email_subject: creditNoteEmailSubjectRef,
    advance_invoice_email_subject: advanceInvoiceEmailSubjectRef,
    delivery_note_email_subject: deliveryNoteEmailSubjectRef,
  } as const;

  const bodyRefs = {
    invoice_email_body: invoiceEmailBodyRef,
    estimate_email_body: estimateEmailBodyRef,
    credit_note_email_body: creditNoteEmailBodyRef,
    advance_invoice_email_body: advanceInvoiceEmailBodyRef,
    delivery_note_email_body: deliveryNoteEmailBodyRef,
  } as const;

  const form = useForm<EmailSettingsSchema>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      email: currentSettings.email || null,
      invoice_email_subject: currentSettings.email_defaults?.invoice_subject || null,
      invoice_email_body: currentSettings.email_defaults?.invoice_body || null,
      estimate_email_subject: currentSettings.email_defaults?.estimate_subject || null,
      estimate_email_body: currentSettings.email_defaults?.estimate_body || null,
      credit_note_email_subject: currentSettings.email_defaults?.credit_note_subject || null,
      credit_note_email_body: currentSettings.email_defaults?.credit_note_body || null,
      advance_invoice_email_subject: currentSettings.email_defaults?.advance_invoice_subject || null,
      advance_invoice_email_body: currentSettings.email_defaults?.advance_invoice_body || null,
      delivery_note_email_subject: currentSettings.email_defaults?.delivery_note_subject || null,
      delivery_note_email_body: currentSettings.email_defaults?.delivery_note_body || null,
      payment_reminder_subject:
        currentSettings.payment_reminders?.email_subject ||
        currentSettings.overdue_notifications?.email_subject ||
        null,
      payment_reminder_body:
        currentSettings.payment_reminders?.email_body || currentSettings.overdue_notifications?.email_body || null,
      payment_reminder_payment_instructions: currentSettings.payment_reminders?.payment_instructions || null,
      translations: {
        email_defaults: currentTranslations.email_defaults ?? {},
        payment_reminders: currentTranslations.payment_reminders ?? {},
      },
    },
  });

  const watchedTranslations = useWatch({ control: form.control, name: "translations" });
  const emailDefaultTranslations = (watchedTranslations?.email_defaults ?? {}) as Record<
    keyof EmailTranslationFieldKey,
    Record<string, string> | undefined
  >;
  const paymentReminderTranslations = (watchedTranslations?.payment_reminders ?? {}) as Record<
    keyof PaymentReminderTranslationFieldKey,
    Record<string, string> | undefined
  >;

  const { mutate: updateEntity, isPending } = useUpdateEntity({
    entityId: entity.id,
    onSuccess: (data) => {
      form.reset(form.getValues());
      onSuccess?.(data);
    },
    onError,
  });

  useFormFooterRegistration({
    formId: "email-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save Settings"),
  });

  const setLocalizedEmailDefault = (translationKey: keyof EmailTranslationFieldKey, nextValue: string) => {
    if (contentLocale === DEFAULT_CONTENT_LOCALE) {
      return;
    }

    const nextEmailDefaults = {
      ...(form.getValues("translations")?.email_defaults ?? {}),
      [translationKey]: writeLocalizedValue(emailDefaultTranslations[translationKey], contentLocale, nextValue),
    };

    form.setValue(
      "translations",
      {
        ...(form.getValues("translations") ?? {}),
        email_defaults: nextEmailDefaults,
      },
      { shouldDirty: true, shouldTouch: true },
    );
  };

  const setLocalizedPaymentReminderDefault = (
    translationKey: keyof PaymentReminderTranslationFieldKey,
    nextValue: string,
  ) => {
    if (contentLocale === DEFAULT_CONTENT_LOCALE) {
      return;
    }

    const nextPaymentReminders = {
      ...(form.getValues("translations")?.payment_reminders ?? {}),
      [translationKey]: writeLocalizedValue(paymentReminderTranslations[translationKey], contentLocale, nextValue),
    };

    form.setValue(
      "translations",
      {
        ...(form.getValues("translations") ?? {}),
        payment_reminders: nextPaymentReminders,
      },
      { shouldDirty: true, shouldTouch: true },
    );
  };

  const onSubmit = (values: EmailSettingsSchema) => {
    updateEntity({
      id: entity.id,
      data: {
        // Send only keys this surface owns — see useUpdateEntity's settings contract
        settings: {
          // null clears the sender email on the server (undefined would be
          // dropped from the JSON body and the old value would be kept)
          email: values.email || null,
          email_defaults: {
            invoice_subject: values.invoice_email_subject || undefined,
            invoice_body: values.invoice_email_body || undefined,
            estimate_subject: values.estimate_email_subject || undefined,
            estimate_body: values.estimate_email_body || undefined,
            credit_note_subject: values.credit_note_email_subject || undefined,
            credit_note_body: values.credit_note_email_body || undefined,
            advance_invoice_subject: values.advance_invoice_email_subject || undefined,
            advance_invoice_body: values.advance_invoice_email_body || undefined,
            delivery_note_subject: values.delivery_note_email_subject || undefined,
            delivery_note_body: values.delivery_note_email_body || undefined,
          },
          payment_reminders: {
            email_subject: values.payment_reminder_subject || undefined,
            email_body: values.payment_reminder_body || undefined,
            payment_instructions: values.payment_reminder_payment_instructions || undefined,
          },
          // Only this form's namespaces; the server merges translations per
          // namespace, preserving other forms' entries
          translations: {
            email_defaults: values.translations?.email_defaults ?? currentTranslations.email_defaults ?? {},
            payment_reminders: values.translations?.payment_reminders ?? currentTranslations.payment_reminders ?? {},
          } as any,
        } as any,
      },
    });
  };

  const renderSubjectField = (tab: EmailTemplateTab) => (
    <FormField
      control={form.control}
      name={tab.subjectField}
      render={({ field }) => {
        const visibleValue = readLocalizedValue(
          field.value,
          emailDefaultTranslations[tab.subjectTranslationKey],
          contentLocale,
        );

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="font-medium text-sm">{t("Email Subject")}</FormLabel>
              <SmartCodeInsertButton
                textareaRef={subjectRefs[tab.subjectField] as React.RefObject<HTMLTextAreaElement | null>}
                value={visibleValue || ""}
                onInsert={(newValue) => {
                  if (!translationsFeatureEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
                    field.onChange(newValue);
                    return;
                  }

                  setLocalizedEmailDefault(tab.subjectTranslationKey, newValue);
                }}
                t={t}
              />
            </div>
            <FormControl>
              <InputWithPreview
                ref={subjectRefs[tab.subjectField]}
                value={visibleValue || ""}
                onChange={(nextValue) => {
                  if (!translationsFeatureEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
                    field.onChange(nextValue);
                    return;
                  }

                  setLocalizedEmailDefault(tab.subjectTranslationKey, nextValue);
                }}
                placeholder={tab.subjectPlaceholder}
                entity={entity}
                translatePreviewLabel={t}
                className="h-10"
              />
            </FormControl>
            <FormDescription className="text-xs">{t(tab.subjectDescription)}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  const renderBodyField = (tab: EmailTemplateTab) => (
    <FormField
      control={form.control}
      name={tab.bodyField}
      render={({ field }) => {
        const visibleValue = readLocalizedValue(
          field.value,
          emailDefaultTranslations[tab.bodyTranslationKey],
          contentLocale,
        );

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="font-medium text-sm">{t("Email Body")}</FormLabel>
              <SmartCodeInsertButton
                textareaRef={bodyRefs[tab.bodyField]}
                value={visibleValue || ""}
                onInsert={(newValue) => {
                  if (!translationsFeatureEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
                    field.onChange(newValue);
                    return;
                  }

                  setLocalizedEmailDefault(tab.bodyTranslationKey, newValue);
                }}
                t={t}
              />
            </div>
            <FormControl>
              <InputWithPreview
                ref={bodyRefs[tab.bodyField]}
                value={visibleValue || ""}
                onChange={(nextValue) => {
                  if (!translationsFeatureEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
                    field.onChange(nextValue);
                    return;
                  }

                  setLocalizedEmailDefault(tab.bodyTranslationKey, nextValue);
                }}
                placeholder={tab.bodyPlaceholder}
                entity={entity}
                translatePreviewLabel={t}
                multiline
                className="min-h-[200px] resize-none"
                rows={8}
              />
            </FormControl>
            <FormDescription className="text-xs">{t(tab.bodyDescription)}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  const renderPaymentReminderField = ({
    name,
    translationKey,
    inputRef,
    label,
    description,
    placeholder,
    multiline = false,
    rows,
  }: {
    name: "payment_reminder_subject" | "payment_reminder_body" | "payment_reminder_payment_instructions";
    translationKey: keyof PaymentReminderTranslationFieldKey;
    inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
    label: string;
    description: string;
    placeholder: string;
    multiline?: boolean;
    rows?: number;
  }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const visibleValue = readLocalizedValue(
          field.value,
          paymentReminderTranslations[translationKey],
          contentLocale,
        );

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="font-medium text-sm">{t(label)}</FormLabel>
              <SmartCodeInsertButton
                textareaRef={inputRef as React.RefObject<HTMLTextAreaElement | null>}
                value={visibleValue || ""}
                onInsert={(newValue) => {
                  if (!translationsFeatureEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
                    field.onChange(newValue);
                    return;
                  }

                  setLocalizedPaymentReminderDefault(translationKey, newValue);
                }}
                t={t}
              />
            </div>
            <FormControl>
              <InputWithPreview
                ref={inputRef}
                value={visibleValue || ""}
                onChange={(nextValue) => {
                  if (!translationsFeatureEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
                    field.onChange(nextValue);
                    return;
                  }

                  setLocalizedPaymentReminderDefault(translationKey, nextValue);
                }}
                placeholder={t(placeholder)}
                entity={entity}
                translatePreviewLabel={t}
                multiline={multiline}
                className={multiline ? "min-h-[160px] resize-none" : "h-10"}
                rows={rows}
              />
            </FormControl>
            <FormDescription className="text-xs">{t(description)}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  return (
    <Form {...form}>
      <form id="email-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium text-sm">{t("Email Address")}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="invoices@example.com"
                    className="h-10 pl-10"
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs">{t("Email address to send invoices to")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium text-muted-foreground text-xs">Default Email Templates</p>
            </div>
            {translationsFeatureEnabled && (
              <ContentLocaleButton
                activeLocale={contentLocale}
                defaultLocale={defaultContentLocale}
                onChange={setContentLocale}
                uiLocale={translationLocale ?? locale}
                t={t}
              />
            )}
          </div>

          <Tabs defaultValue="invoice" className="w-full">
            <TabsList className="w-full">
              {EMAIL_TEMPLATE_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="cursor-pointer">
                  {t(tab.label)}
                </TabsTrigger>
              ))}
            </TabsList>

            {EMAIL_TEMPLATE_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-4">
                {renderSubjectField(tab)}
                {renderBodyField(tab)}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="border-t pt-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium text-muted-foreground text-xs">{t("Payment reminders")}</p>
          </div>

          <div className="space-y-4">
            {renderPaymentReminderField({
              name: "payment_reminder_subject",
              translationKey: "email_subject",
              inputRef: paymentReminderSubjectRef,
              label: "Reminder subject",
              description: "Subject line for payment reminder emails",
              placeholder: "Payment reminder from {entity_name}",
            })}
            {renderPaymentReminderField({
              name: "payment_reminder_body",
              translationKey: "email_body",
              inputRef: paymentReminderBodyRef,
              label: "Reminder body",
              description: "Body content for payment reminder emails",
              placeholder:
                "Hello {customer_name},\n\nThe following invoices are overdue:\n{invoice_list}\n\n{payment_instructions}",
              multiline: true,
              rows: 8,
            })}
            {renderPaymentReminderField({
              name: "payment_reminder_payment_instructions",
              translationKey: "payment_instructions",
              inputRef: paymentReminderPaymentInstructionsRef,
              label: "Payment instructions",
              description: "Payment instructions appended to reminder emails when not included in the body",
              placeholder: "Please remit payment to IBAN {iban}.",
              multiline: true,
              rows: 5,
            })}
          </div>
        </div>
      </form>
    </Form>
  );
}
