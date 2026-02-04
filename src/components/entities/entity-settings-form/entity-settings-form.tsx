import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { CreditCard, FileText, Globe, Mail, Palette, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SmartCodeInsertButton } from "@/ui/components/documents/create/smart-code-insert-button";
import { Button } from "@/ui/components/ui/button";
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
import { Label } from "@/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/ui/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Switch } from "@/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { patchEntitySchema } from "@/ui/generated/schemas/entity";
import { CURRENCY_CODES } from "@/ui/lib/constants";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useSDK } from "@/ui/providers/sdk-provider";
import ButtonLoader from "../../button-loader";
import { useUpdateEntity } from "../entities.hooks";
import { EmailTemplateVariablesInfo } from "./email-template-variables-info";
import { ImageUploadWithCrop } from "./image-upload-with-crop";
import { InputWithPreview } from "./input-with-preview";
import de from "./locales/de";
import sl from "./locales/sl";

const translations = {
  sl,
  de,
} as const;

// Supported locales (matching backend)
const SUPPORTED_LOCALES = [
  { value: "en-US", label: "English (US)" },
  { value: "de-DE", label: "Deutsch (DE)" },
  { value: "it-IT", label: "Italiano (IT)" },
  { value: "fr-FR", label: "Français (FR)" },
  { value: "es-ES", label: "Español (ES)" },
  { value: "sl-SI", label: "Slovenščina (SI)" },
] as const;

// Form schema extends the generated patchEntitySchema but flattens nested settings for better UX
// Uses .omit() to remove nested fields, then .extend() to add flattened versions
// This approach keeps the base validation from the API schema while allowing a better form structure
const entitySettingsFormSchema = patchEntitySchema
  .omit({
    settings: true, // Remove nested settings - we'll flatten them
    metadata: true, // Not used in this form
    environment: true, // Not editable here
  })
  .extend({
    // Flattened settings fields for easier form handling
    // These will be transformed back to nested structure on submission
    primary_color: z
      .union([z.string(), z.null()])
      .refine((val) => !val || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(val), {
        message: "Must be a valid hex color (e.g., #5c6ac4)",
      })
      .optional(),
    has_logo: z.union([z.boolean(), z.null()]).optional(),
    has_signature: z.union([z.boolean(), z.null()]).optional(),
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
    default_invoice_note: z.union([z.string(), z.null()]).optional(),
    // Bank account fields (stored in settings.bank_accounts array)
    bank_account_iban: z
      .union([z.string(), z.null()])
      .refine((val) => !val || /^[A-Z]{2}[0-9A-Z]{2,32}$/.test(val.replace(/\s/g, "")), {
        message: "Must be a valid IBAN",
      })
      .optional(),
    bank_account_name: z.union([z.string(), z.null()]).optional(),
    bank_account_bank_name: z.union([z.string(), z.null()]).optional(),
    bank_account_bic: z.union([z.string(), z.null()]).optional(),
    // UPN QR settings (Slovenia only)
    upn_qr_enabled: z.union([z.boolean(), z.null()]).optional(),
    upn_qr_display_mode: z.enum(["qr_only", "full_slip"]).optional(),
    upn_qr_purpose_code: z
      .union([z.string(), z.null()])
      .refine((val) => !val || /^[A-Z]{4}$/.test(val), {
        message: "Must be a 4-letter uppercase code (e.g., OTHR)",
      })
      .optional(),
  });

export type EntitySettingsFormSchema = z.infer<typeof entitySettingsFormSchema>;

export type EntitySettingsFormProps = {
  entity: Entity;
  cloudinaryCloudName?: string;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
  onUploadSuccess?: () => void;
} & ComponentTranslationProps;

export function EntitySettingsForm({
  entity,
  cloudinaryCloudName,
  t: translateProp,
  namespace,
  locale,
  onSuccess,
  onError,
  onUploadSuccess,
}: EntitySettingsFormProps) {
  const translate = createTranslation({
    t: translateProp,
    namespace,
    locale,
    translations,
  });
  const { sdk } = useSDK();
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now());
  const [signatureTimestamp, setSignatureTimestamp] = useState(Date.now());
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);
  const [fetchedLogoUrl, setFetchedLogoUrl] = useState<string | null>(null);
  const [fetchedSignatureUrl, setFetchedSignatureUrl] = useState<string | null>(null);

  // Extract current settings from entity (needed early for useEffect)
  const currentSettings = (entity.settings as any) || {};

  const form = useForm<EntitySettingsFormSchema>({
    resolver: zodResolver(entitySettingsFormSchema),
    defaultValues: {
      name: entity.name || "",
      tax_number: (entity as any).tax_number || null,
      address: (entity as any).address || null,
      address_2: (entity as any).address_2 || null,
      post_code: (entity as any).post_code || null,
      city: (entity as any).city || null,
      state: (entity as any).state || null,
      currency_code: entity.currency_code || undefined,
      locale: entity.locale || "en-US",
      primary_color: currentSettings.primary_color || null,
      has_logo: currentSettings.has_logo || null,
      has_signature: currentSettings.has_signature || null,
      email: currentSettings.email || null,
      invoice_email_subject: currentSettings.email_defaults?.invoice_subject || null,
      invoice_email_body: currentSettings.email_defaults?.invoice_body || null,
      estimate_email_subject: currentSettings.email_defaults?.estimate_subject || null,
      estimate_email_body: currentSettings.email_defaults?.estimate_body || null,
      default_invoice_note: currentSettings.default_invoice_note || null,
      // Bank account and UPN QR settings
      bank_account_iban: currentSettings.bank_accounts?.[0]?.iban || null,
      bank_account_name: currentSettings.bank_accounts?.[0]?.name || null,
      bank_account_bank_name: currentSettings.bank_accounts?.[0]?.bank_name || null,
      bank_account_bic: currentSettings.bank_accounts?.[0]?.bic || null,
      upn_qr_enabled: currentSettings.upn_qr?.enabled || false,
      upn_qr_display_mode: currentSettings.upn_qr?.display_mode || "qr_only",
      upn_qr_purpose_code: currentSettings.upn_qr?.purpose_code || "OTHR",
    },
  });

  // Refs for textarea cursor position tracking
  const defaultInvoiceNoteRef = useRef<HTMLTextAreaElement>(null);
  const invoiceEmailSubjectRef = useRef<HTMLInputElement>(null);
  const invoiceEmailBodyRef = useRef<HTMLTextAreaElement>(null);
  const estimateEmailSubjectRef = useRef<HTMLInputElement>(null);
  const estimateEmailBodyRef = useRef<HTMLTextAreaElement>(null);

  // Fetch logo and signature URLs from file metadata on mount
  // Always fetch files to ensure we have the latest uploads, even if entity settings are stale
  useEffect(() => {
    async function fetchFileUrls() {
      try {
        // SDK auto-unwraps response, returns data array directly
        const files = await sdk.files.list({ entity_id: entity.id });

        const logoFile = files.data.find((f: { category: string }) => f.category === "logo");
        const signatureFile = files.data.find((f: { category: string }) => f.category === "signature");

        if (logoFile) {
          setFetchedLogoUrl(logoFile.secureUrl);
          // Sync form state if logo exists but form doesn't know about it
          if (!form.getValues("has_logo")) {
            form.setValue("has_logo", true);
          }
        }
        if (signatureFile) {
          setFetchedSignatureUrl(signatureFile.secureUrl);
          // Sync form state if signature exists but form doesn't know about it
          if (!form.getValues("has_signature")) {
            form.setValue("has_signature", true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch file URLs:", error);
        // Fall back to constructed URLs if fetch fails
      }
    }

    fetchFileUrls();
  }, [entity.id, sdk.files, form]);

  // Watch the has_logo and has_signature form fields for changes
  const hasLogo = form.watch("has_logo");
  const hasSignature = form.watch("has_signature");

  // Logo URL priority: freshly uploaded > fetched from API > constructed fallback
  const entityTimestamp = entity.updated_at ? new Date(entity.updated_at).getTime() : logoTimestamp;
  const logoUrl =
    hasLogo && cloudinaryCloudName
      ? uploadedLogoUrl ||
        fetchedLogoUrl ||
        `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/leka/entities/${entity.id}/logos/logo_${entity.id}.png?v=${entityTimestamp}`
      : undefined;

  // Signature URL priority: freshly uploaded > fetched from API > constructed fallback
  const signatureEntityTimestamp = entity.updated_at ? new Date(entity.updated_at).getTime() : signatureTimestamp;
  const signatureUrl =
    hasSignature && cloudinaryCloudName
      ? uploadedSignatureUrl ||
        fetchedSignatureUrl ||
        `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/leka/entities/${entity.id}/signatures/signature_${entity.id}.png?v=${signatureEntityTimestamp}`
      : undefined;

  const { mutate: updateEntity, isPending } = useUpdateEntity({
    entityId: entity.id,
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const handleImageUpload = async (file: File): Promise<{ secureUrl: string }> => {
    setIsUploading(true);
    try {
      // SDK expects { file: Blob } as first arg, SDKMethodOptions as last
      const result = await sdk.upload.uploadImage({ file }, { entity_id: entity.id });

      // Note: The upload endpoint automatically sets has_logo=true in entity settings
      // We just need to update the form state
      form.setValue("has_logo", true);

      // Use the freshly uploaded URL with Cloudinary version (bypasses CDN cache)
      // This ensures immediate preview update without waiting for CDN invalidation
      setUploadedLogoUrl(result.secureUrl);

      // Update timestamp to bust cache for future loads
      setLogoTimestamp(Date.now());

      // Trigger entity refetch to get the updated has_logo from database
      onUploadSuccess?.();

      return result;
    } catch (error) {
      console.error("Upload failed:", error);
      onError?.(error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignatureUpload = async (file: File): Promise<{ secureUrl: string }> => {
    setIsUploadingSignature(true);
    try {
      // SDK expects { file, category } as first arg, SDKMethodOptions as last
      const result = await sdk.files.uploadFile({ file, category: "signature" }, { entity_id: entity.id });

      // Update form state
      form.setValue("has_signature", true);

      // Use the freshly uploaded URL
      setUploadedSignatureUrl(result.secureUrl);

      // Update timestamp to bust cache
      setSignatureTimestamp(Date.now());

      // Trigger entity refetch
      onUploadSuccess?.();

      return { secureUrl: result.secureUrl };
    } catch (error) {
      console.error("Signature upload failed:", error);
      onError?.(error);
      throw error;
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const onSubmit = async (values: EntitySettingsFormSchema) => {
    try {
      // Prepare the update payload
      const updatePayload: any = {
        settings: {
          ...currentSettings,
          primary_color: values.primary_color || undefined,
          has_logo: values.has_logo || undefined,
          has_signature: values.has_signature || undefined,
          email: values.email || undefined,
          email_defaults: {
            invoice_subject: values.invoice_email_subject || undefined,
            invoice_body: values.invoice_email_body || undefined,
            estimate_subject: values.estimate_email_subject || undefined,
            estimate_body: values.estimate_email_body || undefined,
          },
          default_invoice_note: values.default_invoice_note || undefined,
          // UPN QR settings - only include if enabled or was previously enabled
          upn_qr:
            values.upn_qr_enabled || currentSettings.upn_qr
              ? {
                  enabled: values.upn_qr_enabled || false,
                  display_mode: values.upn_qr_display_mode || "qr_only",
                  purpose_code: values.upn_qr_purpose_code || "OTHR",
                }
              : undefined,
          // Bank accounts - store in array format (preserving other accounts if any)
          bank_accounts: values.bank_account_iban
            ? [
                {
                  type: "iban" as const,
                  iban: values.bank_account_iban,
                  name: values.bank_account_name || undefined,
                  bank_name: values.bank_account_bank_name || undefined,
                  bic: values.bank_account_bic || undefined,
                  is_default: true,
                },
                // Preserve any additional bank accounts (beyond the first one)
                ...(currentSettings.bank_accounts?.slice(1) || []),
              ]
            : currentSettings.bank_accounts || undefined,
        },
      };

      // Add top-level fields if changed
      if (values.name && values.name !== entity.name) {
        updatePayload.name = values.name;
      }
      if (values.tax_number !== undefined && values.tax_number !== (entity as any).tax_number) {
        updatePayload.tax_number = values.tax_number;
      }
      if (values.address !== undefined && values.address !== (entity as any).address) {
        updatePayload.address = values.address;
      }
      if (values.address_2 !== undefined && values.address_2 !== (entity as any).address_2) {
        updatePayload.address_2 = values.address_2;
      }
      if (values.post_code !== undefined && values.post_code !== (entity as any).post_code) {
        updatePayload.post_code = values.post_code;
      }
      if (values.city !== undefined && values.city !== (entity as any).city) {
        updatePayload.city = values.city;
      }
      if (values.state !== undefined && values.state !== (entity as any).state) {
        updatePayload.state = values.state;
      }
      if (values.currency_code && values.currency_code !== entity.currency_code) {
        updatePayload.currency_code = values.currency_code;
      }
      if (values.locale && values.locale !== entity.locale) {
        updatePayload.locale = values.locale;
      }

      updateEntity({ id: entity.id, data: updatePayload });
    } catch (e) {
      onError?.(e);
      form.setError("root", {
        type: "submit",
        message: "Failed to update entity settings",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
        {/* Entity Details Section */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{translate("Entity Details")}</h3>
                <p className="text-muted-foreground text-sm">{translate("Basic information about your entity")}</p>
              </div>
            </div>

            <div className="space-y-6 pl-[52px]">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium text-base">{translate("Entity Name")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="My Company LLC" className="h-10" />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {translate("Your company or organization name")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_number"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel className="font-medium text-base">{translate("Tax ID")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        placeholder="12-3456789"
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {translate("Tax identification number (optional)")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-base">{translate("Address")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="123 Main Street"
                          className="h-10"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">{translate("Street address")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address_2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium text-base">{translate("Address Line 2")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        placeholder="Suite 100"
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {translate("Apartment, suite, unit, etc. (optional)")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-base">{translate("City")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="San Francisco"
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-base">{translate("State/Province")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="CA"
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="post_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-base">{translate("Postal Code")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          placeholder="94102"
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem>
                <FormLabel className="font-medium text-base">{translate("Country")}</FormLabel>
                <FormControl>
                  <Input value={(entity as any).country || ""} disabled className="h-10" />
                </FormControl>
                <FormDescription className="text-xs">{translate("Country cannot be changed")}</FormDescription>
              </FormItem>
            </div>
          </div>

          {/* Help Content */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-3 border-muted border-l-2 pl-4">
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground text-sm">{translate("Entity Information")}</p>
                  <p className="text-muted-foreground/80 text-xs leading-relaxed">
                    {translate(
                      "This information appears on your invoices and estimates. Your entity name and address will be displayed prominently on all documents.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customization Section */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{translate("Customization")}</h3>
                <p className="text-muted-foreground text-sm">{translate("Customize your invoice appearance")}</p>
              </div>
            </div>

            <div className="space-y-6 pl-[52px]">
              <FormField
                control={form.control}
                name="primary_color"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel className="font-medium text-base">{translate("Primary Color")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Input
                            type="color"
                            {...field}
                            value={field.value || "#5c6ac4"}
                            className="h-12 w-16 cursor-pointer rounded-md border-2 p-1.5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                          />
                        </div>
                        <Input
                          type="text"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#5c6ac4"
                          className="w-32 font-mono text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      {translate("Color used in invoices and documents")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 border-t pt-6 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="has_logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-base">{translate("Logo")}</FormLabel>
                      <FormControl>
                        <ImageUploadWithCrop
                          value={logoUrl || ""}
                          onChange={(url) => field.onChange(!!url)}
                          onUpload={handleImageUpload}
                          translate={translate}
                          isUploading={isUploading}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {translate("Upload your company logo for invoices")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="has_signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-base">{translate("Signature")}</FormLabel>
                      <FormControl>
                        <ImageUploadWithCrop
                          value={signatureUrl || ""}
                          onChange={(url) => field.onChange(!!url)}
                          onUpload={handleSignatureUpload}
                          translate={translate}
                          isUploading={isUploadingSignature}
                          imageType="signature"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {translate("Upload a signature image for PDFs (optional)")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Help Content */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-3 border-muted border-l-2 pl-4">
              <div className="flex items-start gap-2">
                <Palette className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground text-sm">{translate("Brand Appearance")}</p>
                  <p className="text-muted-foreground/80 text-xs leading-relaxed">
                    {translate(
                      "Customize how your invoices and estimates look. Set your brand color, upload your company logo, and add a signature for a professional touch.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Entity Settings Section */}
        <div className="grid gap-8 border-t pt-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{translate("Entity Settings")}</h3>
                <p className="text-muted-foreground text-sm">{translate("Configure entity localization")}</p>
              </div>
            </div>

            <div className="space-y-6 pl-[52px]">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="currency_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-sm">{translate("Currency")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={translate("Select currency")} />
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
                      <FormLabel className="font-medium text-sm">{translate("Locale")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={translate("Select locale")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUPPORTED_LOCALES.map((locale) => (
                            <SelectItem key={locale.value} value={locale.value}>
                              {locale.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Help Content */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-3 border-muted border-l-2 pl-4">
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground text-sm">{translate("Localization")}</p>
                  <p className="text-muted-foreground/80 text-xs leading-relaxed">
                    {translate(
                      "Set your default currency and locale for invoices and estimates. These settings affect how numbers, dates, and currencies are displayed.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* UPN QR Payment Section - Only for Slovenian entities */}
        {(entity as any).country_code === "SI" && (
          <div className="grid gap-8 border-t pt-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{translate("UPN QR Payment")}</h3>
                  <p className="text-muted-foreground text-sm">
                    {translate("Configure UPN QR payment slip for invoices")}
                  </p>
                </div>
              </div>

              <div className="space-y-6 pl-[52px]">
                <div className="space-y-4 rounded-lg border p-4">
                  <p className="font-medium text-sm">{translate("Bank Account")}</p>

                  <FormField
                    control={form.control}
                    name="bank_account_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translate("Account Name")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            placeholder={translate("Main Business Account")}
                            className="h-9"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bank_account_iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translate("IBAN")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/\s/g, "") || null)}
                            placeholder="SI56 0123 4567 8901 234"
                            className="h-9 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="bank_account_bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translate("Bank Name")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                              placeholder="NLB d.d."
                              className="h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bank_account_bic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translate("BIC/SWIFT")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase() || null)}
                              placeholder="LJBASI2X"
                              className="h-9 font-mono"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <FormField
                    control={form.control}
                    name="upn_qr_enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="font-medium text-base">
                            {translate("Enable UPN QR on invoices")}
                          </FormLabel>
                          <FormDescription className="text-xs">
                            {translate("Show payment QR code on PDF invoices for easy mobile banking payments")}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            disabled={!form.watch("bank_account_iban")}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("upn_qr_enabled") && (
                    <div className="mt-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="upn_qr_display_mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="font-medium text-sm">{translate("Display Mode")}</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-col space-y-2"
                              >
                                <div className="flex items-center space-x-3">
                                  <RadioGroupItem value="qr_only" id="qr_only" />
                                  <Label htmlFor="qr_only" className="cursor-pointer font-normal">
                                    <span className="font-medium">{translate("QR code only")}</span>
                                    <span className="block text-muted-foreground text-xs">
                                      {translate("Shows compact QR code inline with invoice content")}
                                    </span>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <RadioGroupItem value="full_slip" id="full_slip" />
                                  <Label htmlFor="full_slip" className="cursor-pointer font-normal">
                                    <span className="font-medium">{translate("Full UPN payment slip")}</span>
                                    <span className="block text-muted-foreground text-xs">
                                      {translate("Shows complete payment slip at bottom of page")}
                                    </span>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="upn_qr_purpose_code"
                        render={({ field }) => (
                          <FormItem className="max-w-xs">
                            <FormLabel className="font-medium text-sm">{translate("Purpose Code")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "OTHR"}>
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="OTHR">{translate("OTHR - Other")}</SelectItem>
                                <SelectItem value="GDSV">{translate("GDSV - Goods and Services")}</SelectItem>
                                <SelectItem value="SUPP">{translate("SUPP - Supplier Payment")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              {translate("Payment purpose code (ISO 20022)")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Help Content */}
            <div className="hidden lg:block">
              <div className="sticky top-6 space-y-3 border-muted border-l-2 pl-4">
                <div className="flex items-start gap-2">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground text-sm">{translate("UPN QR Payments")}</p>
                    <p className="text-muted-foreground/80 text-xs leading-relaxed">
                      {translate(
                        "UPN QR is a Slovenian standard for payment slips. When enabled, your invoices will include a QR code that customers can scan with their mobile banking app to pay instantly.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Defaults Section */}
        <div className="grid gap-8 border-t pt-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{translate("Document Defaults")}</h3>
                <p className="text-muted-foreground text-sm">{translate("Default values for new documents")}</p>
              </div>
            </div>

            <div className="space-y-6 pl-[52px]">
              <FormField
                control={form.control}
                name="default_invoice_note"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-medium text-sm">{translate("Default Invoice Note")}</FormLabel>
                      <SmartCodeInsertButton
                        textareaRef={defaultInvoiceNoteRef}
                        value={field.value || ""}
                        onInsert={(newValue) => field.onChange(newValue)}
                        t={translate}
                      />
                    </div>
                    <FormControl>
                      <InputWithPreview
                        ref={defaultInvoiceNoteRef}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder={translate(
                          "Payment due by {document_due_date}. Please reference invoice {document_number}.",
                        )}
                        entity={entity}
                        multiline
                        rows={3}
                        className="resize-y"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {translate("This note will be pre-filled when creating new invoices")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Help Content */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-6 border-muted border-l-2 pl-4">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground text-sm">{translate("Invoice Notes")}</p>
                  <p className="text-muted-foreground/80 text-xs leading-relaxed">
                    {translate(
                      "Set a default note that will appear on all new invoices. Use template variables to personalize the note automatically.",
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground text-sm">{translate("Smart Template Variables")}</p>
                    <p className="text-muted-foreground/80 text-xs leading-relaxed">
                      {translate("Use variables to personalize your notes automatically")}
                    </p>
                  </div>
                </div>
                <EmailTemplateVariablesInfo translate={translate} />
              </div>
            </div>
          </div>
        </div>

        {/* Email Settings Section */}
        <div className="grid gap-8 border-t pt-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{translate("Email Settings")}</h3>
                <p className="text-muted-foreground text-sm">{translate("Configure email settings for invoices")}</p>
              </div>
            </div>

            <div className="space-y-6 pl-[52px]">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium text-sm">{translate("Email Address")}</FormLabel>
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
                    <FormDescription className="text-xs">
                      {translate("Email address to send invoices to")}
                    </FormDescription>
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
                      {translate("Invoice")}
                    </TabsTrigger>
                    <TabsTrigger value="estimate" className="cursor-pointer">
                      {translate("Estimate")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="invoice" className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="invoice_email_subject"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="font-medium text-sm">{translate("Email Subject")}</FormLabel>
                            <SmartCodeInsertButton
                              textareaRef={invoiceEmailSubjectRef as React.RefObject<HTMLTextAreaElement | null>}
                              value={field.value || ""}
                              onInsert={(newValue) => field.onChange(newValue)}
                              t={translate}
                            />
                          </div>
                          <FormControl>
                            <InputWithPreview
                              ref={invoiceEmailSubjectRef}
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Invoice {document_number} from {entity_name}"
                              entity={entity}
                              className="h-10"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {translate("Subject line for invoice emails")}
                          </FormDescription>
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
                            <FormLabel className="font-medium text-sm">{translate("Email Body")}</FormLabel>
                            <SmartCodeInsertButton
                              textareaRef={invoiceEmailBodyRef}
                              value={field.value || ""}
                              onInsert={(newValue) => field.onChange(newValue)}
                              t={translate}
                            />
                          </div>
                          <FormControl>
                            <InputWithPreview
                              ref={invoiceEmailBodyRef}
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Please find your invoice attached."
                              entity={entity}
                              multiline
                              className="min-h-[200px] resize-none"
                              rows={8}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {translate("Body content for invoice emails")}
                          </FormDescription>
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
                            <FormLabel className="font-medium text-sm">{translate("Email Subject")}</FormLabel>
                            <SmartCodeInsertButton
                              textareaRef={estimateEmailSubjectRef as React.RefObject<HTMLTextAreaElement | null>}
                              value={field.value || ""}
                              onInsert={(newValue) => field.onChange(newValue)}
                              t={translate}
                            />
                          </div>
                          <FormControl>
                            <InputWithPreview
                              ref={estimateEmailSubjectRef}
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Estimate {document_number} from {entity_name}"
                              entity={entity}
                              className="h-10"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {translate("Subject line for estimate emails")}
                          </FormDescription>
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
                            <FormLabel className="font-medium text-sm">{translate("Email Body")}</FormLabel>
                            <SmartCodeInsertButton
                              textareaRef={estimateEmailBodyRef}
                              value={field.value || ""}
                              onInsert={(newValue) => field.onChange(newValue)}
                              t={translate}
                            />
                          </div>
                          <FormControl>
                            <InputWithPreview
                              ref={estimateEmailBodyRef}
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Please find your estimate attached."
                              entity={entity}
                              multiline
                              className="min-h-[200px] resize-none"
                              rows={8}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {translate("Body content for estimate emails")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Help Content */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-6 border-muted border-l-2 pl-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground text-sm">{translate("Email Defaults")}</p>
                    <p className="text-muted-foreground/80 text-xs leading-relaxed">
                      {translate(
                        "Configure default email templates for sending invoices and estimates to your customers. Customize the subject line and body for each document type.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground text-sm">{translate("Smart Template Variables")}</p>
                    <p className="text-muted-foreground/80 text-xs leading-relaxed">
                      {translate("Use variables to personalize your emails automatically")}
                    </p>
                  </div>
                </div>
                <EmailTemplateVariablesInfo translate={translate} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button type="submit" className="cursor-pointer px-8" disabled={isPending} aria-busy={isPending} size="lg">
            {isPending ? <ButtonLoader /> : translate("Save Settings")}
          </Button>
        </div>

        {form.formState.errors.root && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="font-medium text-destructive text-sm">{form.formState.errors.root.message}</p>
          </div>
        )}
      </form>
    </Form>
  );
}
