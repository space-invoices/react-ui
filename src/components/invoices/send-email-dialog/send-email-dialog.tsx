import { zodResolver } from "@hookform/resolvers/zod";
import { customers, email, type SendEmailBodyLanguage } from "@spaceinvoices/js-sdk";
import { AlertCircle, Mail, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { InputWithPreview } from "@/ui/components/entities/settings/shared/input-with-preview";
import { Alert, AlertDescription } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Spinner } from "@/ui/components/ui/spinner";
import { sendEmailSchema } from "@/ui/generated/schemas";
import {
  DEFAULT_CONTENT_LOCALE,
  DOCUMENT_CONTENT_TRANSLATIONS_FEATURE,
  type DocumentContentLocaleMode,
} from "@/ui/lib/document-content-translations";
import { getDisplayDocumentNumber } from "@/ui/lib/document-display";
import { getFullLocale } from "@/ui/lib/locale";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { useWhiteLabel } from "@/ui/providers/white-label-provider";
import { getSendEmailErrorMessage, isEmailVerificationRequiredError } from "./error-utils";
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

const translations = { en, de, sl, it, fr, es, pt, nl, pl, hr, sv, fi, et, bg, cs, sk, nb, is } as const;

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
const MAX_RECIPIENTS = 4;

type EmailContentDraft = {
  subject: string;
  bodyText: string;
};

type RecipientFormValue = {
  email: string;
};

function parseRecipientInputs(value: string): RecipientFormValue[] {
  const recipients = value
    .split(",")
    .map((recipient) => recipient.trim())
    .filter((recipient) => recipient.length > 0)
    .map((email) => ({ email }));

  return recipients.length > 0 ? recipients : [{ email: "" }];
}

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

export const DOCUMENT_EMAIL_CONFIG = {
  inv: {
    subjectKey: "invoice_subject",
    bodyKey: "invoice_body",
    label: "Invoice",
    dialogTitle: "Send Invoice by Email",
    description: "Send invoice by email description",
    successPrefix: "Invoice sent to",
  },
  est: {
    subjectKey: "estimate_subject",
    bodyKey: "estimate_body",
    label: "Estimate",
    dialogTitle: "Send Estimate by Email",
    description: "Send estimate by email description",
    successPrefix: "Estimate sent to",
  },
  cre: {
    subjectKey: "credit_note_subject",
    bodyKey: "credit_note_body",
    label: "Credit Note",
    dialogTitle: "Send Credit Note by Email",
    description: "Send credit note by email description",
    successPrefix: "Credit note sent to",
  },
  adv: {
    subjectKey: "advance_invoice_subject",
    bodyKey: "advance_invoice_body",
    label: "Advance Invoice",
    dialogTitle: "Send Advance Invoice by Email",
    description: "Send advance invoice by email description",
    successPrefix: "Advance invoice sent to",
  },
  del: {
    subjectKey: "delivery_note_subject",
    bodyKey: "delivery_note_body",
    label: "Delivery Note",
    dialogTitle: "Send Delivery Note by Email",
    description: "Send delivery note by email description",
    successPrefix: "Delivery note sent to",
  },
} as const;

export function getDocumentEmailConfig(documentId: string) {
  const prefix = documentId.split("_")[0] as keyof typeof DOCUMENT_EMAIL_CONFIG;
  return DOCUMENT_EMAIL_CONFIG[prefix] ?? DOCUMENT_EMAIL_CONFIG.inv;
}

type SendEmailDialogProps = {
  document?: {
    id: string;
    number?: string | null;
    customer?: { email?: string | null } | null;
    customer_id?: string | null;
  };
  defaultEmail?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  ButtonLoader?: React.ComponentType;
  /** When true, only renders a DropdownMenuItem trigger (deprecated - use controlled mode instead) */
  renderAsDropdownItem?: boolean;
  /** @deprecated Use locale prop instead */
  translationFn?: (key: string) => string;
  /** Controlled mode: externally control dialog open state */
  open?: boolean;
  /** Controlled mode: callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** UI language used to display locale names in the selector. */
  translationLocale?: string;
  /** Optional web/app callback to help users verify their email after a handled 403 response. */
  onEmailVerificationRequired?: () => void | Promise<void>;
} & ComponentTranslationProps;

export function SendEmailDialog({
  document,
  defaultEmail = "",
  defaultSubject = "",
  defaultBody = "",
  onSuccess,
  onError,
  ButtonLoader,
  renderAsDropdownItem = false,
  translationFn,
  translationLocale,
  open: controlledOpen,
  onOpenChange,
  onEmailVerificationRequired,
  locale = "en",
  ...i18nProps
}: SendEmailDialogProps) {
  const t = createTranslation({
    t: translationFn,
    locale,
    translationLocale,
    translations,
    ...i18nProps,
  });

  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  // biome-ignore lint/suspicious/noEmptyBlockStatements: noop fallback for controlled mode
  const setOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<DocumentContentLocaleMode>(DEFAULT_CONTENT_LOCALE);
  const [drafts, setDrafts] = useState<Record<string, EmailContentDraft>>({});
  const { activeEntity } = useEntities();
  const whiteLabel = useWhiteLabel();
  const translationsFeatureEnabled = whiteLabel.isFeatureVisible(DOCUMENT_CONTENT_TRANSLATIONS_FEATURE);
  const documentConfig = getDocumentEmailConfig(document?.id ?? "inv_missing");
  const documentNumber = document?.number ?? "";
  const customerId = document?.customer_id ?? null;

  // Get entity email defaults if not provided
  const entitySettings = (activeEntity?.settings as Record<string, any>) || {};
  const emailDefaults = entitySettings.email_defaults || {};
  const emailDefaultTranslations = entitySettings.translations?.email_defaults || {};
  const entityLocale = (activeEntity as any)?.locale || "en-US";

  const finalSubject =
    defaultSubject || emailDefaults[documentConfig.subjectKey] || `${documentConfig.label} #${documentNumber}`;
  const finalBody =
    defaultBody ||
    emailDefaults[documentConfig.bodyKey] ||
    `Please find your ${documentConfig.label.toLowerCase()} #${documentNumber} attached.`;

  const sendEmailDialogSchema = useMemo(
    () =>
      sendEmailSchema.omit({ to: true }).extend({
        recipients: z
          .array(
            z.object({
              email: z.string().trim(),
            }),
          )
          .min(1)
          .superRefine((recipients, ctx) => {
            const hasAnyRecipient = recipients.some((recipient) => recipient.email.length > 0);

            if (!hasAnyRecipient) {
              ctx.addIssue({
                code: "custom",
                path: [0, "email"],
                message: t("Recipient email is required"),
              });
            }

            if (recipients.length > MAX_RECIPIENTS) {
              ctx.addIssue({
                code: "custom",
                path: [MAX_RECIPIENTS, "email"],
                message: t("You can add up to 4 recipients"),
              });
            }

            recipients.forEach((recipient, index) => {
              if (!recipient.email) {
                return;
              }

              const parsedEmail = z.string().email(t("Invalid email address")).safeParse(recipient.email);
              if (!parsedEmail.success) {
                ctx.addIssue({
                  code: "custom",
                  path: [index, "email"],
                  message: t("Invalid email address"),
                });
              }
            });
          }),
        subject: z.string().trim().min(1, t("Subject is required")).max(255),
        body_text: z.string().trim().min(1, t("Message is required")),
      }),
    [t],
  );

  type SendEmailDialogSchema = z.infer<typeof sendEmailDialogSchema>;

  const form = useForm<SendEmailDialogSchema>({
    resolver: zodResolver(sendEmailDialogSchema) as Resolver<SendEmailDialogSchema>,
    defaultValues: {
      recipients: parseRecipientInputs(defaultEmail),
      subject: finalSubject,
      body_text: finalBody,
      attach_pdf: false,
    },
  });
  const { control, handleSubmit, register, reset, setValue, formState } = form;
  const {
    fields: recipientFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "recipients",
  });
  const resolveDraftForLanguage = (nextLanguage: DocumentContentLocaleMode): EmailContentDraft => {
    if (!translationsFeatureEnabled || nextLanguage === DEFAULT_CONTENT_LOCALE) {
      return {
        subject: finalSubject,
        bodyText: finalBody,
      };
    }

    return {
      subject: emailDefaultTranslations[documentConfig.subjectKey]?.[nextLanguage] ?? "",
      bodyText: emailDefaultTranslations[documentConfig.bodyKey]?.[nextLanguage] ?? "",
    };
  };

  const syncDraftField = (field: keyof EmailContentDraft, value: string) => {
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
        bodyText: form.getValues("body_text") || "",
      },
    };
    const nextDraft = nextDrafts[nextLanguage] ?? resolveDraftForLanguage(nextLanguage);

    setDrafts(nextDrafts);
    setLanguage(nextLanguage);
    setValue("subject", nextDraft.subject, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
    setValue("body_text", nextDraft.bodyText, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
  };

  const displayLocale = translationLocale || locale;
  const entityLocaleLabel = getLocalizedLocaleLabel(entityLocale, displayLocale);
  const defaultLanguageLabel = `${t("Default")} (${entityLocaleLabel})`;
  const selectedLanguageLabel =
    language === DEFAULT_LANGUAGE_VALUE
      ? defaultLanguageLabel
      : getLocalizedLocaleLabel(language || entityLocale, displayLocale);

  // Reset form and fetch customer email when dialog opens
  useEffect(() => {
    if (!open) return;

    // Reset form to defaults when dialog opens
    reset({
      recipients: parseRecipientInputs(defaultEmail),
      subject: finalSubject,
      body_text: finalBody,
      attach_pdf: false,
    });
    setLanguage(DEFAULT_LANGUAGE_VALUE);
    setDrafts({
      [DEFAULT_CONTENT_LOCALE]: {
        subject: finalSubject,
        bodyText: finalBody,
      },
    });

    // Fetch customer email from linked customer if not in invoice snapshot
    const fetchCustomerEmail = async () => {
      if (defaultEmail || !customerId || !activeEntity?.id) {
        return;
      }

      try {
        const response = await customers.list({
          query: JSON.stringify({ id: customerId }),
          limit: 1,
          entity_id: activeEntity.id,
        });

        const customer = response.data[0];
        if (customer?.email) {
          setValue("recipients", parseRecipientInputs(customer.email), {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: false,
          });
        }
      } catch {
        // Silently fail - customer might not exist or not have email
      }
    };

    fetchCustomerEmail();
  }, [open, defaultEmail, customerId, activeEntity?.id, reset, setValue, finalSubject, finalBody]);

  if (!document?.id) {
    return null;
  }

  const onSubmit = async (values: SendEmailDialogSchema) => {
    setIsLoading(true);
    try {
      // Ensure we have an active entity
      if (!activeEntity?.id) throw new Error("Entity context required");

      const languageOverride =
        language && language !== DEFAULT_LANGUAGE_VALUE ? (language as SendEmailBodyLanguage) : undefined;
      const recipientEmails = values.recipients
        .map((recipient) => recipient.email.trim())
        .filter((recipient) => recipient.length > 0);
      const joinedRecipients = recipientEmails.join(", ");

      // Call the email API endpoint using SDK
      await email.sendEmail(
        {
          to: joinedRecipients,
          subject: values.subject,
          body_text: values.body_text,
          document_id: document.id,
          language: languageOverride,
        },
        { entity_id: activeEntity.id },
      );

      toast.success(t("Email sent"), {
        description: `${t(documentConfig.successPrefix)} ${joinedRecipients}`,
      });

      setOpen(false);
      reset();
      onSuccess?.();
    } catch (error) {
      const requiresEmailVerification = isEmailVerificationRequiredError(error);
      const errorMessage = getSendEmailErrorMessage(error, t);

      toast.error(requiresEmailVerification ? t("Email verification required") : t("Failed to send email"), {
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
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // In controlled mode, no trigger is rendered - parent controls the dialog
  const showTrigger = !isControlled && !renderAsDropdownItem;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 cursor-pointer p-0">
            <Mail className="h-4 w-4" />
            <span className="sr-only">{t("Send Email")}</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl" data-demo="marketing-demo-send-dialog">
        <DialogHeader>
          <DialogTitle>{t(documentConfig.dialogTitle)}</DialogTitle>
          <DialogDescription>
            {t(documentConfig.description).replace("{number}", getDisplayDocumentNumber(document, t, ""))}
          </DialogDescription>
        </DialogHeader>

        {activeEntity?.environment === "sandbox" && (
          <Alert
            className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
            data-demo="marketing-demo-send-sandbox-warning"
          >
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {t("Sandbox email warning")}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="font-medium text-sm" htmlFor="send-email-recipient-0">
                {t("Recipient Email")}
              </label>
              <div className="space-y-2">
                {recipientFields.map((recipientField, index) => {
                  const recipientError = formState.errors.recipients?.[index]?.email?.message;

                  return (
                    <div key={recipientField.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          id={`send-email-recipient-${index}`}
                          type="email"
                          placeholder="customer@example.com"
                          disabled={isLoading}
                          data-demo={index === 0 ? "marketing-demo-send-email-input" : undefined}
                          {...register(`recipients.${index}.email`)}
                        />
                        {recipientError ? (
                          <p className="font-normal text-destructive text-xs">{recipientError}</p>
                        ) : null}
                      </div>
                      {index === 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="cursor-pointer"
                          onClick={() => append({ email: "" })}
                          disabled={isLoading || recipientFields.length >= MAX_RECIPIENTS}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="sr-only">{t("Add recipient")}</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="cursor-pointer"
                          onClick={() => remove(index)}
                          disabled={isLoading}
                        >
                          <Minus className="h-4 w-4" />
                          <span className="sr-only">{t("Remove recipient")}</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 px-3 py-3">
              <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)] sm:items-center sm:gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {translationsFeatureEnabled ? t("Email and attachment language") : t("PDF Language")}
                  </p>
                </div>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="document-language" className="w-full sm:justify-self-end">
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

            <FormField
              control={control}
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
                      placeholder={t(`${documentConfig.label} Subject`)}
                      entity={activeEntity!}
                      document={document}
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
              control={control}
              name="body_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Message")}</FormLabel>
                  <FormControl>
                    <InputWithPreview
                      value={field.value || ""}
                      onChange={(nextValue) => {
                        field.onChange(nextValue);
                        syncDraftField("bodyText", nextValue);
                      }}
                      placeholder={t("Email message placeholder")}
                      entity={activeEntity!}
                      document={document}
                      translatePreviewLabel={t}
                      disabled={isLoading}
                      multiline
                      rows={8}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                {t("Cancel")}
              </Button>
              <Button
                type="submit"
                className="min-w-[100px] cursor-pointer"
                disabled={isLoading}
                data-demo="marketing-demo-send-email-submit"
              >
                {isLoading ? ButtonLoader ? <ButtonLoader /> : <Spinner /> : t("Send Email")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
