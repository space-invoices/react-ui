import type { Entity, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { forwardRef, useState } from "react";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";
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

function formatVariableName(varName: string): string {
  // Convert snake_case to Title Case with spaces
  // e.g., "document_number" -> "Document Number"
  return varName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getVariableValue(varName: string, entity: Entity, document?: Invoice | Estimate | null): string | null {
  // Entity-related variables
  if (varName === "entity_name") return entity.name || null;
  if (varName === "entity_email") return (entity.settings as any)?.email || null;

  // Date variables
  if (varName === "current_date") {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  if (varName === "current_year") return new Date().getFullYear().toString();

  // Document-specific variables (only available when document is provided)
  if (document) {
    if (varName === "document_number") return document.number || null;
    if (varName === "document_date") {
      return document.date
        ? new Date(document.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : null;
    }
    if (varName === "document_total") {
      return document.total_with_tax
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: document.currency_code || "USD" }).format(
            Number(document.total_with_tax),
          )
        : null;
    }
    if (varName === "document_currency") return document.currency_code || null;

    // Invoice-specific
    if ("date_due" in document && varName === "document_due_date") {
      return document.date_due
        ? new Date(document.date_due).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : null;
    }

    // Estimate-specific
    if ("date_valid_till" in document && varName === "document_valid_until") {
      return document.date_valid_till
        ? new Date(document.date_valid_till).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : null;
    }

    // Customer variables
    if (document.customer) {
      if (varName === "customer_name") return document.customer.name || null;
      if (varName === "customer_email") return (document.customer as any).email || null;
    }
  }

  // Return null for unavailable variables - they will show as placeholders
  return null;
}

function replaceTemplateVariables(
  template: string,
  entity: Entity,
  document?: Invoice | Estimate | null,
): React.ReactNode[] {
  if (!template) return [];

  // Split by variable pattern and process
  const parts: React.ReactNode[] = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  match = regex.exec(template);
  while (match !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }

    // Add the replaced variable with styling
    // Green for resolved values, primary color for placeholders
    const varName = match[1];
    const actualValue = getVariableValue(varName, entity, document);
    const displayValue = actualValue || formatVariableName(varName);

    parts.push(
      <span
        key={match.index}
        className={cn(
          "rounded px-1.5 py-0.5 font-medium text-xs",
          actualValue ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {displayValue}
      </span>,
    );

    lastIndex = regex.lastIndex;
    match = regex.exec(template);
  }

  // Add remaining text
  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return parts;
}

export const InputWithPreview = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputWithPreviewProps>(
  function InputWithPreview(
    { value, onChange, placeholder, entity, document, multiline = false, className, rows, disabled = false },
    ref,
  ) {
    const [isFocused, setIsFocused] = useState(false);

    const preview = replaceTemplateVariables(value, entity, document);
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
