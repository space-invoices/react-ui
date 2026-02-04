import { Loader2 } from "lucide-react";

import { cn } from "../lib/utils";

type ButtonLoaderProps = {
  className?: string;
};

export default function ButtonLoader({ className }: ButtonLoaderProps) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} role="status" aria-label="Loading" />;
}
