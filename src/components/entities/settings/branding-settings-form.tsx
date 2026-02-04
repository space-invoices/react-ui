import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useSDK } from "@/ui/providers/sdk-provider";
import { useUpdateEntity } from "../entities.hooks";
import { ImageUploadWithCrop } from "../entity-settings-form/image-upload-with-crop";
import de from "../entity-settings-form/locales/de";
import sl from "../entity-settings-form/locales/sl";

const translations = { sl, de } as const;

const brandingSettingsSchema = z.object({
  primary_color: z
    .union([z.string(), z.null()])
    .refine((val) => !val || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(val), {
      message: "Must be a valid hex color (e.g., #5c6ac4)",
    })
    .optional(),
  has_logo: z.union([z.boolean(), z.null()]).optional(),
  has_signature: z.union([z.boolean(), z.null()]).optional(),
});

type BrandingSettingsSchema = z.infer<typeof brandingSettingsSchema>;

export type BrandingSettingsFormProps = {
  entity: Entity;
  cloudinaryCloudName?: string;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
  onUploadSuccess?: () => void;
} & ComponentTranslationProps;

export function BrandingSettingsForm({
  entity,
  cloudinaryCloudName,
  t: translateProp,
  namespace,
  locale,
  onSuccess,
  onError,
  onUploadSuccess,
}: BrandingSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translations });
  const { sdk } = useSDK();

  const currentSettings = (entity.settings as any) || {};

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now());
  const [signatureTimestamp, setSignatureTimestamp] = useState(Date.now());
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);
  const [fetchedLogoUrl, setFetchedLogoUrl] = useState<string | null>(null);
  const [fetchedSignatureUrl, setFetchedSignatureUrl] = useState<string | null>(null);

  const form = useForm<BrandingSettingsSchema>({
    resolver: zodResolver(brandingSettingsSchema),
    defaultValues: {
      primary_color: currentSettings.primary_color || null,
      has_logo: currentSettings.has_logo || null,
      has_signature: currentSettings.has_signature || null,
    },
  });

  // Fetch logo and signature URLs
  useEffect(() => {
    async function fetchFileUrls() {
      try {
        const files = await sdk.files.list({ entity_id: entity.id });
        const logoFile = files.data.find((f) => f.category === "logo");
        const signatureFile = files.data.find((f) => f.category === "signature");

        if (logoFile) {
          setFetchedLogoUrl(logoFile.secureUrl);
          if (!form.getValues("has_logo")) form.setValue("has_logo", true);
        }
        if (signatureFile) {
          setFetchedSignatureUrl(signatureFile.secureUrl);
          if (!form.getValues("has_signature")) form.setValue("has_signature", true);
        }
      } catch (error) {
        console.error("Failed to fetch file URLs:", error);
      }
    }
    fetchFileUrls();
  }, [entity.id, sdk.files, form]);

  const hasLogo = form.watch("has_logo");
  const hasSignature = form.watch("has_signature");

  const entityTimestamp = entity.updated_at ? new Date(entity.updated_at).getTime() : logoTimestamp;
  const logoUrl =
    hasLogo && cloudinaryCloudName
      ? uploadedLogoUrl ||
        fetchedLogoUrl ||
        `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/leka/entities/${entity.id}/logos/logo_${entity.id}.png?v=${entityTimestamp}`
      : undefined;

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
      form.reset(form.getValues());
      onSuccess?.(data);
    },
    onError,
  });

  useFormFooterRegistration({
    formId: "branding-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save Settings"),
  });

  const handleImageUpload = async (file: File): Promise<{ secureUrl: string }> => {
    setIsUploading(true);
    try {
      // SDK expects { file: Blob } as first arg, SDKMethodOptions as last
      const result = await sdk.upload.uploadImage({ file }, { entity_id: entity.id });
      form.setValue("has_logo", true);
      setUploadedLogoUrl(result.secureUrl);
      setLogoTimestamp(Date.now());
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
      form.setValue("has_signature", true);
      setUploadedSignatureUrl(result.secureUrl);
      setSignatureTimestamp(Date.now());
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

  const onSubmit = (values: BrandingSettingsSchema) => {
    updateEntity({
      id: entity.id,
      data: {
        settings: {
          ...currentSettings,
          primary_color: values.primary_color || undefined,
          has_logo: values.has_logo || undefined,
          has_signature: values.has_signature || undefined,
        },
      },
    });
  };

  return (
    <Form {...form}>
      <form id="branding-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="primary_color"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel className="font-medium text-base">{t("Primary Color")}</FormLabel>
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
              <FormDescription className="text-xs">{t("Color used in invoices and documents")}</FormDescription>
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
                <FormLabel className="font-medium text-base">{t("Logo")}</FormLabel>
                <FormControl>
                  <ImageUploadWithCrop
                    value={logoUrl || ""}
                    onChange={(url) => field.onChange(!!url)}
                    onUpload={handleImageUpload}
                    translate={t}
                    isUploading={isUploading}
                  />
                </FormControl>
                <FormDescription className="text-xs">{t("Upload your company logo for invoices")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="has_signature"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-base">{t("Signature")}</FormLabel>
                <FormControl>
                  <ImageUploadWithCrop
                    value={signatureUrl || ""}
                    onChange={(url) => field.onChange(!!url)}
                    onUpload={handleSignatureUpload}
                    translate={t}
                    isUploading={isUploadingSignature}
                    imageType="signature"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t("Upload a signature image for PDFs (optional)")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
