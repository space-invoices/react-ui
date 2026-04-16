import type { Entity } from "@spaceinvoices/js-sdk";
import { forwardRef, useState } from "react";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";
import { replaceTemplateVariablesForPreview } from "@/ui/lib/template-variables";
import { cn } from "@/ui/lib/utils";

type PreviewDocument = {
  id?: string;
  number?: string | null;
  date?: string | Date | null;
  date_due?: string | Date | null;
  date_valid_till?: string | Date | null;
  total_with_tax?: number | null;
  currency_code?: string | null;
  customer?: { name?: string | null; email?: string | null } | null;
  customer_id?: string | null;
  issuer?: {
    unit_name?: string | null;
    email?: string | null;
    address?: string | null;
    post_code?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  business_unit?: {
    name?: string | null;
    email?: string | null;
    address?: string | null;
    post_code?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
};

interface InputWithPreviewProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  entity: Entity;
  document?: PreviewDocument | null;
  multiline?: boolean;
  className?: string;
  rows?: number;
  disabled?: boolean;
  translatePreviewLabel?: (key: string) => string;
}

export const InputWithPreview = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputWithPreviewProps>(
  function InputWithPreview(
    {
      value,
      onChange,
      placeholder,
      entity,
      document,
      multiline = false,
      className,
      rows,
      disabled = false,
      translatePreviewLabel,
    },
    ref,
  ) {
    const [isFocused, setIsFocused] = useState(false);

    const preview = replaceTemplateVariablesForPreview(value, entity, document, translatePreviewLabel);
    const hasValue = Boolean(value);

    const showPreview = !isFocused && hasValue && !disabled;

    if (multiline) {
      return (
        <div className="relative">
          <Textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={showPreview ? "" : placeholder}
            className={cn(className, showPreview && "text-transparent caret-transparent")}
            rows={rows}
            disabled={disabled}
          />
          {showPreview && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start overflow-hidden rounded-md border border-input bg-background px-3 py-2 shadow-xs">
              <div className="w-full whitespace-pre-wrap text-base md:text-sm">{preview}</div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative">
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={showPreview ? "" : placeholder}
          className={cn(className, showPreview && "text-transparent caret-transparent")}
          disabled={disabled}
        />
        {showPreview && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-start overflow-hidden rounded-md border border-input bg-background px-3 py-1 shadow-xs">
            <div className="flex h-full w-full items-center truncate text-base md:text-sm">{preview}</div>
          </div>
        )}
      </div>
    );
  },
);
