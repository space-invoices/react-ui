import type { PdfTemplateId } from "@/ui/components/documents/create/live-preview";

export const PDF_TEMPLATE_IDS = [
  "modern",
  "classic",
  "condensed",
  "minimal",
  "fashion",
] as const satisfies readonly PdfTemplateId[];

export const PDF_TEMPLATE_OPTIONS: ReadonlyArray<{
  id: PdfTemplateId;
  nameKey: string;
  descriptionKey: string;
}> = [
  { id: "modern", nameKey: "Modern", descriptionKey: "Modern template description" },
  { id: "classic", nameKey: "Classic", descriptionKey: "Classic template description" },
  { id: "condensed", nameKey: "Condensed", descriptionKey: "Condensed template description" },
  { id: "minimal", nameKey: "Minimal", descriptionKey: "Minimal template description" },
  { id: "fashion", nameKey: "Fashion", descriptionKey: "Fashion template description" },
];

export function getPdfTemplateOption(templateId: PdfTemplateId) {
  return PDF_TEMPLATE_OPTIONS.find((template) => template.id === templateId);
}
