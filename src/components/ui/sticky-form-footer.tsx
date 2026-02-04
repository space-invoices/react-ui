import { Button } from "@/ui/components/ui/button";
import ButtonLoader from "../button-loader";
import { cn } from "@/ui/lib/utils";

type SecondaryAction = {
  label: string;
  onClick: () => void;
  isPending?: boolean;
};

type StickyFormFooterProps = {
  formId: string;
  isPending: boolean;
  isDirty: boolean;
  label: string;
  onSubmit?: () => void;
  secondaryAction?: SecondaryAction;
  className?: string;
};

export function StickyFormFooter({
  formId,
  isPending,
  isDirty,
  label,
  onSubmit,
  secondaryAction,
  className,
}: StickyFormFooterProps) {
  // If onSubmit is provided, use onClick, otherwise use form attribute for native form submission
  const buttonProps = onSubmit
    ? { type: "button" as const, onClick: onSubmit }
    : { type: "submit" as const, form: formId };

  return (
    <div className={cn("sticky bottom-0 z-10 border-t bg-sidebar px-4 py-3", className)}>
      <div className="flex gap-2">
        <Button {...buttonProps} className="cursor-pointer px-8" disabled={isPending || !isDirty}>
          {isPending ? <ButtonLoader /> : label}
        </Button>
        {secondaryAction && (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer px-8"
            disabled={secondaryAction.isPending || !isDirty}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.isPending ? <ButtonLoader /> : secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
