// Stub file - TODO: implement properly
import type { RefObject } from "react";

type ScaledDocumentPreviewProps = {
  htmlContent: string;
  scale: number;
  contentHeight: number;
  A4_WIDTH_PX: number;
  contentRef: RefObject<HTMLDivElement>;
  entityUpdatedAt?: string;
};

export function ScaledDocumentPreview({
  htmlContent,
  scale,
  contentHeight,
  A4_WIDTH_PX,
  contentRef,
}: ScaledDocumentPreviewProps) {
  return (
    <div
      ref={contentRef}
      style={{
        width: A4_WIDTH_PX,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        height: contentHeight,
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
