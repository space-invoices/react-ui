import { FileDown, FileText, RefreshCw, X } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";

type SelectionToolbarProps = {
  selectedCount: number;
  onExportPdfs?: () => void;
  onCopyToInvoice?: () => void;
  onRetryFiscalization?: () => void;
  retryFiscalizationDisabled?: boolean;
  retryFiscalizationTooltip?: string;
  onDeselectAll?: () => void;
  t?: (key: string) => string;
};

export function SelectionToolbar({
  selectedCount,
  onExportPdfs,
  onCopyToInvoice,
  onRetryFiscalization,
  retryFiscalizationDisabled,
  retryFiscalizationTooltip,
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
      {onCopyToInvoice && (
        <Button variant="outline" size="sm" onClick={onCopyToInvoice}>
          <FileText className="mr-1.5 size-4" />
          {t("Copy to Invoice")}
        </Button>
      )}
      {onRetryFiscalization &&
        (retryFiscalizationDisabled && retryFiscalizationTooltip ? (
          <Tooltip>
            <TooltipTrigger>
              <span>
                <Button variant="outline" size="sm" disabled>
                  <RefreshCw className="mr-1.5 size-4" />
                  {t("Retry Fiscalization")}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{retryFiscalizationTooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="outline" size="sm" onClick={onRetryFiscalization}>
            <RefreshCw className="mr-1.5 size-4" />
            {t("Retry Fiscalization")}
          </Button>
        ))}
      {onDeselectAll && (
        <Button variant="ghost" size="sm" onClick={onDeselectAll}>
          <X className="mr-1.5 size-4" />
          {t("Deselect all")}
        </Button>
      )}
    </>
  );
}
