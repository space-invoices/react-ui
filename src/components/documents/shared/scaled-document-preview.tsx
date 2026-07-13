"use client";

import { type FC, useEffect, useRef, useState } from "react";

interface ScaledDocumentPreviewProps {
  htmlContent: string;
  scale: number;
  A4_WIDTH_PX: number;
  containedScroll?: boolean;
}

/** Extract @font-face rules from CSS so they can be hoisted to the document head */
const FONT_FACE_RE = /@font-face\s*\{[^}]*\}/g;
const FONT_FAMILY_RE = /font-family\s*:\s*['"]?([^;'"}]+)['"]?/i;
const FONT_STYLE_RE = /font-style\s*:\s*([^;"}]+)/i;
const FONT_WEIGHT_RE = /font-weight\s*:\s*([^;"}]+)/i;
const FONT_SRC_RE = /src\s*:\s*([^;}]+)/i;
const FONT_URL_RE = /url\((['"]?)([^'")]+)\1\)/i;

const loadedPreviewFontKeys = new Set<string>();
const loadingPreviewFonts = new Map<string, Promise<void>>();

type PreviewFontFace = {
  family: string;
  source: string;
  style: string;
  weight: string;
  url?: string;
};

function extractFontFaceBlocks(html: string): string[] {
  const styleTagRe = /<style>([\s\S]*?)<\/style>/gi;
  const blocks: string[] = [];

  html.replace(styleTagRe, (_match, cssContent: string) => {
    const fontFaces = cssContent.match(FONT_FACE_RE);
    if (fontFaces) {
      blocks.push(...fontFaces);
    }
    return _match;
  });

  return blocks;
}

function decodeHtmlEntities(value: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function parsePreviewFontFace(block: string): PreviewFontFace | null {
  const family = block.match(FONT_FAMILY_RE)?.[1]?.trim();
  const source = block.match(FONT_SRC_RE)?.[1]?.trim();

  if (!family || !source) return null;

  const decodedSource = decodeHtmlEntities(source);
  return {
    family,
    source: decodedSource,
    style: block.match(FONT_STYLE_RE)?.[1]?.trim() || "normal",
    weight: block.match(FONT_WEIGHT_RE)?.[1]?.trim() || "400",
    url: decodedSource.match(FONT_URL_RE)?.[2],
  };
}

function ensureFontPreload(url: string): void {
  const existing = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[data-document-preview-font="true"]'),
  );
  if (existing.some((link) => link.href === url)) return;

  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "font";
  preload.type = "font/ttf";
  preload.crossOrigin = "anonymous";
  preload.href = url;
  preload.dataset.documentPreviewFont = "true";
  document.head.appendChild(preload);
}

async function loadPreviewFonts(html: string): Promise<void> {
  if (typeof FontFace === "undefined" || !document.fonts) return;

  const fontFaces = extractFontFaceBlocks(html)
    .map(parsePreviewFontFace)
    .filter((face): face is PreviewFontFace => !!face);

  await Promise.all(
    fontFaces.map(async ({ family, source, style, weight, url }) => {
      const key = `${family}:${style}:${weight}:${source}`;
      if (loadedPreviewFontKeys.has(key)) return;

      const existingLoad = loadingPreviewFonts.get(key);
      if (existingLoad) {
        await existingLoad;
        return;
      }

      if (url) {
        ensureFontPreload(url);
      }

      const load = new FontFace(family, source, { style, weight, display: "block" })
        .load()
        .then((fontFace) => {
          document.fonts.add(fontFace);
          loadedPreviewFontKeys.add(key);
        })
        .finally(() => {
          loadingPreviewFonts.delete(key);
        });

      loadingPreviewFonts.set(key, load);
      await load;
    }),
  );
}

/**
 * Hoist @font-face rules from HTML <style> into the document <head>.
 * Browser support differs on whether @font-face inside Shadow DOM is honored,
 * so keep the original rules in the preview CSS and also expose them globally.
 */
function hoistFontFaces(html: string): string {
  const fontFaceCss = extractFontFaceBlocks(html).join("\n");

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

  return html;
}

function findPreviewMeasurementTarget(shadowRoot: ShadowRoot): HTMLElement | null {
  const preferredTargets = [
    shadowRoot.querySelector(".document-page > div"),
    shadowRoot.querySelector(".document-page"),
  ];

  for (const target of preferredTargets) {
    if (target instanceof HTMLElement) {
      return target;
    }
  }

  for (const node of shadowRoot.children) {
    if (node instanceof HTMLElement && node.tagName !== "STYLE") {
      return node;
    }
  }

  return null;
}

function getMeasuredHeight(target: HTMLElement): number {
  return Math.max(target.scrollHeight, target.offsetHeight, target.clientHeight);
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
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

    const measurementTarget = findPreviewMeasurementTarget(shadowRoot);
    if (!measurementTarget) {
      setContentHeight(A4_HEIGHT_PX);
      return;
    }

    const measureHeight = () => {
      setContentHeight(Math.max(getMeasuredHeight(measurementTarget), A4_HEIGHT_PX));
    };

    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = new ResizeObserver(() => {
      measureHeight();
    });
    resizeObserverRef.current.observe(measurementTarget);

    const timeoutId = window.setTimeout(measureHeight, 100);
    const rafId = window.requestAnimationFrame(measureHeight);
    void loadPreviewFonts(htmlContent).then(measureHeight).catch(measureHeight);
    void document.fonts?.ready?.then(measureHeight);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [htmlContent]);

  const scaledPage = (
    <div
      style={{
        width: A4_WIDTH_PX * scale,
        height: contentHeight * scale,
        margin: "0 auto",
        overflow: "visible",
      }}
    >
      <div
        ref={shadowHostRef}
        style={{
          width: A4_WIDTH_PX,
          minHeight: `${contentHeight}px`,
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
