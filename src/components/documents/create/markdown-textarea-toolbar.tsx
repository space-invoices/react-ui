import { type InlineMarkdownSegment, parseInlineMarkdown } from "@space-invoices/document-templates/markdown";
import { Bold, Italic, List } from "lucide-react";
import { Fragment, type ReactNode, type RefObject } from "react";
import { Button } from "@/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { cn } from "@/ui/lib/utils";

type MarkdownFormat = "bold" | "italic" | "bullet-list";

type MarkdownTextareaToolbarProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  t: (key: string) => string;
  disabled?: boolean;
};

function getSelectionRange(textarea: HTMLTextAreaElement | null, value: string) {
  return {
    start: textarea?.selectionStart ?? value.length,
    end: textarea?.selectionEnd ?? value.length,
  };
}

export function applyMarkdownFormat(value: string, range: { start: number; end: number }, format: MarkdownFormat) {
  const before = value.slice(0, range.start);
  const selected = value.slice(range.start, range.end);
  const after = value.slice(range.end);

  if (format === "bullet-list") {
    const fallback = selected || "List item";
    const formatted = fallback
      .split(/\r?\n/)
      .map((line) => (line.trim().startsWith("- ") ? line : `- ${line || "List item"}`))
      .join("\n");

    return `${before}${formatted}${after}`;
  }

  const marker = format === "bold" ? "**" : "*";
  const fallback = format === "bold" ? "bold text" : "italic text";
  return `${before}${marker}${selected || fallback}${marker}${after}`;
}

export function MarkdownTextareaToolbar({ textareaRef, value, onChange, t, disabled }: MarkdownTextareaToolbarProps) {
  const applyFormat = (format: MarkdownFormat) => {
    if (disabled) return;

    const textarea = textareaRef.current;
    const range = getSelectionRange(textarea, value);
    const nextValue = applyMarkdownFormat(value, range, format);

    onChange(nextValue);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      const insertedLength = nextValue.length - value.length + (range.end - range.start);
      const cursor = range.start + Math.max(insertedLength, 0);
      textarea?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="flex items-center gap-1">
      <ToolbarButton
        disabled={disabled}
        icon={<Bold className="size-3.5" />}
        label={t("Bold")}
        onClick={() => applyFormat("bold")}
      />
      <ToolbarButton
        disabled={disabled}
        icon={<Italic className="size-3.5" />}
        label={t("Italic")}
        onClick={() => applyFormat("italic")}
      />
      <ToolbarButton
        disabled={disabled}
        icon={<List className="size-3.5" />}
        label={t("Bullet list")}
        onClick={() => applyFormat("bullet-list")}
      />
    </div>
  );
}

function ToolbarButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          disabled={disabled}
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 w-7 p-0 text-muted-foreground"
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function MarkdownPreview({ value, className }: { value: string | ReactNode[]; className?: string }) {
  if (Array.isArray(value)) {
    return (
      <div className={cn("space-y-1 whitespace-pre-wrap", className)}>
        {value.map((node, index) =>
          typeof node === "string" ? (
            <ParsedMarkdown
              // biome-ignore lint/suspicious/noArrayIndexKey: preview fragments follow source text order.
              key={`markdown:${index}`}
              value={node}
            />
          ) : (
            node
          ),
        )}
      </div>
    );
  }

  return <ParsedMarkdown value={value} className={className} />;
}

function ParsedMarkdown({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn("whitespace-pre-wrap", className)}>
      {getTextareaPreviewLines(value).map((line, lineIndex) => (
        <MarkdownPreviewLine
          // biome-ignore lint/suspicious/noArrayIndexKey: preview lines follow source text order.
          key={`${line}:${lineIndex}`}
          line={line}
        />
      ))}
    </div>
  );
}

function getTextareaPreviewLines(value: string) {
  const lines = value.split("\n");
  const previewLines: string[] = [];
  let previousWasBlank = false;

  for (const line of lines) {
    const isBlank = line.trim() === "";

    if (isBlank && previousWasBlank) {
      continue;
    }

    previewLines.push(line);
    previousWasBlank = isBlank;
  }

  return previewLines;
}

function MarkdownPreviewLine({ line }: { line: string }) {
  const bulletMatch = line.match(/^(\s*)[-*]\s+(.*)$/);

  if (bulletMatch) {
    return (
      <div className="mb-0.5 flex min-h-[1.2em] gap-1.5 leading-[1.2] last:mb-0">
        <span className="w-3 shrink-0 text-center">•</span>
        <span className="min-w-0 flex-1">
          <InlineMarkdown segments={parseInlineMarkdown(bulletMatch[2] ?? "")} />
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-[1.25em]">
      <InlineMarkdown segments={parseInlineMarkdown(line)} />
    </div>
  );
}

function InlineMarkdown({ segments }: { segments: InlineMarkdownSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        return (
          <InlineMarkdownSegmentPreview
            // biome-ignore lint/suspicious/noArrayIndexKey: markdown segments are render-only fragments.
            key={`${segment.text}:${index}`}
            segment={segment}
          />
        );
      })}
    </>
  );
}

function InlineMarkdownSegmentPreview({ segment }: { segment: InlineMarkdownSegment }) {
  const content = <PreviewText value={segment.text} />;

  if (segment.bold && segment.italic) {
    return (
      <strong>
        <em>{content}</em>
      </strong>
    );
  }

  if (segment.bold) {
    return <strong>{content}</strong>;
  }

  if (segment.italic) {
    return <em>{content}</em>;
  }

  return <span>{content}</span>;
}

function PreviewText({ value }: { value: string }) {
  return value.split("\n").map((part, index, parts) => (
    <Fragment
      // biome-ignore lint/suspicious/noArrayIndexKey: split text fragments follow source text order.
      key={`${part}:${index}`}
    >
      {part}
      {index < parts.length - 1 && <br />}
    </Fragment>
  ));
}
