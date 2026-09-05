import { Check } from "lucide-react";
import { cn } from "@/ui/lib/utils";

export function HeaderActionIndicator({
  checked,
  uncheckedClassName,
}: {
  checked: boolean;
  uncheckedClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4 items-center justify-center rounded border",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : (uncheckedClassName ?? "border-muted-foreground bg-background text-muted-foreground"),
      )}
    >
      {checked ? <Check className="size-3.5 text-current" strokeWidth={3} /> : null}
    </span>
  );
}
