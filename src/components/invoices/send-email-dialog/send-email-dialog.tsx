import { zodResolver } from "@hookform/resolvers/zod";
import type { Invoice } from "@spaceinvoices/js-sdk";
import { AlertCircle, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { InputWithPreview } from "@/ui/components/entities/entity-settings-form/input-with-preview";
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
import { Spinner } from "@/ui/components/ui/spinner";
import { type SendEmailSchema, sendEmailSchema } from "@/ui/generated/schemas";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEntities } from "@/ui/providers/entities-context";
import { useSDK } from "@/ui/providers/sdk-provider";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";

const translations = { de, sl, it, fr, es, pt, nl, pl, hr } as const;

type SendEmailDialogProps = {
  invoice: Invoice;
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
} & ComponentTranslationProps;

export function SendEmailDialog({
  invoice,
  defaultEmail = "",
  defaultSubject = "",
  defaultBody = "",
  onSuccess,
  onError,
  ButtonLoader,
  renderAsDropdownItem = false,
  translationFn,
  open: controlledOpen,
  onOpenChange,
  locale = "en",
  ...i18nProps
}: SendEmailDialogProps) {
  const t = translationFn || createTranslation({ translations, locale, ...i18nProps });

  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  // biome-ignore lint/suspicious/noEmptyBlockStatements: noop fallback for controlled mode
  const setOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const { sdk } = useSDK();
  const { activeEntity } = useEntities();

  // Get entity email defaults if not provided
  const entitySettings = (activeEntity?.settings as Record<string, any>) || {};
  const emailDefaults = entitySettings.email_defaults || {};

  const finalSubject = defaultSubject || emailDefaults.invoice_subject || `Invoice #${invoice.number}`;
  const finalBody =
    defaultBody || emailDefaults.invoice_body || `Please find your invoice #${invoice.number} attached.`;

  const form = useForm<SendEmailSchema>({
    resolver: zodResolver(sendEmailSchema) as Resolver<SendEmailSchema>,
    defaultValues: {
      to: defaultEmail,
      subject: finalSubject,
      body_text: finalBody,
      attach_pdf: false,
    },
  });

  // Reset form and fetch customer email when dialog opens
  useEffect(() => {
    if (!open) return;

    // Reset form to defaults when dialog opens
    form.reset({
      to: defaultEmail,
      subject: finalSubject,
      body_text: finalBody,
      attach_pdf: false,
    });

    // Fetch customer email from linked customer if not in invoice snapshot
    const fetchCustomerEmail = async () => {
      if (defaultEmail || !invoice.customer_id || !sdk || !activeEntity?.id) {
        return;
      }

      try {
        const response = await sdk.customers.list({
          query: JSON.stringify({ id: invoice.customer_id }),
          limit: 1,
          entity_id: activeEntity.id,
        });

        const customer = response.data[0];
        if (customer?.email) {
          form.setValue("to", customer.email);
        }
      } catch {
        // Silently fail - customer might not exist or not have email
      }
    };

    fetchCustomerEmail();
  }, [open, defaultEmail, invoice.customer_id, sdk, activeEntity?.id, form, finalSubject, finalBody]);

  const onSubmit = async (values: SendEmailSchema) => {
    setIsLoading(true);
    try {
      if (!sdk) throw new Error("SDK not initialized");

      // Ensure we have an active entity
      if (!activeEntity?.id) throw new Error("Entity context required");

      // Call the email API endpoint using SDK
      await (sdk.email as any).send(
        {
          to: values.to,
          subject: values.subject,
          body_text: values.body_text,
          document_id: invoice.id,
        },
        { entity_id: activeEntity.id },
      );

      toast.success(t("Email sent"), {
        description: `${t("Invoice sent to")} ${values.to}`,
      });

      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("Failed to send email");
      toast.error(t("Failed to send email"), {
        description: errorMessage,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Send Invoice by Email")}</DialogTitle>
          <DialogDescription>
            {t("Send invoice by email description").replace("{number}", invoice.number)}
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
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Recipient Email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="customer@example.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Subject (Optional)")}</FormLabel>
                  <FormControl>
                    <InputWithPreview
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder={t("Invoice Subject")}
                      entity={activeEntity!}
                      document={invoice}
                      disabled={isLoading}
                      className="h-10"
                    />
                  </FormControl>
                  <FormDescription>{t("Leave empty to use default")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Message (Optional)")}</FormLabel>
                  <FormControl>
                    <InputWithPreview
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder={t("Email message placeholder")}
                      entity={activeEntity!}
                      document={invoice}
                      disabled={isLoading}
                      multiline
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>{t("Leave empty to use default")}</FormDescription>
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
              <Button type="submit" className="min-w-[100px] cursor-pointer" disabled={isLoading}>
                {isLoading ? ButtonLoader ? <ButtonLoader /> : <Spinner /> : t("Send Email")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
