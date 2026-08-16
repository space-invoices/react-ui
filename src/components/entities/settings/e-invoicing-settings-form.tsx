import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";
import { Switch } from "@/ui/components/ui/switch";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

export type EInvoicingEnrollmentState =
  | "not_enabled"
  | "missing_entity_data"
  | "enrollment_pending"
  | "verification_required"
  | "verification_in_progress"
  | "verified"
  | "reverification_required"
  | "rejected"
  | "provider_error";

export type EInvoicingSettingsFormData = {
  enabled: boolean;
  auto_send: boolean;
  enrollment: {
    state: EInvoicingEnrollmentState;
    sending_allowed: boolean;
    missing_fields: string[];
    verification_url?: string | null;
    provider_error?: string | null;
  };
};

export type EInvoicingSettingsFormProps = {
  settings?: EInvoicingSettingsFormData;
  isLoading?: boolean;
  isBusy?: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onAutoSendChange: (autoSend: boolean) => void;
  onRefreshEnrollment: () => void;
  onCreateVerificationLink: () => void;
} & ComponentTranslationProps;

const translations = {
  en: {
    "Enable Peppol sending": "Enable Peppol sending",
    "Create or link the entity enrollment and show the verification state.":
      "Create or link the entity enrollment and show the verification state.",
    Loading: "Loading...",
    Refresh: "Refresh",
    Verify: "Verify",
    "Entity details required": "Entity details required",
    "Auto-send invoices": "Auto-send invoices",
    "Automatically send supported documents when the entity is verified and the customer has a Peppol address.":
      "Automatically send supported documents when the entity is verified and the customer has a Peppol address.",
    "Not enabled": "Not enabled",
    "Missing entity data": "Missing entity data",
    "Enrollment pending": "Enrollment pending",
    "Verification required": "Verification required",
    "Verification in progress": "Verification in progress",
    Verified: "Verified",
    "Reverification required": "Reverification required",
    Rejected: "Rejected",
    "Provider error": "Provider error",
    "Enable e-invoicing to start enrollment.": "Enable e-invoicing to start enrollment.",
    "Complete the required entity details before enrollment can continue.":
      "Complete the required entity details before enrollment can continue.",
    "Enrollment is being created.": "Enrollment is being created.",
    "Open the verification link to complete the required checks.":
      "Open the verification link to complete the required checks.",
    "Verification has started. Refresh the status after completing the checks.":
      "Verification has started. Refresh the status after completing the checks.",
    "This entity can send invoices and credit notes over Peppol.":
      "This entity can send invoices and credit notes over Peppol.",
    "Entity details changed and verification must be completed again.":
      "Entity details changed and verification must be completed again.",
    "Verification was rejected. Contact support to resolve the enrollment.":
      "Verification was rejected. Contact support to resolve the enrollment.",
    "The enrollment could not be synced. Try refreshing or contact support.":
      "The enrollment could not be synced. Try refreshing or contact support.",
  },
} as const;

function getEnrollmentTone(state: EInvoicingEnrollmentState) {
  if (state === "verified") return "success";
  if (state === "not_enabled" || state === "enrollment_pending" || state === "verification_in_progress") return "info";
  return "warning";
}

function getStateLabel(state: EInvoicingEnrollmentState) {
  switch (state) {
    case "not_enabled":
      return "Not enabled";
    case "missing_entity_data":
      return "Missing entity data";
    case "enrollment_pending":
      return "Enrollment pending";
    case "verification_required":
      return "Verification required";
    case "verification_in_progress":
      return "Verification in progress";
    case "verified":
      return "Verified";
    case "reverification_required":
      return "Reverification required";
    case "rejected":
      return "Rejected";
    case "provider_error":
      return "Provider error";
  }
}

function getStateDescription(state: EInvoicingEnrollmentState) {
  switch (state) {
    case "not_enabled":
      return "Enable e-invoicing to start enrollment.";
    case "missing_entity_data":
      return "Complete the required entity details before enrollment can continue.";
    case "enrollment_pending":
      return "Enrollment is being created.";
    case "verification_required":
      return "Open the verification link to complete the required checks.";
    case "verification_in_progress":
      return "Verification has started. Refresh the status after completing the checks.";
    case "verified":
      return "This entity can send invoices and credit notes over Peppol.";
    case "reverification_required":
      return "Entity details changed and verification must be completed again.";
    case "rejected":
      return "Verification was rejected. Contact support to resolve the enrollment.";
    case "provider_error":
      return "The enrollment could not be synced. Try refreshing or contact support.";
  }
}

function getMissingFieldLabel(field: string) {
  switch (field) {
    case "name":
      return "Entity name";
    case "address":
      return "Address";
    case "post_code":
      return "Post code";
    case "city":
      return "City";
    case "country_code":
      return "Country";
    case "provider_supported_country":
      return "Supported country";
    case "e_invoicing.sender_identifier":
      return "Peppol sender identifier";
    default:
      return field;
  }
}

export function EInvoicingSettingsForm({
  settings,
  isLoading = false,
  isBusy = false,
  onEnabledChange,
  onAutoSendChange,
  onRefreshEnrollment,
  onCreateVerificationLink,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
}: EInvoicingSettingsFormProps) {
  const t = createTranslation({ t: translateFn, namespace, locale, translationLocale, translations });
  const enrollment = settings?.enrollment;
  const state = enrollment?.state ?? "not_enabled";
  const tone = getEnrollmentTone(state);
  const showRefreshAction =
    settings?.enabled === true &&
    (state === "enrollment_pending" ||
      state === "verification_required" ||
      state === "verification_in_progress" ||
      state === "reverification_required" ||
      state === "provider_error");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-1">
          <Label htmlFor="e-invoicing-enabled" className="text-base">
            {t("Enable Peppol sending")}
          </Label>
          <p className="text-muted-foreground text-sm">
            {t("Create or link the entity enrollment and show the verification state.")}
          </p>
        </div>
        <Switch
          id="e-invoicing-enabled"
          checked={settings?.enabled === true}
          disabled={isBusy}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border p-4 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("Loading")}
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {state === "verified" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
                <p className="font-medium">{t(getStateLabel(state))}</p>
                <Badge variant={tone === "success" ? "default" : "secondary"}>{t(getStateLabel(state))}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">{t(getStateDescription(state))}</p>
            </div>
            <div className="flex gap-2">
              {showRefreshAction && (
                <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onRefreshEnrollment}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t("Refresh")}
                </Button>
              )}
              {(state === "verification_required" ||
                state === "verification_in_progress" ||
                state === "reverification_required") && (
                <Button type="button" size="sm" disabled={isBusy} onClick={onCreateVerificationLink}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("Verify")}
                </Button>
              )}
            </div>
          </div>

          {enrollment?.missing_fields?.length ? (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("Entity details required")}</AlertTitle>
              <AlertDescription>
                {enrollment.missing_fields.map((field) => t(getMissingFieldLabel(field))).join(", ")}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-1">
          <Label htmlFor="e-invoicing-auto-send" className="text-base">
            {t("Auto-send invoices")}
          </Label>
          <p className="text-muted-foreground text-sm">
            {t(
              "Automatically send supported documents when the entity is verified and the customer has a Peppol address.",
            )}
          </p>
        </div>
        <Switch
          id="e-invoicing-auto-send"
          checked={settings?.auto_send === true}
          disabled={isBusy || state !== "verified"}
          onCheckedChange={onAutoSendChange}
        />
      </div>
    </div>
  );
}
