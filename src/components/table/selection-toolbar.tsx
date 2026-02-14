import { FileDown, X } from "lucide-react";
import { Button } from "@/ui/components/ui/button";

type SelectionToolbarProps = {
  selectedCount: number;
  onExportPdfs?: () => void;
  onDeselectAll?: () => void;
  t?: (key: string) => string;
};

export function SelectionToolbar({
  selectedCount,
  onExportPdfs,
  onDeselectAll,
  t = (key) => key,
}: SelectionToolbarProps) {
  return (
    <>
      <span className="font-medium text-sm">
        {selectedCount} {t("selected")}
      </span>
      {onExportPdfs && (
        <Button variant="outline" size="sm" onClick={onExportPdfs}>
          <FileDown className="mr-1.5 size-4" />
          {t("Export PDFs")}
        </Button>
      )}
      {onDeselectAll && (
        <Button variant="ghost" size="sm" onClick={onDeselectAll}>
          <X className="mr-1.5 size-4" />
          {t("Deselect all")}
        </Button>
      )}
    </>
  );
}
