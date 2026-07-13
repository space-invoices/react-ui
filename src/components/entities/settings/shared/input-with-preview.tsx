import type { Entity } from "@spaceinvoices/js-sdk";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { MarkdownPreview } from "@/ui/components/documents/create/markdown-textarea-toolbar";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";
import {
  replaceTemplateVariablesForMarkdownPreview,
  replaceTemplateVariablesForPreview,
} from "@/ui/lib/template-variables";
import { cn } from "@/ui/lib/utils";

type PreviewDocument = {
  id?: string;
  number?: string | null;
  date?: string | Date | null;
  date_due?: string | Date | null;
  date_valid_till?: string | Date | null;
  total_with_tax?: number | null;
  total_due?: number | null;
  total_amount?: string | null;
  currency_code?: string | null;
  customer?: { name?: string | null; email?: string | null } | null;
  customer_id?: string | null;
  invoice_list?: string | null;
  payment_instructions?: string | null;
  overdue_count?: number | string | null;
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
  markdownPreview?: boolean;
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
      markdownPreview = false,
    },
    ref,
  ) {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(
      ref,
      () => (multiline ? textareaRef.current : inputRef.current) as HTMLInputElement | HTMLTextAreaElement,
    );

    const preview = markdownPreview
      ? replaceTemplateVariablesForMarkdownPreview(value, entity, document, translatePreviewLabel)
      : replaceTemplateVariablesForPreview(value, entity, document, translatePreviewLabel);
    const hasValue = Boolean(value);

    const showPreview = !isFocused && hasValue && !disabled;
    const focusTextarea = () => textareaRef.current?.focus();

    if (multiline) {
      return (
        <div className="relative">
          <Textarea
            ref={textareaRef}
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
            <button
              type="button"
              className="absolute inset-0 z-10 flex items-start overflow-y-auto rounded-md border border-input bg-background px-3 py-2 text-left shadow-xs"
              onClick={focusTextarea}
            >
              {markdownPreview ? (
                <MarkdownPreview
                  value={String(preview)}
                  className="min-h-full w-full break-words text-base md:text-sm"
                />
              ) : (
                <div className="min-h-full w-full whitespace-pre-wrap break-words text-base md:text-sm">{preview}</div>
              )}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="relative">
        <Input
          ref={inputRef}
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
