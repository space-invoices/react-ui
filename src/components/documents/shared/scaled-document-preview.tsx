"use client";

import { type FC, useEffect, useRef, useState } from "react";

interface ScaledDocumentPreviewProps {
  htmlContent: string;
  scale: number;
  contentHeight: number | null;
  A4_WIDTH_PX: number;
  contentRef: React.RefObject<HTMLDivElement | null>;
  entityUpdatedAt?: Date | null;
}

/**
 * Scaled Document Preview Component
 *
 * Renders HTML content in a Shadow DOM with A4 scaling applied using CSS transforms.
 * Uses Shadow DOM to completely isolate template CSS from the parent page.
 */
export const ScaledDocumentPreview: FC<ScaledDocumentPreviewProps> = ({ htmlContent, scale, A4_WIDTH_PX }) => {
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const [contentHeight, setContentHeight] = useState<number>(1123); // A4 height default

  useEffect(() => {
    const host = shadowHostRef.current;
    if (!host) return;

    // Create shadow root only once
    if (!shadowRootRef.current) {
      shadowRootRef.current = host.attachShadow({ mode: "open" });
    }

    const shadowRoot = shadowRootRef.current;
    shadowRoot.innerHTML = htmlContent;

    // Measure content height after render
    const measureHeight = () => {
      const firstChild = shadowRoot.firstElementChild as HTMLElement;
      if (firstChild) {
        setContentHeight(firstChild.scrollHeight || 1123);
      }
    };

    setTimeout(measureHeight, 50);
  }, [htmlContent]);

  return (
    <div className="rounded-lg border bg-neutral-100 p-4">
      <div
        style={{
          width: A4_WIDTH_PX * scale,
          height: contentHeight * scale,
          margin: "0 auto",
          overflow: "hidden",
        }}
      >
        <div
          ref={shadowHostRef}
          style={{
            width: A4_WIDTH_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: "white",
          }}
        />
      </div>
    </div>
  );
};
