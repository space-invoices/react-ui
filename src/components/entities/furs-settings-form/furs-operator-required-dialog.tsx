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
import { useUpdateFursSettings, useUpdateUserFursSettings } from "./furs-settings.hooks";

type RemediationOption = {
  value: string;
  label: string;
};

interface FursOperatorRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  onSaved: (values: { operator_tax_number: string; operator_label: string }) => void;
  t: (key: string) => string;
  saveScope?: "user" | "entity";
  mode?: "document-retry" | "integration-remediation";
  titleOverride?: string;
  descriptionOverride?: string;
  initialValues?: {
    operator_tax_number?: string;
    operator_label?: string;
  };
  premiseOptions?: RemediationOption[];
  deviceOptions?: RemediationOption[];
  selectedPremiseId?: string;
  selectedDeviceId?: string;
  onPremiseChange?: (premiseId: string) => void;
  onDeviceChange?: (deviceId: string) => void;
}

export const FursOperatorRequiredDialog: FC<FursOperatorRequiredDialogProps> = ({
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
  const [operatorTaxNumber, setOperatorTaxNumber] = useState("");
  const [operatorLabel, setOperatorLabel] = useState("");
  const isRemediationMode = mode === "integration-remediation";

  useEffect(() => {
    if (!open) return;
    setOperatorTaxNumber(initialValues?.operator_tax_number || "");
    setOperatorLabel(initialValues?.operator_label || "");
  }, [initialValues?.operator_label, initialValues?.operator_tax_number, open]);

  const handleSuccess = () => {
    const savedValues = {
      operator_tax_number: operatorTaxNumber,
      operator_label: operatorLabel,
    };
    setOperatorTaxNumber("");
    setOperatorLabel("");
    onSaved(savedValues);
  };

  const { mutate: updateUserSettings, isPending: isUserPending } = useUpdateUserFursSettings({
    onSuccess: () => {
      handleSuccess();
    },
  });

  const { mutate: updateEntitySettings, isPending: isEntityPending } = useUpdateFursSettings({
    onSuccess: () => {
      handleSuccess();
    },
  });

  const isPending = isUserPending || isEntityPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!operatorTaxNumber || !operatorLabel) return;

    const payload = {
      operator_tax_number: operatorTaxNumber,
      operator_label: operatorLabel,
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

  const isValid =
    operatorTaxNumber.trim() !== "" &&
    operatorLabel.trim() !== "" &&
    (!isRemediationMode || (selectedPremiseId !== "" && selectedDeviceId !== ""));

  const description = useMemo(() => {
    if (descriptionOverride) return descriptionOverride;
    if (isRemediationMode) {
      return t(
        "You have store integrations that need this information when fiscalization is enabled so fiscalized documents can be issued correctly. Please add the default operator, business premise, and device to use for those integrations.",
      );
    }

    return t(
      "Your FURS operator information is needed to fiscalize this document. Please enter your operator details.",
    );
  }, [descriptionOverride, isRemediationMode, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titleOverride || t("FURS Operator Settings Required")}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="furs-dialog-operator-tax" className="font-medium text-sm">
              {t("Operator Tax Number")}
            </label>
            <Input
              id="furs-dialog-operator-tax"
              placeholder="12345678"
              value={operatorTaxNumber}
              onChange={(e) => setOperatorTaxNumber(e.target.value)}
              className="mt-2 h-10"
            />
          </div>

          <div>
            <label htmlFor="furs-dialog-operator-label" className="font-medium text-sm">
              {t("Operator Label")}
            </label>
            <Input
              id="furs-dialog-operator-label"
              placeholder={t("Your Name")}
              value={operatorLabel}
              onChange={(e) => setOperatorLabel(e.target.value)}
              className="mt-2 h-10"
            />
          </div>

          {isRemediationMode ? (
            <>
              <div>
                <label htmlFor="furs-dialog-business-premise" className="font-medium text-sm">
                  {t("Business Premise")}
                </label>
                <Select
                  value={selectedPremiseId || undefined}
                  onValueChange={(value) => onPremiseChange?.(value ?? "")}
                >
                  <SelectTrigger id="furs-dialog-business-premise" className="mt-2 h-10">
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
                <label htmlFor="furs-dialog-electronic-device" className="font-medium text-sm">
                  {t("Electronic Device")}
                </label>
                <Select value={selectedDeviceId || undefined} onValueChange={(value) => onDeviceChange?.(value ?? "")}>
                  <SelectTrigger id="furs-dialog-electronic-device" className="mt-2 h-10">
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
