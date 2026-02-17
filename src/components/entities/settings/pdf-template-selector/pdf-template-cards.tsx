import { Check } from "lucide-react";
import type { PdfTemplateId } from "@/ui/components/documents/create/live-preview";
import { cn } from "@/ui/lib/utils";

const TEMPLATES: Array<{
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

export type PdfTemplateCardsProps = {
  selectedTemplate: PdfTemplateId;
  onTemplateChange: (template: PdfTemplateId) => void;
  t: (key: string) => string;
};

export function PdfTemplateCards({ selectedTemplate, onTemplateChange, t }: PdfTemplateCardsProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-muted-foreground text-sm">{t("Template")}</h3>
      <div className="grid gap-3">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onTemplateChange(template.id)}
            className={cn(
              "relative flex cursor-pointer flex-col items-start rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50",
              selectedTemplate === template.id ? "border-primary bg-primary/5" : "border-border bg-background",
            )}
          >
            {selectedTemplate === template.id && (
              <div className="absolute top-3 right-3">
                <Check className="h-5 w-5 text-primary" />
              </div>
            )}
            <span className="font-semibold">{t(template.nameKey)}</span>
            <span className="mt-1 text-muted-foreground text-sm">{t(template.descriptionKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
