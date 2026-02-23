import type { Entity, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { forwardRef, useState } from "react";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";
import { replaceTemplateVariablesForPreview } from "@/ui/lib/template-variables";
import { cn } from "@/ui/lib/utils";

interface InputWithPreviewProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  entity: Entity;
  document?: Invoice | Estimate | null;
  multiline?: boolean;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export const InputWithPreview = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputWithPreviewProps>(
  function InputWithPreview(
    { value, onChange, placeholder, entity, document, multiline = false, className, rows, disabled = false },
    ref,
  ) {
    const [isFocused, setIsFocused] = useState(false);

    const preview = replaceTemplateVariablesForPreview(value, entity, document);
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
