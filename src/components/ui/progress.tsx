import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/ui/lib/utils"

function Progress({
  value,
  className,
  ...props
}: ProgressPrimitive.Root.Props & { className?: string }) {
  const normalizedValue = Math.min(Math.max(value ?? 0, 0), 100)

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={normalizedValue}
      className={cn("relative w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <ProgressPrimitive.Track className="block h-full w-full">
        <ProgressPrimitive.Indicator
          className="progress-indicator-shimmer block h-full rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${normalizedValue}%` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
