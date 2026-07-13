import { AlertCircle } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import type { EslogValidationError } from "./eslog-validation";
import { translateEslogValidationError } from "./eslog-validation";

type EslogSetupErrorsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: EslogValidationError[];
  t: (key: string) => string;
};

export function EslogSetupErrorsDialog({ open, onOpenChange, errors, t }: EslogSetupErrorsDialogProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-destructive" />
            <DialogTitle>{t("Add missing company details")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("This document needs a few company details before it can be issued.")}
          </DialogDescription>
        </DialogHeader>

        <ul className="list-disc space-y-2 pl-5 text-sm">
          {errors.map((error) => (
            <li key={error.field}>{translateEslogValidationError(error, t)}</li>
          ))}
        </ul>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("Review details")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
