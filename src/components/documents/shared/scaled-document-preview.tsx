"use client";

import { type FC, useEffect, useRef, useState } from "react";

interface ScaledDocumentPreviewProps {
  htmlContent: string;
  scale: number;
  contentHeight: number | null;
  A4_WIDTH_PX: number;
  contentRef: React.RefObject<HTMLDivElement | null>;
  entityUpdatedAt?: Date | null;
  containedScroll?: boolean;
}

/** Extract @font-face rules from CSS so they can be hoisted to the document head */
const FONT_FACE_RE = /@font-face\s*\{[^}]*\}/g;

/**
 * Hoist @font-face rules from HTML <style> into the document <head>.
 * Shadow DOM isolates styles, but @font-face must be at the document level to load reliably.
 * Returns the HTML with @font-face rules removed from inline <style>.
 */
function hoistFontFaces(html: string): string {
  // Find all <style> tags and extract @font-face rules
  const styleTagRe = /<style>([\s\S]*?)<\/style>/gi;
  let fontFaceCss = "";
  const cleanedHtml = html.replace(styleTagRe, (_match, cssContent: string) => {
    const fontFaces = cssContent.match(FONT_FACE_RE);
    if (fontFaces) {
      fontFaceCss += fontFaces.join("\n");
    }
    const remaining = cssContent.replace(FONT_FACE_RE, "");
    return `<style>${remaining}</style>`;
  });

  if (fontFaceCss) {
    const id = "document-preview-fonts";
    let existing = document.getElementById(id);
    if (!existing) {
      existing = document.createElement("style");
      existing.id = id;
      document.head.appendChild(existing);
    }
    existing.textContent = fontFaceCss;
  }

  return cleanedHtml;
}

/**
 * Scaled Document Preview Component
 *
 * Renders HTML content in a Shadow DOM with A4 scaling applied using CSS transforms.
 * Uses Shadow DOM to completely isolate template CSS from the parent page.
 * @font-face rules are hoisted to document <head> for reliable font loading.
 */
export const ScaledDocumentPreview: FC<ScaledDocumentPreviewProps> = ({
  htmlContent,
  scale,
  A4_WIDTH_PX,
  containedScroll = false,
}) => {
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  // A4 height in pixels at 96 DPI (297mm)
  const A4_HEIGHT_PX = 1123;
  const [contentHeight, setContentHeight] = useState<number>(A4_HEIGHT_PX);

  useEffect(() => {
    const host = shadowHostRef.current;
    if (!host) return;

    // Create shadow root only once
    if (!shadowRootRef.current) {
      shadowRootRef.current = host.attachShadow({ mode: "open" });
    }

    const shadowRoot = shadowRootRef.current;
    shadowRoot.innerHTML = hoistFontFaces(htmlContent);

    // Measure content height after render (wait for fonts to load)
    const measureHeight = () => {
      const firstChild = shadowRoot.firstElementChild as HTMLElement;
      if (firstChild) {
        // Ensure minimum A4 page height
        setContentHeight(Math.max(firstChild.scrollHeight, A4_HEIGHT_PX));
      }
    };

    setTimeout(measureHeight, 100);
  }, [htmlContent]);

  const scaledPage = (
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
          minHeight: contentHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: "white",
        }}
      />
    </div>
  );

  if (containedScroll) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-lg border bg-neutral-100 p-4">
        <div className="min-h-0 flex-1 overflow-y-auto">{scaledPage}</div>
      </div>
    );
  }

  return <div className="rounded-lg border bg-neutral-100 p-4">{scaledPage}</div>;
};
