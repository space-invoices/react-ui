import { z } from "zod";

const ITEM_NAME_REQUIRED_MESSAGE = "Item name is required";
const ITEM_QUANTITY_REQUIRED_MESSAGE = "Quantity is required";
const ITEM_PRICE_REQUIRED_MESSAGE = "Price is required";

export function withRequiredDocumentItemFields<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const items = (value as { items?: Array<Record<string, unknown>> } | undefined)?.items;
    if (!Array.isArray(items)) return;

    items.forEach((item, index) => {
      if (item?.type === "separator") return;

      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const quantity = item?.quantity;
      const price = item?.price;

      if (!name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "name"],
          message: ITEM_NAME_REQUIRED_MESSAGE,
        });
      }

      if (quantity == null || Number.isNaN(quantity)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "quantity"],
          message: ITEM_QUANTITY_REQUIRED_MESSAGE,
        });
      }

      if (price == null || Number.isNaN(price)) {
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
} as const;
