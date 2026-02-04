// Stub file - TODO: implement properly
import { useEffect, useRef, useState } from "react";

const A4_WIDTH_PX = 794; // A4 width at 96 DPI

export function useA4Scaling(content: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    const updateScale = () => {
      const containerWidth = containerRef.current?.clientWidth || A4_WIDTH_PX;
      const newScale = Math.min(1, containerWidth / A4_WIDTH_PX);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [content]);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight * scale);
    }
  }, [scale]);

  return {
    containerRef,
    contentRef,
    scale,
    contentHeight,
    A4_WIDTH_PX,
  };
}
