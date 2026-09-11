import { z } from "zod";

const ITEM_NAME_REQUIRED_MESSAGE = "Item name is required";
const ITEM_QUANTITY_REQUIRED_MESSAGE = "Quantity is required";
const ITEM_PRICE_REQUIRED_MESSAGE = "Price is required";
const CREDIT_NOTE_POSITIVE_VALUES_MESSAGE =
  "Credit note values must be positive. Space Invoices applies the credit note sign automatically.";

export function withRequiredDocumentItemFields<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const items = (value as { items?: Array<Record<string, unknown>> } | undefined)?.items;
    if (!Array.isArray(items)) return;

    items.forEach((item, index) => {
      if (item?.type === "separator") return;

      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const itemId = typeof item?.item_id === "string" ? item.item_id.trim() : "";
      const quantity = item?.quantity;
      const price = item?.price;
      const grossPrice = item?.gross_price;
      const hasPrice = !(price == null || price === "" || Number.isNaN(price as number));
      const hasGrossPrice = !(grossPrice == null || grossPrice === "" || Number.isNaN(grossPrice as number));

      if (!name && !itemId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "name"],
          message: ITEM_NAME_REQUIRED_MESSAGE,
        });
      }

      if (quantity == null || quantity === "" || Number.isNaN(quantity)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "quantity"],
          message: ITEM_QUANTITY_REQUIRED_MESSAGE,
        });
      }

      if (!hasPrice && !hasGrossPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "price"],
          message: ITEM_PRICE_REQUIRED_MESSAGE,
        });
      }
    });
  });
}

export const documentItemValidationMessages = {
  name: ITEM_NAME_REQUIRED_MESSAGE,
  quantity: ITEM_QUANTITY_REQUIRED_MESSAGE,
  price: ITEM_PRICE_REQUIRED_MESSAGE,
  positiveCreditNoteValues: CREDIT_NOTE_POSITIVE_VALUES_MESSAGE,
} as const;

/**
 * Portugal line limits. The fiscal designation printed on the document and exported
 * in SAF-T is a short one; anything longer belongs in the description, which stays
 * unbounded and is printed underneath.
 */
export const PORTUGAL_ITEM_NAME_MIN_LENGTH = 2;
export const PORTUGAL_ITEM_NAME_MAX_LENGTH = 200;
export const PORTUGAL_ITEM_UNIT_MAX_LENGTH = 20;
/** SAF-T's fallback when a line carries no unit of measure. */
export const PORTUGAL_DEFAULT_ITEM_UNIT = "UN";

const PORTUGAL_ITEM_NAME_TOO_SHORT_MESSAGE = "Portuguese line names need at least 2 characters.";
const PORTUGAL_ITEM_NAME_TOO_LONG_MESSAGE =
  "Portuguese line names are limited to 200 characters. Put the longer wording in the description.";
const PORTUGAL_ITEM_UNIT_TOO_LONG_MESSAGE = "Portuguese units are limited to 20 characters.";
const PORTUGAL_ITEM_TAX_REQUIRED_MESSAGE = "Pick the tax treatment for this line. Portugal needs one on every line.";
const PORTUGAL_ITEM_SINGLE_TAX_MESSAGE = "Portugal accepts one tax treatment per line. Split the line instead.";
/**
 * The line-level picker is a short labelled control, so it carries the shared `Required`
 * wording every locale already translates instead of a sentence of its own.
 */
const PORTUGAL_ITEM_CLASSIFICATION_REQUIRED_MESSAGE = "Required";

export const portugalDocumentItemMessages = {
  nameTooShort: PORTUGAL_ITEM_NAME_TOO_SHORT_MESSAGE,
  nameTooLong: PORTUGAL_ITEM_NAME_TOO_LONG_MESSAGE,
  unitTooLong: PORTUGAL_ITEM_UNIT_TOO_LONG_MESSAGE,
  taxRequired: PORTUGAL_ITEM_TAX_REQUIRED_MESSAGE,
  singleTax: PORTUGAL_ITEM_SINGLE_TAX_MESSAGE,
  classificationRequired: PORTUGAL_ITEM_CLASSIFICATION_REQUIRED_MESSAGE,
} as const;

export type PortugalDocumentItemIssue = {
  index: number;
  field: "name" | "unit" | "taxes" | "classification";
  message: string;
};

/**
 * A line states its tax treatment in one of the three forms the API accepts: a saved
 * tax picked by `tax_id`, an inline `rate` — where 0% is a real rate a Portuguese
 * exemption relies on, not an absent one — or a `classification` naming the treatment.
 * Anything else is the empty row the item form starts with, or a malformed entry that
 * cannot stand for a treatment either way.
 */
function isExplicitTax(tax: unknown): boolean {
  if (tax == null || typeof tax !== "object" || Array.isArray(tax)) return false;

  const { tax_id: taxId, rate, classification } = tax as Record<string, unknown>;

  if (typeof taxId === "string" && taxId.trim() !== "") return true;
  // Only a finite number is a rate: NaN and Infinity arrive from unparsed input.
  if (typeof rate === "number" && Number.isFinite(rate)) return true;

  return typeof classification === "string" && classification.trim() !== "";
}

function countExplicitTaxes(taxesValue: unknown): number {
  if (!Array.isArray(taxesValue)) return 0;

  return taxesValue.filter(isExplicitTax).length;
}

/**
 * Every Portugal line problem the API would reject on submit, so the issuer sees it
 * on the line that caused it instead of as a 422 after filling the whole document.
 * Portugal requires explicit fiscal tax treatment even for reverse-charge sales;
 * its forms keep the tax picker available for choosing the applicable exemption.
 */
export function getPortugalDocumentItemIssues(items: unknown): PortugalDocumentItemIssue[] {
  if (!Array.isArray(items)) return [];

  const issues: PortugalDocumentItemIssue[] = [];

  items.forEach((rawItem, index) => {
    const item = (rawItem ?? {}) as Record<string, unknown>;
    if (item.type === "separator") return;

    const name = typeof item.name === "string" ? item.name.trim() : "";
    // A line that only carries a saved item resolves its name on the API side.
    if (name !== "") {
      if (name.length < PORTUGAL_ITEM_NAME_MIN_LENGTH) {
        issues.push({ index, field: "name", message: PORTUGAL_ITEM_NAME_TOO_SHORT_MESSAGE });
      } else if (name.length > PORTUGAL_ITEM_NAME_MAX_LENGTH) {
        issues.push({ index, field: "name", message: PORTUGAL_ITEM_NAME_TOO_LONG_MESSAGE });
      }
    }

    // SAF-T types every line as a product, a service or an advance. A line that carries a
    // saved catalog item inherits that typing from the item on the API side — and its picker
    // is locked to the saved snapshot here — so only an ad-hoc line has to state it.
    const itemId = typeof item.item_id === "string" ? item.item_id.trim() : "";
    const classification = typeof item.classification === "string" ? item.classification.trim() : "";
    if (itemId === "" && classification === "") {
      issues.push({ index, field: "classification", message: PORTUGAL_ITEM_CLASSIFICATION_REQUIRED_MESSAGE });
    }

    const unit = typeof item.unit === "string" ? item.unit.trim() : "";
    // An empty unit is not a problem: SAF-T exports it as UN.
    if (unit.length > PORTUGAL_ITEM_UNIT_MAX_LENGTH) {
      issues.push({ index, field: "unit", message: PORTUGAL_ITEM_UNIT_TOO_LONG_MESSAGE });
    }

    const taxCount = countExplicitTaxes(item.taxes);
    if (taxCount === 0) {
      issues.push({ index, field: "taxes", message: PORTUGAL_ITEM_TAX_REQUIRED_MESSAGE });
    } else if (taxCount > 1) {
      issues.push({ index, field: "taxes", message: PORTUGAL_ITEM_SINGLE_TAX_MESSAGE });
    }
  });

  return issues;
}

/**
 * Wrap a document form schema with the Portugal line rules.
 */
export function withPortugalDocumentItems<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const items = (value as { items?: unknown } | undefined)?.items;

    for (const issue of getPortugalDocumentItemIssues(items)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items", issue.index, issue.field],
        message: issue.message,
      });
    }
  });
}

export function withPositiveCreditNoteItemValues<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const items = (value as { items?: Array<Record<string, unknown>> } | undefined)?.items;
    if (!Array.isArray(items)) return;

    items.forEach((item, index) => {
      if (item?.type === "separator") return;

      const fields = [
        ["quantity", item?.quantity],
        ["price", item?.price],
        ["gross_price", item?.gross_price],
      ] as const;

      for (const [field, amount] of fields) {
        if (typeof amount === "number" && !Number.isNaN(amount) && amount < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index, field],
            message: CREDIT_NOTE_POSITIVE_VALUES_MESSAGE,
          });
        }
      }
    });
  });
}
