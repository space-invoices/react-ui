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
import { useUpdateUserFursSettings } from "./furs-settings.hooks";

interface FursOperatorRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  onSaved: () => void;
  t: (key: string) => string;
}

export const FursOperatorRequiredDialog: FC<FursOperatorRequiredDialogProps> = ({
  open,
  onOpenChange,
  entityId,
  onSaved,
  t,
}) => {
  const [operatorTaxNumber, setOperatorTaxNumber] = useState("");
  const [operatorLabel, setOperatorLabel] = useState("");

  const { mutate: updateUserSettings, isPending } = useUpdateUserFursSettings({
    onSuccess: () => {
      setOperatorTaxNumber("");
      setOperatorLabel("");
      onSaved();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!operatorTaxNumber || !operatorLabel) return;
    updateUserSettings({
      entityId,
      data: {
        operator_tax_number: operatorTaxNumber,
        operator_label: operatorLabel,
      },
    });
  };

  const isValid = operatorTaxNumber.trim() !== "" && operatorLabel.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("FURS Operator Settings Required")}</DialogTitle>
          <DialogDescription>
            {t(
              "Your FURS operator information is needed to fiscalize this document. Please enter your operator details.",
            )}
          </DialogDescription>
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
