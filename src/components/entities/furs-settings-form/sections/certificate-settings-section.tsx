import type { Entity, GetFursSettings200Response } from "@spaceinvoices/js-sdk";
import { AlertCircle, CheckCircle2, ShieldCheck, Upload, XCircle } from "lucide-react";
import { type FC, type ReactNode, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { cn } from "@/ui/lib/utils";
import { useUploadFursCertificate } from "../furs-settings.hooks";
import type { SectionType } from "../furs-settings-form";

interface CertificateSettingsSectionProps {
  entity: Entity;
  fursSettings?: GetFursSettings200Response;
  t: (key: string) => string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  wrapSection?: (section: SectionType, content: ReactNode) => ReactNode;
}

export const CertificateSettingsSection: FC<CertificateSettingsSectionProps> = ({
  entity,
  fursSettings,
  t,
  onSuccess,
  onError,
  wrapSection,
}) => {
  const wrap = (section: SectionType, content: ReactNode) => (wrapSection ? wrapSection(section, content) : content);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);

  const hasCertificate = fursSettings?.has_certificate || false;

  // Initialize form visibility based on whether certificate exists
  // If certificate already exists on mount, hide the upload form
  useEffect(() => {
    if (fursSettings && hasCertificate) {
      setShowUploadForm(false);
    }
  }, [fursSettings, hasCertificate]);

  const {
    mutate: uploadCertificate,
    isPending,
    isSuccess: uploadSuccess,
  } = useUploadFursCertificate({
    onSuccess: () => {
      setCertificateFile(null);
      setPassphrase("");
      setShowUploadForm(false);
      onSuccess?.();
    },
    onError: (error) => {
      const apiMsg = (error as any)?.data?.message || (error as any)?.message;
      if (typeof apiMsg === "string") {
        if (apiMsg.includes("certificate") && apiMsg.includes("mode")) {
          onError?.(new Error(t(apiMsg)));
          return;
        }
        if (apiMsg.includes("Invalid certificate passphrase")) {
          onError?.(new Error(t("Invalid certificate passphrase. Please check your passphrase and try again.")));
          return;
        }
        const taxMatch = apiMsg.match(/Certificate tax number .+ does not match entity tax number/);
        if (taxMatch) {
          onError?.(
            new Error(
              t(
                "Certificate tax number does not match entity tax number. Please upload a certificate for this entity.",
              ),
            ),
          );
          return;
        }
      }
      onError?.(error);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file extension (P12/PFX)
      const validExtensions = [".p12", ".pfx"];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

      if (!validExtensions.includes(fileExtension)) {
        onError?.(new Error(t("Invalid file type. Please upload a .p12 or .pfx certificate file.")));
        return;
      }

      setCertificateFile(file);
    }
  };

  const handleUpload = () => {
    if (!certificateFile || !passphrase) {
      onError?.(new Error(t("Please select a certificate file and enter the passphrase")));
      return;
    }

    uploadCertificate({
      entityId: entity.id,
      file: certificateFile,
      passphrase: passphrase.trim(), // Trim whitespace just in case
    });
  };

  const certificateStatus = fursSettings?.certificate_status || "missing";

  // Show upload form if: no certificate exists (and didn't just upload) OR user clicked "Change Certificate"
  const shouldShowUploadForm = (!hasCertificate && !uploadSuccess) || showUploadForm;

  // Status display configuration with dark mode support
  const statusConfig = {
    valid: {
      icon: CheckCircle2,
      variant: "default" as const,
      iconColor: "text-green-600 dark:text-green-400",
      label: t("Valid"),
    },
    expiring_soon: {
      icon: AlertCircle,
      variant: "default" as const,
      iconColor: "text-yellow-600 dark:text-yellow-400",
      label: t("Expiring Soon"),
    },
    expired: {
      icon: XCircle,
      variant: "destructive" as const,
      iconColor: "text-red-600 dark:text-red-400",
      label: t("Expired"),
    },
    missing: {
      icon: AlertCircle,
      variant: "default" as const,
      iconColor: "text-muted-foreground",
      label: t("Missing"),
    },
  };

  const currentStatus = statusConfig[certificateStatus];
  const StatusIcon = currentStatus.icon;

  const certificateContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{t("Digital Certificate")}</h3>
          <p className="text-muted-foreground text-sm">{t("Upload your FURS digital certificate")}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Upload success - Show briefly while settings refetch */}
        {!hasCertificate && uploadSuccess && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>{t("Certificate uploaded successfully")}</AlertTitle>
              <AlertDescription>{t("Loading certificate details...")}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Certificate Status - Show when certificate exists */}
        {hasCertificate && (
          <div className="space-y-4">
            <Alert variant={currentStatus.variant}>
              <StatusIcon className={cn("h-4 w-4", currentStatus.iconColor)} />
              <AlertTitle>Certificate Status: {currentStatus.label}</AlertTitle>
              <AlertDescription className="space-y-2">
                {fursSettings?.certificate_expiry && (
                  <div className="text-sm">
                    {t("Expires")}: {new Date(fursSettings.certificate_expiry).toLocaleDateString()}
                  </div>
                )}
                {(fursSettings as any)?.certificate_issuer && (
                  <div className="text-muted-foreground text-sm">
                    {t("Issuer")}: {(fursSettings as any).certificate_issuer}
                  </div>
                )}
                {(fursSettings as any)?.certificate_subject && (
                  <div className="text-muted-foreground text-sm">
                    {t("Subject")}: {(fursSettings as any).certificate_subject}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Change Certificate Button */}
            {!showUploadForm && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploadForm(true)}
                className="w-full cursor-pointer"
              >
                <Upload className="mr-2 h-4 w-4" />
                {t("Change Certificate")}
              </Button>
            )}
          </div>
        )}

        {/* Upload Form - Show when no certificate OR user clicked "Change Certificate" */}
        {shouldShowUploadForm && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="certificate-file">{t("P12/PFX Certificate File")}</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="certificate-file"
                  type="file"
                  accept=".p12,.pfx"
                  onChange={handleFileChange}
                  disabled={isPending}
                  className="flex-1"
                />
                {certificateFile && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              </div>
              {certificateFile && (
                <p className="text-muted-foreground text-sm">
                  {t("Selected")}: {certificateFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passphrase">{t("Certificate Passphrase")}</Label>
              <Input
                id="passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                disabled={isPending}
                placeholder={t("Enter certificate passphrase")}
              />
            </div>

            <div className="flex gap-3">
              {hasCertificate && showUploadForm && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowUploadForm(false);
                    setCertificateFile(null);
                    setPassphrase("");
                  }}
                  disabled={isPending}
                  className="flex-1 cursor-pointer"
                >
                  {t("Cancel")}
                </Button>
              )}
              <Button
                type="button"
                onClick={handleUpload}
                disabled={!certificateFile || !passphrase || isPending}
                className={cn(hasCertificate && showUploadForm ? "flex-1" : "w-full", "cursor-pointer")}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isPending ? t("Loading...") : hasCertificate ? t("Upload New Certificate") : t("Upload Certificate")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return <>{wrap("certificate-upload", certificateContent)}</>;
};
