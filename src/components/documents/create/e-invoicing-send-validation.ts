export type EInvoicingSendValidationIssue = {
  path: string;
  message: "Required";
};

type EInvoicingSendFormValues = {
  customer?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    post_code?: string | null;
    e_invoicing?: {
      buyer_reference?: string | null;
    } | null;
  } | null;
  items?: Array<{
    name?: unknown;
    type?: string | null;
    classification?: string | null;
    taxes?: unknown[] | null;
  }> | null;
};

type EInvoicingSendValidationOptions = {
  sendEnabled: boolean;
  isFrance: boolean;
  requiresBuyerReference: boolean;
};

export function getEInvoicingSendValidationIssues(
  values: EInvoicingSendFormValues,
  options: EInvoicingSendValidationOptions,
): EInvoicingSendValidationIssue[] {
  if (!options.sendEnabled) return [];

  const issues: EInvoicingSendValidationIssue[] = [];
  const customerFields = ["name", "address", "post_code", "city"] as const;
  for (const field of customerFields) {
    if (!values.customer?.[field]?.trim()) {
      issues.push({ path: `customer.${field}`, message: "Required" });
    }
  }

  if (options.requiresBuyerReference && !values.customer?.e_invoicing?.buyer_reference?.trim()) {
    issues.push({ path: "customer.e_invoicing.buyer_reference", message: "Required" });
  }

  values.items?.forEach((item, index) => {
    if (item.type === "separator") return;
    if (!Array.isArray(item.taxes) || item.taxes.length === 0) {
      issues.push({ path: `items.${index}.taxes`, message: "Required" });
    }
    if (options.isFrance) {
      if (item.classification === "product" || item.classification === "service") return;
      issues.push({ path: `items.${index}.classification`, message: "Required" });
    }
  });

  return issues;
}
