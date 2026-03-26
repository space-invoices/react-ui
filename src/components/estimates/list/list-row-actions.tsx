import type { Estimate } from "@spaceinvoices/js-sdk";

import { Copy, Download, Eye, Link2Off, Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { actionMenuTooltipProps, Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useEstimateDownload } from "./use-estimate-download";

const translations = {
  sl: {
    "Create invoice": "Ustvari račun",
  },
} as const;

type EstimateListRowActionsProps = {
  estimate: Estimate;
  onView?: (estimate: Estimate) => void;
  onDuplicate?: (estimate: Estimate) => void;
  onDownloadStart?: () => void;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (error: string) => void;
  onUnshare?: (estimate: Estimate) => Promise<void>;
  isUnsharing?: boolean;
} & ComponentTranslationProps;

export default function EstimateListRowActions({
  estimate,
  onView,
  onDuplicate,
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  onUnshare,
  isUnsharing,
  ...i18nProps
}: EstimateListRowActionsProps) {
  const t = createTranslation({ ...i18nProps, translations });
  const { isDownloading, downloadPDF } = useEstimateDownload({
    onDownloadStart,
    onDownloadSuccess,
    onDownloadError,
    ...i18nProps,
  });
  const createInvoiceDisabledReason = estimate.voided_at
    ? t("documents-list-page.copy-to-invoice-voided-not-allowed")
    : undefined;
  const createInvoiceItem = onDuplicate ? (
    <DropdownMenuItem
      className="cursor-pointer"
      onClick={createInvoiceDisabledReason ? undefined : () => onDuplicate(estimate)}
      disabled={!!createInvoiceDisabledReason}
    >
      <Copy className="h-4 w-4" />
      {t("Create invoice")}
    </DropdownMenuItem>
  ) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 cursor-pointer p-0" id="action-menu-trigger">
          <span className="sr-only">{t("Open menu")}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(estimate.id)}>
            <Copy className="h-4 w-4" />
            {t("Copy estimate ID")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onView?.(estimate)}>
            <Eye className="h-4 w-4" />
            {t("View estimate")}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => downloadPDF(estimate)} disabled={isDownloading}>
            <Download className="h-4 w-4" />
            {isDownloading ? t("Downloading...") : t("Download PDF")}
          </DropdownMenuItem>
          {createInvoiceItem &&
            (createInvoiceDisabledReason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>{createInvoiceItem}</div>
                </TooltipTrigger>
                <TooltipContent side="left" {...actionMenuTooltipProps}>
                  {createInvoiceDisabledReason}
                </TooltipContent>
              </Tooltip>
            ) : (
              createInvoiceItem
            ))}
        </DropdownMenuGroup>
        {estimate.shareable_id && onUnshare && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => onUnshare(estimate)}
                disabled={isUnsharing}
              >
                {isUnsharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
                {t("Unshare")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
