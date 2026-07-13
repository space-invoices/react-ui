import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ContentLocaleButton } from "@/ui/components/document-content-translations";
import { MarkdownTextareaToolbar } from "@/ui/components/documents/create/markdown-textarea-toolbar";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { CURRENCY_CODES } from "@/ui/lib/constants";
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

const SUPPORTED_LOCALES = [
  { value: "en-US", label: "English (US)" },
  { value: "de-DE", label: "German (DE)" },
  { value: "it-IT", label: "Italian (IT)" },
  { value: "fr-FR", label: "French (FR)" },
  { value: "es-ES", label: "Spanish (ES)" },
  { value: "sl-SI", label: "Slovenian (SI)" },
] as const;

const localizedContentSchema = z.record(z.string(), z.string()).optional();
const defaultsSettingsTranslationsSchema = z
  .object({
    default_invoice_note: localizedContentSchema,
    default_invoice_payment_terms: localizedContentSchema,
    default_estimate_note: localizedContentSchema,
    default_estimate_payment_terms: localizedContentSchema,
    default_credit_note_note: localizedContentSchema,
    default_credit_note_payment_terms: localizedContentSchema,
    default_advance_invoice_note: localizedContentSchema,
    default_delivery_note_note: localizedContentSchema,
    document_footer: localizedContentSchema,
    default_document_signature: localizedContentSchema,
  })
  .optional();

const defaultsSettingsSchema = z.object({
  currency_code: z.union([z.string(), z.null()]).optional(),
  locale: z.union([z.string(), z.null()]).optional(),
  // Invoice defaults
  default_invoice_due_days: z.union([z.number().int().positive(), z.null()]).optional(),
  default_invoice_note: z.union([z.string(), z.null()]).optional(),
  default_invoice_payment_terms: z.union([z.string(), z.null()]).optional(),
  // Estimate defaults
  default_estimate_valid_days: z.union([z.number().int().positive(), z.null()]).optional(),
  default_estimate_note: z.union([z.string(), z.null()]).optional(),
  default_estimate_payment_terms: z.union([z.string(), z.null()]).optional(),
  // Credit note defaults
  default_credit_note_note: z.union([z.string(), z.null()]).optional(),
  default_credit_note_payment_terms: z.union([z.string(), z.null()]).optional(),
  // Advance invoice defaults
  default_advance_invoice_note: z.union([z.string(), z.null()]).optional(),
  // Delivery note defaults
  default_delivery_note_note: z.union([z.string(), z.null()]).optional(),
  // Shared
  document_footer: z.union([z.string(), z.null()]).optional(),
  default_document_signature: z.union([z.string(), z.null()]).optional(),
  translations: defaultsSettingsTranslationsSchema,
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
  translationLocale,
  onSuccess,
  onError,
  renderSection,
}: DefaultsSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });
  const whiteLabel = useWhiteLabel();
  const translationsFeatureEnabled = whiteLabel.isFeatureVisible(DOCUMENT_CONTENT_TRANSLATIONS_FEATURE);
  const [contentLocale, setContentLocale] = useState<DocumentContentLocaleMode>(DEFAULT_CONTENT_LOCALE);

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
  // Refs for smart code insert buttons - Advance Invoice
  const advanceInvoiceNoteRef = useRef<HTMLTextAreaElement>(null);
  // Refs for smart code insert buttons - Delivery Note
  const deliveryNoteNoteRef = useRef<HTMLTextAreaElement>(null);
  // Ref for document footer (shared)
  const documentFooterRef = useRef<HTMLTextAreaElement>(null);
  // Ref for document signature (shared)
  const documentSignatureRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<DefaultsSettingsSchema>({
    resolver: zodResolver(defaultsSettingsSchema),
    defaultValues: {
      currency_code: entity.currency_code || null,
      locale: entity.locale || "en-US",
      // Invoice
      default_invoice_due_days: currentSettings.default_invoice_due_days ?? null,
      default_invoice_note: currentSettings.default_invoice_note || null,
      default_invoice_payment_terms: currentSettings.default_invoice_payment_terms || null,
      // Estimate
      default_estimate_valid_days: currentSettings.default_estimate_valid_days ?? null,
      default_estimate_note: currentSettings.default_estimate_note || null,
      default_estimate_payment_terms: currentSettings.default_estimate_payment_terms || null,
      // Credit Note
      default_credit_note_note: currentSettings.default_credit_note_note || null,
      default_credit_note_payment_terms: currentSettings.default_credit_note_payment_terms || null,
      // Advance Invoice
      default_advance_invoice_note: currentSettings.default_advance_invoice_note || null,
      // Delivery Note
      default_delivery_note_note: currentSettings.default_delivery_note_note || null,
      // Shared
      document_footer: currentSettings.document_footer || null,
      default_document_signature: currentSettings.default_document_signature || null,
      translations: currentSettings.translations || {},
    },
  });
  const settingsTranslations = useWatch({ control: form.control, name: "translations" as any }) as
    | Record<string, Record<string, string> | undefined>
    | undefined;
  const defaultContentLocale = useWatch({ control: form.control, name: "locale" }) ?? entity.locale ?? "en-US";

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
      // Send only keys this surface owns — see useUpdateEntity's settings contract
      settings: {
        // Invoice
        default_invoice_due_days: values.default_invoice_due_days ?? null,
        default_invoice_note: values.default_invoice_note || null,
        default_invoice_payment_terms: values.default_invoice_payment_terms || null,
        // Estimate
        default_estimate_valid_days: values.default_estimate_valid_days ?? null,
        default_estimate_note: values.default_estimate_note || null,
        default_estimate_payment_terms: values.default_estimate_payment_terms || null,
        // Credit Note
        default_credit_note_note: values.default_credit_note_note || null,
        default_credit_note_payment_terms: values.default_credit_note_payment_terms || null,
        // Advance Invoice
        default_advance_invoice_note: values.default_advance_invoice_note || null,
        // Delivery Note
        default_delivery_note_note: values.default_delivery_note_note || null,
        // Shared
        document_footer: values.document_footer || null,
        default_document_signature: values.default_document_signature || null,
        // Only this form's namespaces (schema strips the rest); the server
        // merges translations per namespace, preserving other forms' entries
        translations: values.translations ?? {},
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

  const renderLocalizedTextareaField = ({
    name,
    label,
    description,
    placeholder,
    textareaRef,
    rows,
    className,
  }: {
    name: keyof DefaultsSettingsSchema & string;
    label: string;
    description: string;
    placeholder: string;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    rows: number;
    className?: string;
  }) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => {
        const fieldTranslations = settingsTranslations?.[name];
        const value =
          translationsFeatureEnabled && contentLocale !== DEFAULT_CONTENT_LOCALE
            ? readLocalizedValue(field.value || "", fieldTranslations, contentLocale)
            : (field.value ?? "");
        const updateValue = (nextValue: string) => {
          if (!translationsFeatureEnabled || contentLocale === DEFAULT_CONTENT_LOCALE) {
            field.onChange(nextValue);
            return;
          }

          form.setValue(
            "translations",
            {
              ...(form.getValues("translations") ?? {}),
              [name]: writeLocalizedValue(fieldTranslations, contentLocale, nextValue),
            } as any,
            { shouldDirty: true, shouldTouch: true, shouldValidate: false },
          );
        };

        return (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="font-medium text-sm">{label}</FormLabel>
              <div className="flex items-center gap-1">
                <MarkdownTextareaToolbar textareaRef={textareaRef} value={value} onChange={updateValue} t={t} />
                <SmartCodeInsertButton textareaRef={textareaRef} value={value} onInsert={updateValue} t={t} />
                {translationsFeatureEnabled ? (
                  <ContentLocaleButton
                    activeLocale={contentLocale}
                    defaultLocale={defaultContentLocale}
                    onChange={setContentLocale}
                    uiLocale={translationLocale ?? locale}
                    t={t}
                  />
                ) : null}
              </div>
            </div>
            <FormControl>
              <InputWithPreview
                ref={textareaRef}
                value={value}
                onChange={updateValue}
                placeholder={placeholder}
                entity={entity}
                translatePreviewLabel={t}
                markdownPreview
                multiline
                rows={rows}
                className={className}
              />
            </FormControl>
            <FormDescription className="text-xs">{description}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  const renderDayCountField = ({
    name,
    label,
    description,
  }: {
    name: "default_invoice_due_days" | "default_estimate_valid_days";
    label: string;
    description: string;
  }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-medium text-sm">{label}</FormLabel>
          <FormControl>
            <Input
              className="w-24 max-w-full"
              type="number"
              min={1}
              step={1}
              value={typeof field.value === "number" ? field.value : ""}
              onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : null)}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
          <FormDescription className="text-xs">{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

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
                    {t(loc.label)}
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
          <TabsTrigger value="advance_invoice" className="cursor-pointer">
            {t("Advance Invoice")}
          </TabsTrigger>
          <TabsTrigger value="delivery_note" className="cursor-pointer">
            {t("Delivery Note")}
          </TabsTrigger>
        </TabsList>

        {/* Invoice Tab */}
        <TabsContent value="invoice" className="mt-4 space-y-4">
          {renderDayCountField({
            name: "default_invoice_due_days",
            label: t("Default due days"),
            description: t("Number of days added to the document date for new invoice due dates"),
          })}

          {renderLocalizedTextareaField({
            name: "default_invoice_note",
            label: t("Default Note"),
            description: t("This note will be pre-filled when creating new invoices"),
            placeholder: t("Optional note for the document."),
            textareaRef: invoiceNoteRef,
            rows: 3,
            className: "resize-y",
          })}

          {renderLocalizedTextareaField({
            name: "default_invoice_payment_terms",
            label: t("Default Payment Terms"),
            description: t("Payment terms pre-filled when creating new invoices"),
            placeholder: t("Please remit payment using the bank details shown on the document."),
            textareaRef: invoicePaymentTermsRef,
            rows: 3,
            className: "resize-y",
          })}
        </TabsContent>

        {/* Estimate Tab */}
        <TabsContent value="estimate" className="mt-4 space-y-4">
          {renderDayCountField({
            name: "default_estimate_valid_days",
            label: t("Default valid days"),
            description: t("Number of days added to the document date for new estimate valid-till dates"),
          })}

          {renderLocalizedTextareaField({
            name: "default_estimate_note",
            label: t("Default Note"),
            description: t("This note will be pre-filled when creating new estimates"),
            placeholder: t("This estimate is valid until {document_valid_until}."),
            textareaRef: estimateNoteRef,
            rows: 3,
            className: "resize-y",
          })}

          {renderLocalizedTextareaField({
            name: "default_estimate_payment_terms",
            label: t("Default Payment Terms"),
            description: t("Payment terms pre-filled when creating new estimates"),
            placeholder: t("Payment due upon acceptance."),
            textareaRef: estimatePaymentTermsRef,
            rows: 3,
            className: "resize-y",
          })}
        </TabsContent>

        {/* Credit Note Tab */}
        <TabsContent value="credit_note" className="mt-4 space-y-4">
          {renderLocalizedTextareaField({
            name: "default_credit_note_note",
            label: t("Default Note"),
            description: t("This note will be pre-filled when creating new credit notes"),
            placeholder: t("Credit note for invoice {document_number}."),
            textareaRef: creditNoteNoteRef,
            rows: 3,
            className: "resize-y",
          })}

          {renderLocalizedTextareaField({
            name: "default_credit_note_payment_terms",
            label: t("Default Payment Terms"),
            description: t("Payment terms pre-filled when creating new credit notes"),
            placeholder: t("Credit will be applied to your account."),
            textareaRef: creditNotePaymentTermsRef,
            rows: 3,
            className: "resize-y",
          })}
        </TabsContent>

        {/* Advance Invoice Tab */}
        <TabsContent value="advance_invoice" className="mt-4 space-y-4">
          {renderLocalizedTextareaField({
            name: "default_advance_invoice_note",
            label: t("Default Note"),
            description: t("Default note for all new advance invoices"),
            placeholder: t("Default note for advance invoices"),
            textareaRef: advanceInvoiceNoteRef,
            rows: 4,
            className: "min-h-[100px] resize-none",
          })}
        </TabsContent>

        {/* Delivery Note Tab */}
        <TabsContent value="delivery_note" className="mt-4 space-y-4">
          {renderLocalizedTextareaField({
            name: "default_delivery_note_note",
            label: t("Default Note"),
            description: t("Default note for all new delivery notes"),
            placeholder: t("Default note for delivery notes"),
            textareaRef: deliveryNoteNoteRef,
            rows: 4,
            className: "min-h-[100px] resize-none",
          })}
        </TabsContent>
      </Tabs>
    </div>
  );

  // Footer section content
  const footerContent = (
    <div className="space-y-6 border-t pt-6">
      {renderLocalizedTextareaField({
        name: "default_document_signature",
        label: t("Document Signature"),
        description: t("Signature text displayed on all PDF documents"),
        placeholder: t("{entity_name}"),
        textareaRef: documentSignatureRef,
        rows: 2,
        className: "resize-y",
      })}

      {renderLocalizedTextareaField({
        name: "document_footer",
        label: t("Document Footer"),
        description: t("Footer text displayed at the bottom of all PDF documents"),
        placeholder: t("{entity_name} | Due Date: {document_due_date} | Invoice #{document_number}"),
        textareaRef: documentFooterRef,
        rows: 2,
        className: "resize-y",
      })}
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
