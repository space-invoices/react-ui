import { AlertTriangle, FileDown, FileText, RefreshCw, X } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";

type SelectionToolbarProps = {
  selectedCount: number;
  onExportPdfs?: () => void;
  exportPdfsDisabled?: boolean;
  exportPdfsTooltip?: string;
  onExportEslog?: () => void;
  exportEslogDisabled?: boolean;
  exportEslogTooltip?: string;
  exportEslogWarning?: boolean;
  exportEslogWarningTooltip?: string;
  onCopyToInvoice?: () => void;
  copyToInvoiceDisabled?: boolean;
  copyToInvoiceTooltip?: string;
  onRetryFiscalization?: () => void;
  retryFiscalizationDisabled?: boolean;
  retryFiscalizationTooltip?: string;
  onDeselectAll?: () => void;
  t?: (key: string) => string;
};

export function SelectionToolbar({
  selectedCount,
  onExportPdfs,
  exportPdfsDisabled,
  exportPdfsTooltip,
  onExportEslog,
  exportEslogDisabled,
  exportEslogTooltip,
  exportEslogWarning,
  exportEslogWarningTooltip,
  onCopyToInvoice,
  copyToInvoiceDisabled,
  copyToInvoiceTooltip,
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
      {onExportPdfs &&
        (exportPdfsDisabled && exportPdfsTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" disabled>
                  <FileDown className="mr-1.5 size-4" />
                  {t("Export PDFs")}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{exportPdfsTooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="outline" size="sm" onClick={onExportPdfs} disabled={exportPdfsDisabled}>
            <FileDown className="mr-1.5 size-4" />
            {t("Export PDFs")}
          </Button>
        ))}
      {onExportEslog &&
        (exportEslogDisabled && exportEslogTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" disabled>
                  <FileDown className="mr-1.5 size-4" />
                  {t("Export e-SLOG")}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{exportEslogTooltip}</TooltipContent>
          </Tooltip>
        ) : exportEslogWarning && exportEslogWarningTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onExportEslog} disabled={exportEslogDisabled}>
                <AlertTriangle className="mr-1.5 size-4 text-amber-500" />
                {t("Export e-SLOG")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{exportEslogWarningTooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="outline" size="sm" onClick={onExportEslog} disabled={exportEslogDisabled}>
            <FileDown className="mr-1.5 size-4" />
            {t("Export e-SLOG")}
          </Button>
        ))}
      {onCopyToInvoice &&
        (copyToInvoiceDisabled && copyToInvoiceTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" disabled>
                  <FileText className="mr-1.5 size-4" />
                  {t("Copy to Invoice")}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{copyToInvoiceTooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="outline" size="sm" onClick={onCopyToInvoice}>
            <FileText className="mr-1.5 size-4" />
            {t("Copy to Invoice")}
          </Button>
        ))}
      {onRetryFiscalization &&
        (retryFiscalizationDisabled && retryFiscalizationTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
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
