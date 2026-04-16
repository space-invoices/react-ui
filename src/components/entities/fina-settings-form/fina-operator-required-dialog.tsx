import { type FC, type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import { Input } from "@/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { useUpdateFinaSettings, useUpdateUserFinaSettings } from "./fina-settings.hooks";

type RemediationOption = {
  value: string;
  label: string;
};

interface FinaOperatorRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  onSaved: (values: { operator_oib: string; operator_label?: string }) => void;
  t: (key: string) => string;
  saveScope?: "user" | "entity";
  mode?: "document-retry" | "integration-remediation";
  titleOverride?: string;
  descriptionOverride?: string;
  initialValues?: {
    operator_oib?: string;
    operator_label?: string;
  };
  premiseOptions?: RemediationOption[];
  deviceOptions?: RemediationOption[];
  selectedPremiseId?: string;
  selectedDeviceId?: string;
  onPremiseChange?: (premiseId: string) => void;
  onDeviceChange?: (deviceId: string) => void;
}

export const FinaOperatorRequiredDialog: FC<FinaOperatorRequiredDialogProps> = ({
  open,
  onOpenChange,
  entityId,
  onSaved,
  t,
  saveScope = "user",
  mode = "document-retry",
  titleOverride,
  descriptionOverride,
  initialValues,
  premiseOptions = [],
  deviceOptions = [],
  selectedPremiseId = "",
  selectedDeviceId = "",
  onPremiseChange,
  onDeviceChange,
}) => {
  const [operatorOib, setOperatorOib] = useState("");
  const [operatorLabel, setOperatorLabel] = useState("");
  const isRemediationMode = mode === "integration-remediation";

  useEffect(() => {
    if (!open) return;
    setOperatorOib(initialValues?.operator_oib || "");
    setOperatorLabel(initialValues?.operator_label || "");
  }, [initialValues?.operator_label, initialValues?.operator_oib, open]);

  const handleSuccess = () => {
    const savedValues = {
      operator_oib: operatorOib,
      operator_label: operatorLabel || undefined,
    };
    setOperatorOib("");
    setOperatorLabel("");
    onSaved(savedValues);
  };

  const { mutate: updateUserSettings, isPending: isUserPending } = useUpdateUserFinaSettings({
    onSuccess: () => {
      handleSuccess();
    },
  });

  const { mutate: updateEntitySettings, isPending: isEntityPending } = useUpdateFinaSettings({
    onSuccess: () => {
      handleSuccess();
    },
  });

  const isPending = isUserPending || isEntityPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!operatorOib) return;

    const payload = {
      operator_oib: operatorOib,
      operator_label: operatorLabel || undefined,
    };

    if (saveScope === "entity") {
      updateEntitySettings({
        entityId,
        data: payload,
      });
      return;
    }

    updateUserSettings({
      entityId,
      data: payload,
    });
  };

  const oibError = operatorOib !== "" && !/^\d{11}$/.test(operatorOib);
  const isValid =
    /^\d{11}$/.test(operatorOib) && (!isRemediationMode || (selectedPremiseId !== "" && selectedDeviceId !== ""));

  const description = useMemo(() => {
    if (descriptionOverride) return descriptionOverride;
    if (isRemediationMode) {
      return t(
        "You have store integrations that need this information when fiscalization is enabled so fiscalized documents can be issued correctly. Please add the default operator, business premise, and device to use for those integrations.",
      );
    }

    return t(
      "Your FINA operator information is needed to fiscalize this document. Please enter your operator details.",
    );
  }, [descriptionOverride, isRemediationMode, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titleOverride || t("FINA Operator Settings Required")}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fina-dialog-operator-oib" className="font-medium text-sm">
              {t("Operator OIB")}
            </label>
            <Input
              id="fina-dialog-operator-oib"
              placeholder="12345678901"
              value={operatorOib}
              onChange={(e) => setOperatorOib(e.target.value.replace(/[^0-9]/g, ""))}
              className={`mt-2 h-10${oibError ? "border-destructive" : ""}`}
              maxLength={11}
            />
            {oibError && <p className="mt-1 text-destructive text-xs">{t("OIB must be exactly 11 digits")}</p>}
          </div>

          <div>
            <label htmlFor="fina-dialog-operator-label" className="font-medium text-sm">
              {t("Operator Label")}
            </label>
            <Input
              id="fina-dialog-operator-label"
              placeholder={t("e.g. Cashier 1")}
              value={operatorLabel}
              onChange={(e) => setOperatorLabel(e.target.value)}
              className="mt-2 h-10"
            />
          </div>

          {isRemediationMode ? (
            <>
              <div>
                <label htmlFor="fina-dialog-business-premise" className="font-medium text-sm">
                  {t("Business Premise")}
                </label>
                <Select
                  value={selectedPremiseId || undefined}
                  onValueChange={(value) => onPremiseChange?.(value ?? "")}
                >
                  <SelectTrigger id="fina-dialog-business-premise" className="mt-2 h-10">
                    <SelectValue placeholder={t("Select business premise")} />
                  </SelectTrigger>
                  <SelectContent>
                    {premiseOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="fina-dialog-electronic-device" className="font-medium text-sm">
                  {t("Electronic Device")}
                </label>
                <Select value={selectedDeviceId || undefined} onValueChange={(value) => onDeviceChange?.(value ?? "")}>
                  <SelectTrigger id="fina-dialog-electronic-device" className="mt-2 h-10">
                    <SelectValue placeholder={t("Select electronic device")} />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-muted-foreground text-xs">
                {t("All integrations will use this premise and device after fiscalization is enabled")}
              </p>
            </>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !isValid}>
              {isPending
                ? t("Saving...")
                : isRemediationMode
                  ? t("Save, update integrations, and enable")
                  : t("Save & Retry")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
