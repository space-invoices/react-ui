/**
 * Smart Code Insert Button
 * Dropdown button for inserting template variables into a textarea at cursor position
 */
import { Sparkles } from "lucide-react";
import { useCallback, useRef } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import { getTemplateVariableGroups } from "@/ui/lib/template-variables";

interface SmartCodeInsertButtonProps {
  /** Reference to the textarea element */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Callback when a variable is inserted - receives the new value */
  onInsert: (newValue: string) => void;
  /** Current value of the textarea */
  value: string;
  /** Translation function */
  t: (key: string) => string;
}

export function SmartCodeInsertButton({ textareaRef, onInsert, value, t }: SmartCodeInsertButtonProps) {
  // Store cursor position for when textarea loses focus before dropdown opens
  const cursorPositionRef = useRef<number>(0);
  const templateVariables = getTemplateVariableGroups(t);

  const insertVariable = useCallback(
    (code: string) => {
      const textarea = textareaRef.current;
      const currentValue = value || "";
      const cursorPos = textarea?.selectionStart ?? cursorPositionRef.current ?? currentValue.length;

      // Insert the code at cursor position
      const newValue = currentValue.slice(0, cursorPos) + code + currentValue.slice(cursorPos);
      onInsert(newValue);

      // Restore focus and set cursor after inserted text
      requestAnimationFrame(() => {
        if (textarea) {
          textarea.focus();
          const newCursorPos = cursorPos + code.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    },
    [textareaRef, value, onInsert],
  );

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Sparkles className="h-4 w-4" />
                <span className="sr-only">{t("Insert variable")}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t("Insert variable")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-72">
        {templateVariables.map((group, groupIndex) => (
          <div key={group.category}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-muted-foreground text-xs">{group.category}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {group.variables.map((variable) => (
                <DropdownMenuItem
                  key={variable.code}
                  onClick={() => insertVariable(variable.code)}
                  className="flex cursor-pointer items-center whitespace-nowrap"
                >
                  <code className="mr-2 shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-xs">{variable.code}</code>
                  <span className="text-muted-foreground text-xs">{variable.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
