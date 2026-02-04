import { cn } from "@/ui/lib/utils";
import { Spinner } from "./spinner";

// Re-export Spinner as LoadingSpinner for backwards compatibility
export { Spinner as LoadingSpinner };

// Page-level loading spinner with centered layout
function PageLoadingSpinner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)} {...props}>
      <Spinner className="size-6" />
    </div>
  );
}

export { PageLoadingSpinner };
