import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { Mail, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useUpdateEntity } from "../entities.hooks";
import { InputWithPreview } from "../entity-settings-form/input-with-preview";
import de from "../entity-settings-form/locales/de";
import sl from "../entity-settings-form/locales/sl";

const translations = { sl, de } as const;

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
});

type EmailSettingsSchema = z.infer<typeof emailSettingsSchema>;

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

  const currentSettings = (entity.settings as any) || {};

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
    },
  });

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

  const onSubmit = (values: EmailSettingsSchema) => {
    updateEntity({
      id: entity.id,
      data: {
        settings: {
          ...currentSettings,
          email: values.email || undefined,
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
        },
      },
    });
  };

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
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium text-muted-foreground text-xs">Default Email Templates</p>
          </div>

          <Tabs defaultValue="invoice" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="invoice" className="cursor-pointer">
                {t("Invoice")}
              </TabsTrigger>
              <TabsTrigger value="estimate" className="cursor-pointer">
                {t("Estimate")}
              </TabsTrigger>
              <TabsTrigger value="credit_note" className="cursor-pointer">
                {t("Credit Note")}
              </TabsTrigger>
              <TabsTrigger value="advance_invoice" className="cursor-pointer">
                {t("Advance Invoice")}
              </TabsTrigger>
              <TabsTrigger value="delivery_note" className="cursor-pointer">
                {t("Delivery Note")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoice" className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="invoice_email_subject"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Subject")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={invoiceEmailSubjectRef as React.RefObject<HTMLTextAreaElement | null>}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={invoiceEmailSubjectRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Invoice {document_number} from {entity_name}"
                        entity={entity}
                        translatePreviewLabel={t}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t("Subject line for invoice emails")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_email_body"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Body")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={invoiceEmailBodyRef}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={invoiceEmailBodyRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder={"Please find invoice {document_number} attached.\nDue date: {document_due_date}."}
                        entity={entity}
                        translatePreviewLabel={t}
                        multiline
                        className="min-h-[200px] resize-none"
                        rows={8}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t("Body content for invoice emails")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="estimate" className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="estimate_email_subject"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Subject")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={estimateEmailSubjectRef as React.RefObject<HTMLTextAreaElement | null>}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={estimateEmailSubjectRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Estimate {document_number} from {entity_name}"
                        entity={entity}
                        translatePreviewLabel={t}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t("Subject line for estimate emails")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimate_email_body"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Body")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={estimateEmailBodyRef}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={estimateEmailBodyRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder={
                          "Please find estimate {document_number} attached.\nValid until: {document_valid_until}."
                        }
                        entity={entity}
                        translatePreviewLabel={t}
                        multiline
                        className="min-h-[200px] resize-none"
                        rows={8}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t("Body content for estimate emails")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="credit_note" className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="credit_note_email_subject"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Subject")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={creditNoteEmailSubjectRef as React.RefObject<HTMLTextAreaElement | null>}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={creditNoteEmailSubjectRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Credit note {document_number} from {entity_name}"
                        entity={entity}
                        translatePreviewLabel={t}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t("Subject line for credit note emails")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credit_note_email_body"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Body")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={creditNoteEmailBodyRef}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={creditNoteEmailBodyRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Please find credit note {document_number} attached."
                        entity={entity}
                        translatePreviewLabel={t}
                        multiline
                        className="min-h-[200px] resize-none"
                        rows={8}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t("Body content for credit note emails")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="advance_invoice" className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="advance_invoice_email_subject"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Subject")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={advanceInvoiceEmailSubjectRef as React.RefObject<HTMLTextAreaElement | null>}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={advanceInvoiceEmailSubjectRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Advance invoice {document_number} from {entity_name}"
                        entity={entity}
                        translatePreviewLabel={t}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t("Subject line for advance invoice emails")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="advance_invoice_email_body"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Body")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={advanceInvoiceEmailBodyRef}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={advanceInvoiceEmailBodyRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Please find advance invoice {document_number} attached."
                        entity={entity}
                        translatePreviewLabel={t}
                        multiline
                        className="min-h-[200px] resize-none"
                        rows={8}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t("Body content for advance invoice emails")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="delivery_note" className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="delivery_note_email_subject"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Subject")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={deliveryNoteEmailSubjectRef as React.RefObject<HTMLTextAreaElement | null>}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={deliveryNoteEmailSubjectRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Delivery note {document_number} from {entity_name}"
                        entity={entity}
                        translatePreviewLabel={t}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t("Subject line for delivery note emails")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_note_email_body"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{t("Email Body")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={deliveryNoteEmailBodyRef}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={t}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={deliveryNoteEmailBodyRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Please find delivery note {document_number} attached."
                        entity={entity}
                        translatePreviewLabel={t}
                        multiline
                        className="min-h-[200px] resize-none"
                        rows={8}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t("Body content for delivery note emails")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </Form>
  );
}
