import type { Entity } from "@spaceinvoices/js-sdk";
import { cn } from "@/ui/lib/utils";

type PreviewDocument = {
  number?: string | null;
  date?: string | Date | null;
  date_due?: string | Date | null;
  date_valid_till?: string | Date | null;
  total_with_tax?: number | null;
  currency_code?: string | null;
  customer?: { name?: string | null; email?: string | null } | null;
  customer_id?: string | null;
  issuer?:
    | {
        unit_name?: string | null;
        email?: string | null;
        address?: string | null;
        post_code?: string | null;
        city?: string | null;
        country?: string | null;
      }
    | null;
  business_unit?:
    | {
        name?: string | null;
        email?: string | null;
        address?: string | null;
        post_code?: string | null;
        city?: string | null;
        country?: string | null;
        settings?:
          | {
              bank_accounts?:
                | Array<{
                    iban?: string | null;
                    bank_name?: string | null;
                    bic?: string | null;
                    account_number?: string | null;
                    routing_number?: string | null;
                    sort_code?: string | null;
                    is_default?: boolean | null;
                  }>
                | null;
            }
          | null;
      }
    | null;
};

type TemplateVariableDefinition = {
  name: string;
  label: string;
  category: string;
  translationAliases?: string[];
};

const TEMPLATE_VARIABLE_DEFINITIONS: TemplateVariableDefinition[] = [
  { name: "entity_name", label: "Company name", category: "Entity" },
  { name: "entity_email", label: "Email address", category: "Entity" },
  { name: "entity_address", label: "Address", category: "Entity" },
  { name: "entity_post_code", label: "Post code", category: "Entity", translationAliases: ["Postal Code"] },
  { name: "entity_city", label: "City", category: "Entity" },
  { name: "entity_country", label: "Country", category: "Entity" },
  { name: "entity_tax_number", label: "Tax number", category: "Entity", translationAliases: ["tax-number"] },
  {
    name: "entity_company_number",
    label: "Company number",
    category: "Entity",
    translationAliases: ["company-number"],
  },
  { name: "entity_starting_capital", label: "Starting capital", category: "Entity" },
  { name: "unit_name", label: "Unit name", category: "Business unit" },
  { name: "document_number", label: "Invoice number", category: "Document" },
  { name: "document_date", label: "Invoice date", category: "Document" },
  { name: "document_due_date", label: "Due date", category: "Document" },
  { name: "document_valid_until", label: "Valid until", category: "Document" },
  { name: "document_total", label: "Total amount", category: "Document" },
  { name: "document_currency", label: "Currency", category: "Document" },
  { name: "customer_name", label: "Customer name", category: "Customer" },
  { name: "customer_email", label: "Customer email", category: "Customer" },
  { name: "bank_account", label: "Bank Account", category: "Bank Account" },
  { name: "bank_account.iban", label: "IBAN", category: "Bank Account" },
  { name: "bank_account.bank_name", label: "Bank Name", category: "Bank Account" },
  { name: "bank_account.bic", label: "BIC/SWIFT", category: "Bank Account" },
  { name: "bank_account.account_number", label: "Account number", category: "Bank Account" },
  { name: "current_date", label: "Today's date", category: "Other" },
  { name: "current_year", label: "Current year", category: "Other" },
];

const TEMPLATE_VARIABLE_LOOKUP = new Map(
  TEMPLATE_VARIABLE_DEFINITIONS.map((definition) => [definition.name, definition] as const),
);

type TranslationFunction = (key: string) => string;

function getBusinessUnitName(document: PreviewDocument | null | undefined): string | null {
  if (!document) return null;
  return document.business_unit?.name || document.issuer?.unit_name || null;
}

function getResolvedIssuerValue(
  field: "email" | "address" | "post_code" | "city" | "country",
  entity: Entity,
  document?: PreviewDocument | null,
): string | null {
  return (
    document?.business_unit?.[field] ||
    document?.issuer?.[field] ||
    (entity as any)[field] ||
    null
  );
}

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
  document?: PreviewDocument | null,
): string | null {
  if (!entity) return null;

  // Entity-related variables
  if (varName === "entity_name") return entity.name || null;
  if (varName === "entity_email") return getResolvedIssuerValue("email", entity, document);
  if (varName === "entity_address") return getResolvedIssuerValue("address", entity, document);
  if (varName === "entity_post_code") return getResolvedIssuerValue("post_code", entity, document);
  if (varName === "entity_city") return getResolvedIssuerValue("city", entity, document);
  if (varName === "entity_country") return getResolvedIssuerValue("country", entity, document);
  if (varName === "entity_tax_number") return entity.tax_number || null;
  if (varName === "entity_company_number") return entity.company_number || null;
  if (varName === "entity_starting_capital") {
    return entity.starting_capital != null ? String(entity.starting_capital) : null;
  }
  if (varName === "unit_name") return getBusinessUnitName(document);

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

  // Bank account variables (blend unit overrides over entity settings)
  const bankAccounts =
    (document?.business_unit?.settings?.bank_accounts as
      | Array<{
          iban?: string | null;
          bank_name?: string | null;
          bic?: string | null;
          account_number?: string | null;
          routing_number?: string | null;
          sort_code?: string | null;
          is_default?: boolean | null;
        }>
      | null
      | undefined) ??
    ((entity.settings as any)?.bank_accounts as
    | Array<{
        iban?: string | null;
        bank_name?: string | null;
        bic?: string | null;
        account_number?: string | null;
        routing_number?: string | null;
        sort_code?: string | null;
        is_default?: boolean | null;
      }>
    | undefined);
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

function translateLabel(label: string, aliases: string[] | undefined, translate?: TranslationFunction): string {
  if (!translate) return label;

  const translatedLabel = translate(label);
  if (translatedLabel !== label) return translatedLabel;

  for (const alias of aliases ?? []) {
    const translatedAlias = translate(alias);
    if (translatedAlias !== alias) return translatedAlias;
  }

  return label;
}

export function getTemplateVariableLabel(varName: string, translate?: TranslationFunction): string {
  const definition = TEMPLATE_VARIABLE_LOOKUP.get(varName);
  if (!definition) return formatVariableName(varName);
  return translateLabel(definition.label, definition.translationAliases, translate);
}

export function getTemplateVariableGroups(translate?: TranslationFunction) {
  const groupedVariables = new Map<string, Array<{ code: string; label: string }>>();

  for (const definition of TEMPLATE_VARIABLE_DEFINITIONS) {
    const group = groupedVariables.get(definition.category) ?? [];
    group.push({
      code: `{${definition.name}}`,
      label: getTemplateVariableLabel(definition.name, translate),
    });
    groupedVariables.set(definition.category, group);
  }

  return Array.from(groupedVariables.entries()).map(([category, variables]) => ({
    category: translate ? translate(category) : category,
    variables,
  }));
}

/**
 * Replace template variables in a string with styled React nodes for preview.
 * Resolved values get a secondary bg, unresolved show as primary-colored placeholders.
 */
export function replaceTemplateVariablesForPreview(
  template: string,
  entity?: Entity | null,
  document?: PreviewDocument | null,
  translate?: TranslationFunction,
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
    const displayValue = actualValue || getTemplateVariableLabel(varName, translate);

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
