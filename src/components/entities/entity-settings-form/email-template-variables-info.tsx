import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/components/ui/button";

interface EmailTemplateVariablesInfoProps {
  translate: (key: string) => string;
}

const TEMPLATE_VARIABLES = [
  {
    category: "Entity",
    variables: [
      { name: "{entity_name}", description: "Your company or entity name" },
      { name: "{entity_email}", description: "Entity email address" },
    ],
  },
  {
    category: "Document",
    variables: [
      {
        name: "{document_number}",
        description: "Document number (invoice or estimate)",
      },
      { name: "{document_date}", description: "Document issue date" },
      { name: "{document_due_date}", description: "Due date (for invoices)" },
      {
        name: "{document_valid_until}",
        description: "Valid until date (for estimates)",
      },
      { name: "{document_total}", description: "Document total amount" },
      { name: "{document_currency}", description: "Document currency code" },
    ],
  },
  {
    category: "Customer",
    variables: [
      { name: "{customer_name}", description: "Customer name" },
      { name: "{customer_email}", description: "Customer email address" },
    ],
  },
  {
    category: "Other",
    variables: [
      { name: "{current_date}", description: "Today's date" },
      { name: "{current_year}", description: "Current year" },
    ],
  },
];

export function EmailTemplateVariablesInfo({ translate }: EmailTemplateVariablesInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-auto cursor-pointer p-0 text-muted-foreground/80 text-xs hover:text-muted-foreground"
      >
        {isOpen ? (
          <>
            <ChevronUp className="mr-1 h-3 w-3" />
            {translate("Hide")}
          </>
        ) : (
          <>
            <ChevronDown className="mr-1 h-3 w-3" />
            {translate("Show all")}
          </>
        )}
      </Button>

      {isOpen && (
        <div className="space-y-3">
          {TEMPLATE_VARIABLES.map((group) => (
            <div key={group.category} className="space-y-2">
              <p className="font-semibold text-muted-foreground text-xs">{group.category}</p>
              <div className="space-y-1.5">
                {group.variables.map((variable) => (
                  <div key={variable.name} className="flex items-start gap-2">
                    <code className="shrink-0 rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                      {variable.name}
                    </code>
                    <span className="text-muted-foreground/80 text-xs leading-relaxed">{variable.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-3 flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <p className="text-muted-foreground/80 text-xs">
              {translate("Variables are automatically replaced when sending emails")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
