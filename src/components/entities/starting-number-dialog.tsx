import { Hash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import { DropdownMenuItem } from "@/ui/components/ui/dropdown-menu";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import {
  getFiscalStartingNumberError,
  nullableFiscalStartingNumber,
  sanitizeFiscalStartingNumberInput,
} from "./fiscal-starting-number";

export type StartingNumberTarget =
  | { type: "premise"; id: string; label: string; current: number | null | undefined }
  | { type: "device"; id: string; premiseId: string; label: string; current: number | null | undefined };

/**
 * Dropdown "Set Starting Number" entry — clickable when editable, otherwise disabled with
 * a lock tooltip. Shared by the FURS and FINA premises-management sections.
 */
export function StartingNumberMenuItem({
  label,
  canEdit,
  lockedMessage,
  onEdit,
}: {
  label: string;
  canEdit: boolean;
  lockedMessage: string;
  onEdit: () => void;
}) {
  if (canEdit) {
    return (
      <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
        <Hash className="mr-2 h-4 w-4" />
        {label}
      </DropdownMenuItem>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <DropdownMenuItem disabled className="cursor-not-allowed">
            <Hash className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        </div>
      </TooltipTrigger>
      <TooltipContent>{lockedMessage}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Inline device "set starting number" hash button — clickable when editable, otherwise
 * disabled with a lock tooltip. Shared by the FURS and FINA sections.
 */
export function DeviceStartingNumberButton({
  canEdit,
  title,
  lockedMessage,
  onEdit,
}: {
  canEdit: boolean;
  title: string;
  lockedMessage: string;
  onEdit: () => void;
}) {
  if (canEdit) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="ml-1 cursor-pointer text-muted-foreground hover:text-foreground"
        title={title}
      >
        <Hash className="h-3 w-3" />
      </button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ml-1 inline-flex">
          <button type="button" disabled className="cursor-not-allowed text-muted-foreground opacity-50">
            <Hash className="h-3 w-3" />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{lockedMessage}</TooltipContent>
    </Tooltip>
  );
}

type StartingNumberInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  t: (key: string) => string;
  "data-testid"?: string;
};

export function StartingNumberInput({ id, value, onChange, t, "data-testid": testId }: StartingNumberInputProps) {
  const error = getFiscalStartingNumberError(value);
  const errorId = `${id}-error`;

  return (
    <>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(sanitizeFiscalStartingNumberInput(event.target.value))}
        data-testid={testId}
      />
      {error && (
        <p id={errorId} className="text-destructive text-xs" role="alert">
          {t(error)}
        </p>
      )}
    </>
  );
}

type StartingNumberDialogProps = {
  target: StartingNumberTarget | null;
  onOpenChange: (open: boolean) => void;
  onSave: (value: number | null, target: StartingNumberTarget) => void;
  isPending: boolean;
  t: (key: string) => string;
  inputTestId?: string;
  saveTestId?: string;
};

export function StartingNumberDialog({
  target,
  onOpenChange,
  onSave,
  isPending,
  t,
  inputTestId,
  saveTestId,
}: StartingNumberDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    // Show the actual stored value; an unset (null) starting number stays empty so
    // saving without editing does not silently persist "1".
    setValue(target?.current == null ? "" : String(target.current));
  }, [target]);

  const error = useMemo(() => getFiscalStartingNumberError(value), [value]);

  const handleSave = () => {
    if (!target || error) {
      return;
    }

    onSave(nullableFiscalStartingNumber(value), target);
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Set Starting Number")}</DialogTitle>
          <DialogDescription>
            {t("Set this before issuing invoices for the selected fiscal sequence. Leave empty to clear it.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="startingNumberTarget">{t("Fiscal Sequence")}</Label>
            <Input id="startingNumberTarget" value={target?.label ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startingNumberValue">{t("Starting Number")}</Label>
            <StartingNumberInput
              id="startingNumberValue"
              value={value}
              onChange={setValue}
              t={t}
              data-testid={inputTestId}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="cursor-pointer"
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !!error}
            className="cursor-pointer"
            data-testid={saveTestId}
          >
            {isPending ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
