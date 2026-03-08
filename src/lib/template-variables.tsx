import type { Entity, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { cn } from "@/ui/lib/utils";

/**
 * Convert snake_case variable name to Title Case for display
 * e.g., "document_number" -> "Document Number", "bank_account.iban" -> "Bank Account Iban"
 */
export function formatVariableName(varName: string): string {
  return varName
    .replace(/\./g, "_")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Resolve a template variable to its actual value from entity/document data.
 * Returns null if the variable can't be resolved (shown as a placeholder in preview).
 */
export function getVariableValue(
  varName: string,
  entity?: Entity | null,
  document?: Partial<Invoice | Estimate> | null,
): string | null {
  if (!entity) return null;

  // Entity-related variables
  if (varName === "entity_name") return entity.name || null;
  if (varName === "entity_email") return entity.email || null;
  if (varName === "entity_address") return entity.address || null;
  if (varName === "entity_post_code") return entity.post_code || null;
  if (varName === "entity_city") return entity.city || null;
  if (varName === "entity_country") return entity.country || null;
  if (varName === "entity_tax_number") return entity.tax_number || null;
  if (varName === "entity_company_number") return entity.company_number || null;

  // Date variables
  if (varName === "current_date") {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  if (varName === "current_year") return new Date().getFullYear().toString();

  // Document-specific variables
  if (document) {
    if (varName === "document_number") return (document as any).number || null;
    if (varName === "document_date" && (document as any).date) {
      return new Date((document as any).date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (varName === "document_total" && (document as any).total_with_tax) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (document as any).currency_code || "USD",
      }).format(Number((document as any).total_with_tax));
    }
    if (varName === "document_currency") return (document as any).currency_code || null;

    // Invoice due date
    if ("date_due" in document && varName === "document_due_date") {
      return document.date_due
        ? new Date(document.date_due).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : null;
    }

    // Estimate valid until
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
    if ((document as any).customer) {
      if (varName === "customer_name") return (document as any).customer.name || null;
      if (varName === "customer_email") return (document as any).customer.email || null;
    }
  }

  // Bank account variables (from entity settings)
  const bankAccounts = (entity.settings as any)?.bank_accounts as
    | Array<{
        iban?: string;
        bank_name?: string;
        bic?: string;
        account_number?: string;
        routing_number?: string;
        sort_code?: string;
        is_default?: boolean;
      }>
    | undefined;
  const bankAccount = bankAccounts?.find((acc) => acc.is_default) ?? bankAccounts?.[0];

  if (varName === "bank_account" && bankAccount) {
    const lines: string[] = [];
    if (bankAccount.bank_name) lines.push(bankAccount.bank_name);
    if (bankAccount.iban) lines.push(`IBAN: ${bankAccount.iban}`);
    else if (bankAccount.account_number) lines.push(`Account: ${bankAccount.account_number}`);
    if (bankAccount.bic) lines.push(`BIC: ${bankAccount.bic}`);
    return lines.join(", ") || null;
  }
  if (varName === "bank_account.iban") return bankAccount?.iban || null;
  if (varName === "bank_account.bank_name") return bankAccount?.bank_name || null;
  if (varName === "bank_account.bic") return bankAccount?.bic || null;
  if (varName === "bank_account.account_number") return bankAccount?.account_number || null;

  return null;
}

/**
 * Replace template variables in a string with styled React nodes for preview.
 * Resolved values get a secondary bg, unresolved show as primary-colored placeholders.
 */
export function replaceTemplateVariablesForPreview(
  template: string,
  entity?: Entity | null,
  document?: Partial<Invoice | Estimate> | null,
): React.ReactNode[] {
  if (!template) return [];

  const parts: React.ReactNode[] = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  match = regex.exec(template);
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }

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

  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return parts;
}
