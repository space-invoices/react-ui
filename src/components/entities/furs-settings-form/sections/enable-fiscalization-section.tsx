import type { GetFursSettings200Response } from "@spaceinvoices/js-sdk";
import { AlertCircle, CheckCircle2, Power } from "lucide-react";
import type { FC, ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/ui/components/ui/form";
import { Switch } from "@/ui/components/ui/switch";
import type { FursSettingsFormSchema, SectionType } from "../furs-settings-form";

// Extended premise type to include devices
type ExtendedFursBusinessPremise = {
  id: string;
  business_premise_name: string;
  is_active: boolean;
  Devices?: Array<{ id: string; electronic_device_name?: string }>;
};

interface EnableFiscalizationSectionProps {
  form: UseFormReturn<FursSettingsFormSchema>;
  fursSettings?: GetFursSettings200Response;
  premises?: ExtendedFursBusinessPremise[];
  t: (key: string) => string;
  wrapSection?: (section: SectionType, content: ReactNode) => ReactNode;
}

export const EnableFiscalizationSection: FC<EnableFiscalizationSectionProps> = ({
  form,
  fursSettings,
  premises,
  t,
  wrapSection,
}) => {
  const wrap = (section: SectionType, content: ReactNode) => (wrapSection ? wrapSection(section, content) : content);
  // Compute validation states
  const certificateValid = fursSettings?.certificate_status === "valid";
  const hasPremises = (premises?.length || 0) > 0;
  const hasPremiseWithDevice = premises?.some((p) => p.Devices && p.Devices.length > 0);

  const allPrerequisitesMet = certificateValid && hasPremises && hasPremiseWithDevice;
  const isCurrentlyEnabled = fursSettings?.enabled || false;

  const enableContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Power className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{t("Enable Fiscalization")}</h3>
          <p className="text-muted-foreground text-sm">{t("Turn on FURS fiscalization for invoices")}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Setup Checklist */}
        <div className="space-y-3">
          <p className="font-medium text-sm">{t("Setup Checklist")}</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              {certificateValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={certificateValid ? "" : "text-muted-foreground"}>{t("Valid certificate uploaded")}</span>
            </li>
            <li className="flex items-center gap-2">
              {hasPremises ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={hasPremises ? "" : "text-muted-foreground"}>
                {t("At least one business premise registered")}
              </span>
            </li>
            <li className="flex items-center gap-2">
              {hasPremiseWithDevice ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={hasPremiseWithDevice ? "" : "text-muted-foreground"}>
                {t("At least one electronic device registered")}
              </span>
            </li>
          </ul>
        </div>

        {/* Warning when prerequisites not met */}
        {!allPrerequisitesMet && !isCurrentlyEnabled && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("Cannot Enable Fiscalization")}</AlertTitle>
            <AlertDescription>
              {t("Complete all prerequisites above before enabling FURS fiscalization.")}
            </AlertDescription>
          </Alert>
        )}

        {/* Enable FURS Toggle */}
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="font-medium text-base">{t("Enable FURS Fiscalization")}</FormLabel>
                <FormDescription className="text-xs">
                  {t("Once enabled, all new invoices will be automatically fiscalized with FURS")}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!allPrerequisitesMet && !field.value}
                  className="cursor-pointer"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Warning about disabling */}
        {isCurrentlyEnabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("Warning: Disabling fiscalization will prevent new invoices from being fiscalized.")}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );

  return <>{wrap("enable-toggle", enableContent)}</>;
};
