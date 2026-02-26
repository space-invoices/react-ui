import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/ui/lib/utils"

function Progress({
  value,
  className,
  ...props
}: ProgressPrimitive.Root.Props & { className?: string }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("relative w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <ProgressPrimitive.Track>
        <ProgressPrimitive.Indicator
          className="h-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${value ?? 0}%` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
