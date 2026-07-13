import { Flag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import {
  DEFAULT_CONTENT_LOCALE,
  DOCUMENT_CONTENT_TRANSLATION_LOCALES,
  type DocumentContentLocaleMode,
  getContentLocaleButtonLabel,
  getContentLocaleMenuLabel,
  getContentLocaleTooltipLabel,
  getContentLocaleUiLabels,
} from "@/ui/lib/document-content-translations";

type ContentLocaleButtonProps = {
  activeLocale: DocumentContentLocaleMode;
  defaultLocale?: string | null;
  onChange: (locale: DocumentContentLocaleMode) => void;
  enabledLocales?: string[];
  disabled?: boolean;
  className?: string;
  uiLocale?: string | null;
  t?: (key: string) => string;
};

export function ContentLocaleButton({
  activeLocale,
  defaultLocale,
  onChange,
  enabledLocales,
  disabled,
  className,
  uiLocale,
  t: _t,
}: ContentLocaleButtonProps) {
  const [open, setOpen] = useState(false);
  const visibleLocales =
    enabledLocales && enabledLocales.length > 0
      ? DOCUMENT_CONTENT_TRANSLATION_LOCALES.filter((option) => enabledLocales.includes(option.value))
      : DOCUMENT_CONTENT_TRANSLATION_LOCALES;
  const buttonLabel = getContentLocaleButtonLabel(activeLocale, defaultLocale);
  const showButtonLabel = activeLocale !== DEFAULT_CONTENT_LOCALE;
  const labels = getContentLocaleUiLabels(uiLocale);
  const defaultLabel = labels.default;
  const inputLanguageLabel = labels.inputLanguage;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              className={className ?? "h-7 gap-1 px-2 text-muted-foreground"}
            >
              <Flag className="size-3.5" />
              {showButtonLabel ? <span>{buttonLabel}</span> : null}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {getContentLocaleTooltipLabel(activeLocale, defaultLocale, {
            uiLocale,
            defaultLabel,
            inputLanguageLabel,
          })}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup
          value={activeLocale}
          onValueChange={(value) => {
            onChange(value as DocumentContentLocaleMode);
            setOpen(false);
          }}
        >
          <DropdownMenuRadioItem value={DEFAULT_CONTENT_LOCALE}>
            {getContentLocaleMenuLabel(DEFAULT_CONTENT_LOCALE, defaultLocale, { uiLocale, defaultLabel })}
          </DropdownMenuRadioItem>
          {visibleLocales.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.flag} {getContentLocaleMenuLabel(option.value, defaultLocale, { uiLocale, defaultLabel })}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
