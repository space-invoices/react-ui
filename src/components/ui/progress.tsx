import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/ui/lib/utils"

function Progress({
  value,
  className,
  ...props
}: ProgressPrimitive.Root.Props & { className?: string }) {
  const normalizedValue = Math.min(Math.max(value ?? 0, 0), 100)
  const visibleWidth = normalizedValue > 0 ? Math.max(normalizedValue, 3) : 0

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={normalizedValue}
      className={cn("relative w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <ProgressPrimitive.Track data-slot="progress-track" className="block h-full w-full">
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="progress-indicator-shimmer block h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${visibleWidth}%` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
