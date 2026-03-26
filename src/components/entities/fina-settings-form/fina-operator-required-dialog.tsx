import { type FC, useState } from "react";
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
import { useUpdateFinaSettings, useUpdateUserFinaSettings } from "./fina-settings.hooks";

interface FinaOperatorRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  onSaved: () => void;
  t: (key: string) => string;
  saveScope?: "user" | "entity";
}

export const FinaOperatorRequiredDialog: FC<FinaOperatorRequiredDialogProps> = ({
  open,
  onOpenChange,
  entityId,
  onSaved,
  t,
  saveScope = "user",
}) => {
  const [operatorOib, setOperatorOib] = useState("");
  const [operatorLabel, setOperatorLabel] = useState("");

  const handleSuccess = () => {
    setOperatorOib("");
    setOperatorLabel("");
    onSaved();
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

  const handleSubmit = (e: React.FormEvent) => {
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
  const isValid = /^\d{11}$/.test(operatorOib);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("FINA Operator Settings Required")}</DialogTitle>
          <DialogDescription>
            {t(
              "Your FINA operator information is needed to fiscalize this document. Please enter your operator details.",
            )}
          </DialogDescription>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !isValid}>
              {isPending ? t("Saving...") : t("Save & Retry")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
