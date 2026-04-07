import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for A4 document scaling
 * Handles responsive scaling of A4-sized documents to fit container width
 *
 * @returns Object containing the container ref and responsive A4 width scale
 */
export function useA4Scaling(_htmlContent?: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // A4 width in pixels at 96 DPI (210mm)
  const A4_WIDTH_PX = 794;

  // Observe container width and calculate scale
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // Subtract padding
        const availableWidth = width - 32;
        // Round to 2 decimal places and only update if significant change (>1%)
        const newScale = Math.round((availableWidth / A4_WIDTH_PX) * 100) / 100;
        setScale((prev) => (Math.abs(prev - newScale) > 0.01 ? newScale : prev));
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return {
    containerRef,
    scale,
    A4_WIDTH_PX,
  };
}
