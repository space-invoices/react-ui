import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { CURRENCY_CODES } from "@/ui/lib/constants";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useUpdateEntity } from "../entities.hooks";
import { InputWithPreview } from "../entity-settings-form/input-with-preview";
import de from "../entity-settings-form/locales/de";
import sl from "../entity-settings-form/locales/sl";

const translations = { sl, de } as const;

const SUPPORTED_LOCALES = [
  { value: "en-US", label: "English (US)" },
  { value: "de-DE", label: "Deutsch (DE)" },
  { value: "it-IT", label: "Italiano (IT)" },
  { value: "fr-FR", label: "Français (FR)" },
  { value: "es-ES", label: "Español (ES)" },
  { value: "sl-SI", label: "Slovenščina (SI)" },
] as const;

const defaultsSettingsSchema = z.object({
  currency_code: z.union([z.string(), z.null()]).optional(),
  locale: z.union([z.string(), z.null()]).optional(),
  // Invoice defaults
  default_invoice_note: z.union([z.string(), z.null()]).optional(),
  default_invoice_payment_terms: z.union([z.string(), z.null()]).optional(),
  // Estimate defaults
  default_estimate_note: z.union([z.string(), z.null()]).optional(),
  default_estimate_payment_terms: z.union([z.string(), z.null()]).optional(),
  // Credit note defaults
  default_credit_note_note: z.union([z.string(), z.null()]).optional(),
  default_credit_note_payment_terms: z.union([z.string(), z.null()]).optional(),
  // Shared
  document_footer: z.union([z.string(), z.null()]).optional(),
});

type DefaultsSettingsSchema = z.infer<typeof defaultsSettingsSchema>;

type SectionType = "localization" | "documents" | "footer";

export type DefaultsSettingsFormProps = {
  entity: Entity;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
  /** Optional render prop to wrap each section with help content */
  renderSection?: (section: SectionType, content: ReactNode) => ReactNode;
} & ComponentTranslationProps;

export function DefaultsSettingsForm({
  entity,
  t: translateProp,
  namespace,
  locale,
  onSuccess,
  onError,
  renderSection,
}: DefaultsSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translations });

  const currentSettings = (entity.settings as any) || {};

  // Refs for smart code insert buttons - Invoice
  const invoiceNoteRef = useRef<HTMLTextAreaElement>(null);
  const invoicePaymentTermsRef = useRef<HTMLTextAreaElement>(null);
  // Refs for smart code insert buttons - Estimate
  const estimateNoteRef = useRef<HTMLTextAreaElement>(null);
  const estimatePaymentTermsRef = useRef<HTMLTextAreaElement>(null);
  // Refs for smart code insert buttons - Credit Note
  const creditNoteNoteRef = useRef<HTMLTextAreaElement>(null);
  const creditNotePaymentTermsRef = useRef<HTMLTextAreaElement>(null);
  // Ref for document footer (shared)
  const documentFooterRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<DefaultsSettingsSchema>({
    resolver: zodResolver(defaultsSettingsSchema),
    defaultValues: {
      currency_code: entity.currency_code || null,
      locale: entity.locale || "en-US",
      // Invoice
      default_invoice_note: currentSettings.default_invoice_note || null,
      default_invoice_payment_terms: currentSettings.default_invoice_payment_terms || null,
      // Estimate
      default_estimate_note: currentSettings.default_estimate_note || null,
      default_estimate_payment_terms: currentSettings.default_estimate_payment_terms || null,
      // Credit Note
      default_credit_note_note: currentSettings.default_credit_note_note || null,
      default_credit_note_payment_terms: currentSettings.default_credit_note_payment_terms || null,
      // Shared
      document_footer: currentSettings.document_footer || null,
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
    formId: "defaults-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save Settings"),
  });

  const onSubmit = (values: DefaultsSettingsSchema) => {
    const updatePayload: any = {
      settings: {
        ...currentSettings,
        // Invoice
        default_invoice_note: values.default_invoice_note || null,
        default_invoice_payment_terms: values.default_invoice_payment_terms || null,
        // Estimate
        default_estimate_note: values.default_estimate_note || null,
        default_estimate_payment_terms: values.default_estimate_payment_terms || null,
        // Credit Note
        default_credit_note_note: values.default_credit_note_note || null,
        default_credit_note_payment_terms: values.default_credit_note_payment_terms || null,
        // Shared
        document_footer: values.document_footer || null,
      },
    };

    if (values.currency_code && values.currency_code !== entity.currency_code) {
      updatePayload.currency_code = values.currency_code;
    }
    if (values.locale && values.locale !== entity.locale) {
      updatePayload.locale = values.locale;
    }

    updateEntity({ id: entity.id, data: updatePayload });
  };

  // Helper to wrap section content with render prop if provided
  const wrapSection = (section: SectionType, content: ReactNode) => {
    return renderSection ? renderSection(section, content) : content;
  };

  // Localization section content
  const localizationContent = (
    <div className="grid gap-6 md:grid-cols-2">
      <FormField
        control={form.control}
        name="currency_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-medium text-sm">{t("Currency")}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t("Select currency")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {CURRENCY_CODES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
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
        name="locale"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-medium text-sm">{t("Locale")}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t("Select locale")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SUPPORTED_LOCALES.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Documents section content (tabs)
  const documentsContent = (
    <div className="border-t pt-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <p className="font-medium text-muted-foreground text-xs">{t("Document Defaults")}</p>
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
        </TabsList>

        {/* Invoice Tab */}
        <TabsContent value="invoice" className="mt-4 space-y-4">
          <FormField
            control={form.control}
            name="default_invoice_note"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="font-medium text-sm">{t("Default Note")}</FormLabel>
                  <SmartCodeInsertButton
                    textareaRef={invoiceNoteRef}
                    value={field.value || ""}
                    onInsert={(newValue) => field.onChange(newValue)}
                    t={t}
                  />
                </div>
                <FormControl>
                  <InputWithPreview
                    ref={invoiceNoteRef}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={t("Payment due by {document_due_date}. Please reference invoice {document_number}.")}
                    entity={entity}
                    multiline
                    rows={3}
                    className="resize-y"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t("This note will be pre-filled when creating new invoices")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="default_invoice_payment_terms"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="font-medium text-sm">{t("Default Payment Terms")}</FormLabel>
                  <SmartCodeInsertButton
                    textareaRef={invoicePaymentTermsRef}
                    value={field.value || ""}
                    onInsert={(newValue) => field.onChange(newValue)}
                    t={t}
                  />
                </div>
                <FormControl>
                  <InputWithPreview
                    ref={invoicePaymentTermsRef}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={t("Net 30 days. Payment due by {document_due_date}.")}
                    entity={entity}
                    multiline
                    rows={3}
                    className="resize-y"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t("Payment terms pre-filled when creating new invoices")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>

        {/* Estimate Tab */}
        <TabsContent value="estimate" className="mt-4 space-y-4">
          <FormField
            control={form.control}
            name="default_estimate_note"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="font-medium text-sm">{t("Default Note")}</FormLabel>
                  <SmartCodeInsertButton
                    textareaRef={estimateNoteRef}
                    value={field.value || ""}
                    onInsert={(newValue) => field.onChange(newValue)}
                    t={t}
                  />
                </div>
                <FormControl>
                  <InputWithPreview
                    ref={estimateNoteRef}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={t("This estimate is valid until {document_valid_until}.")}
                    entity={entity}
                    multiline
                    rows={3}
                    className="resize-y"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t("This note will be pre-filled when creating new estimates")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="default_estimate_payment_terms"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="font-medium text-sm">{t("Default Payment Terms")}</FormLabel>
                  <SmartCodeInsertButton
                    textareaRef={estimatePaymentTermsRef}
                    value={field.value || ""}
                    onInsert={(newValue) => field.onChange(newValue)}
                    t={t}
                  />
                </div>
                <FormControl>
                  <InputWithPreview
                    ref={estimatePaymentTermsRef}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={t("Payment due upon acceptance.")}
                    entity={entity}
                    multiline
                    rows={3}
                    className="resize-y"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t("Payment terms pre-filled when creating new estimates")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>

        {/* Credit Note Tab */}
        <TabsContent value="credit_note" className="mt-4 space-y-4">
          <FormField
            control={form.control}
            name="default_credit_note_note"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="font-medium text-sm">{t("Default Note")}</FormLabel>
                  <SmartCodeInsertButton
                    textareaRef={creditNoteNoteRef}
                    value={field.value || ""}
                    onInsert={(newValue) => field.onChange(newValue)}
                    t={t}
                  />
                </div>
                <FormControl>
                  <InputWithPreview
                    ref={creditNoteNoteRef}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={t("Credit note for invoice {document_number}.")}
                    entity={entity}
                    multiline
                    rows={3}
                    className="resize-y"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t("This note will be pre-filled when creating new credit notes")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="default_credit_note_payment_terms"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="font-medium text-sm">{t("Default Payment Terms")}</FormLabel>
                  <SmartCodeInsertButton
                    textareaRef={creditNotePaymentTermsRef}
                    value={field.value || ""}
                    onInsert={(newValue) => field.onChange(newValue)}
                    t={t}
                  />
                </div>
                <FormControl>
                  <InputWithPreview
                    ref={creditNotePaymentTermsRef}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={t("Credit will be applied to your account.")}
                    entity={entity}
                    multiline
                    rows={3}
                    className="resize-y"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t("Payment terms pre-filled when creating new credit notes")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  // Footer section content
  const footerContent = (
    <div className="border-t pt-6">
      <FormField
        control={form.control}
        name="document_footer"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="font-medium text-sm">{t("Document Footer")}</FormLabel>
              <SmartCodeInsertButton
                textareaRef={documentFooterRef}
                value={field.value || ""}
                onInsert={(newValue) => field.onChange(newValue)}
                t={t}
              />
            </div>
            <FormControl>
              <InputWithPreview
                ref={documentFooterRef}
                value={field.value || ""}
                onChange={field.onChange}
                placeholder={t("{entity_name} | Due Date: {document_due_date} | Invoice #{document_number}")}
                entity={entity}
                multiline
                rows={2}
                className="resize-y"
              />
            </FormControl>
            <FormDescription className="text-xs">
              {t("Footer text displayed at the bottom of all PDF documents")}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <Form {...form}>
      <form id="defaults-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {wrapSection("localization", localizationContent)}
        {wrapSection("documents", documentsContent)}
        {wrapSection("footer", footerContent)}
      </form>
    </Form>
  );
}
