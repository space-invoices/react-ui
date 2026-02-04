import { describe, expect, it } from "bun:test";
import type { Entity } from "@/ui/providers/entities-context";
import { getEntityErrors, getFormFieldErrors, hasEntityErrors, validateEslogForm } from "./eslog-validation";

// Mock entity for testing
const validEntity: Entity = {
  id: "ent_test",
  name: "Test Company d.o.o.",
  address: "Slovenska cesta 1",
  address_2: null,
  post_code: "1000",
  city: "Ljubljana",
  state: null,
  country: "Slovenia",
  country_code: "SI",
  currency_code: "EUR",
  tax_number: "12345678",
  email: null,
  is_tax_subject: true,
  locale: "sl-SI",
  account_id: "acc_test",
  environment: "live",
  settings: {},
  metadata: {},
  country_rules: {
    max_taxes_per_item: 2,
    features: ["eslog", "furs"],
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const validFormValues = {
  number: "2024-001",
  date: "2024-01-15",
  currency_code: "EUR",
  customer: {
    name: "Customer Name",
    address: "Customer Address",
    post_code: "1000",
    city: "Ljubljana",
    country: "Slovenia",
    country_code: "SI",
  },
  items: [
    {
      name: "Product 1",
      quantity: 1,
      price: 100,
      taxes: [{ rate: 22 }],
    },
  ],
};

describe("e-SLOG Validation", () => {
  describe("validateEslogForm", () => {
    it("should return no errors for valid entity and form values", () => {
      const errors = validateEslogForm(validFormValues, validEntity);
      expect(errors).toEqual([]);
    });

    it("should return empty errors when entity is null", () => {
      const errors = validateEslogForm(validFormValues, null);
      expect(errors).toEqual([]);
    });

    describe("Entity validation", () => {
      it("should require entity name", () => {
        const entity = { ...validEntity, name: "" };
        const errors = validateEslogForm(validFormValues, entity);
        expect(errors.some((e) => e.field === "entity.name")).toBe(true);
      });

      it("should require entity address", () => {
        const entity = { ...validEntity, address: null };
        const errors = validateEslogForm(validFormValues, entity as Entity);
        expect(errors.some((e) => e.field === "entity.address")).toBe(true);
      });

      it("should require entity postal code", () => {
        const entity = { ...validEntity, post_code: null };
        const errors = validateEslogForm(validFormValues, entity as Entity);
        expect(errors.some((e) => e.field === "entity.post_code")).toBe(true);
      });

      it("should require entity city", () => {
        const entity = { ...validEntity, city: null };
        const errors = validateEslogForm(validFormValues, entity as Entity);
        expect(errors.some((e) => e.field === "entity.city")).toBe(true);
      });

      it("should require entity country code to be SI", () => {
        const entity = { ...validEntity, country_code: "AT" };
        const errors = validateEslogForm(validFormValues, entity);
        expect(errors.some((e) => e.field === "entity.country_code")).toBe(true);
      });

      it("should require entity tax number", () => {
        const entity = { ...validEntity, tax_number: null };
        const errors = validateEslogForm(validFormValues, entity as Entity);
        expect(errors.some((e) => e.field === "entity.tax_number")).toBe(true);
      });

      it("should require 8-digit tax number", () => {
        const entity = { ...validEntity, tax_number: "123" };
        const errors = validateEslogForm(validFormValues, entity);
        expect(errors.some((e) => e.field === "entity.tax_number" && e.message.includes("8 digits"))).toBe(true);
      });
    });

    describe("Document validation", () => {
      it("should require invoice number", () => {
        const values = { ...validFormValues, number: "" };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field === "number")).toBe(true);
      });

      it("should require invoice date", () => {
        const values = { ...validFormValues, date: undefined };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field === "date")).toBe(true);
      });

      it("should require currency code", () => {
        const values = { ...validFormValues, currency_code: undefined };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field === "currency_code")).toBe(true);
      });
    });

    describe("Customer validation", () => {
      it("should require customer name when customer data is provided", () => {
        const values = {
          ...validFormValues,
          customer: { address: "Some address", name: "" },
        };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field === "customer.name")).toBe(true);
      });

      it("should not require customer at all", () => {
        const values = { ...validFormValues, customer: null };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field.startsWith("customer"))).toBe(false);
      });
    });

    describe("Line items validation", () => {
      it("should require at least one line item", () => {
        const values = { ...validFormValues, items: [] };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field === "items")).toBe(true);
      });

      it("should require item name", () => {
        const values = {
          ...validFormValues,
          items: [{ name: "", quantity: 1, price: 100 }],
        };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field === "items.0.name")).toBe(true);
      });

      it("should require quantity > 0", () => {
        const values = {
          ...validFormValues,
          items: [{ name: "Product", quantity: 0, price: 100 }],
        };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field === "items.0.quantity")).toBe(true);
      });

      it("should require price", () => {
        const values = {
          ...validFormValues,
          items: [{ name: "Product", quantity: 1, price: undefined as any }],
        };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field === "items.0.price")).toBe(true);
      });

      it("should validate Slovenian tax rates", () => {
        const values = {
          ...validFormValues,
          items: [{ name: "Product", quantity: 1, price: 100, taxes: [{ rate: 20 }] }],
        };
        const errors = validateEslogForm(values, validEntity);
        expect(errors.some((e) => e.field === "items.0.taxes")).toBe(true);
      });

      it("should accept valid Slovenian tax rates (22%, 9.5%, 5%, 0%)", () => {
        const validRates = [22, 9.5, 5, 0];
        for (const rate of validRates) {
          const values = {
            ...validFormValues,
            items: [{ name: "Product", quantity: 1, price: 100, taxes: [{ rate }] }],
          };
          const errors = validateEslogForm(values, validEntity);
          expect(errors.some((e) => e.field === "items.0.taxes")).toBe(false);
        }
      });
    });
  });

  describe("hasEntityErrors", () => {
    it("should return true when entity errors exist", () => {
      const errors = [{ field: "entity.name", message: "Required" }];
      expect(hasEntityErrors(errors)).toBe(true);
    });

    it("should return false when no entity errors", () => {
      const errors = [{ field: "number", message: "Required" }];
      expect(hasEntityErrors(errors)).toBe(false);
    });
  });

  describe("getEntityErrors", () => {
    it("should filter entity errors", () => {
      const errors = [
        { field: "entity.name", message: "Required" },
        { field: "number", message: "Required" },
        { field: "entity.address", message: "Required" },
      ];
      const entityErrors = getEntityErrors(errors);
      expect(entityErrors).toHaveLength(2);
      expect(entityErrors.every((e) => e.field.startsWith("entity."))).toBe(true);
    });
  });

  describe("getFormFieldErrors", () => {
    it("should filter non-entity errors", () => {
      const errors = [
        { field: "entity.name", message: "Required" },
        { field: "number", message: "Required" },
        { field: "items.0.name", message: "Required" },
      ];
      const formErrors = getFormFieldErrors(errors);
      expect(formErrors).toHaveLength(2);
      expect(formErrors.every((e) => !e.field.startsWith("entity."))).toBe(true);
    });
  });
});
