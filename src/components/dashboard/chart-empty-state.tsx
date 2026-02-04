"use client";

import type { ReactNode } from "react";

type ChartEmptyStateProps = {
  /** The chart to render (will be muted) */
  children: ReactNode;
  /** Label to show over the chart */
  label?: string;
  /** Height of the container */
  className?: string;
};

/**
 * Empty state wrapper that shows a muted chart with an overlay label
 */
export function ChartEmptyState({ children, label = "No data", className }: ChartEmptyStateProps) {
  return (
    <div className={`relative ${className || ""}`}>
      {/* Muted chart */}
      <div className="pointer-events-none opacity-30 grayscale">{children}</div>

      {/* Overlay label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-md bg-muted/80 px-3 py-1.5 text-muted-foreground text-sm">{label}</div>
      </div>
    </div>
  );
}
