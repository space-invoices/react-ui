import { describe, expect, test } from "bun:test";
import { filterUnresolvedTaxes } from "./prepare-preview-data";

describe("filterUnresolvedTaxes", () => {
  test("returns empty array for undefined items", () => {
    const result = filterUnresolvedTaxes(undefined);
    expect(result).toEqual([]);
  });

  test("returns empty array for empty items", () => {
    const result = filterUnresolvedTaxes([]);
    expect(result).toEqual([]);
  });

  test("preserves items without taxes", () => {
    const items = [{ name: "Item 1", quantity: 1, price: 100 }];
    const result = filterUnresolvedTaxes(items as any);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Item 1");
    expect(result[0].taxes).toEqual([]);
  });

  test("preserves items with empty taxes array", () => {
    const items = [{ name: "Item 1", quantity: 1, price: 100, taxes: [] }];
    const result = filterUnresolvedTaxes(items as any);

    expect(result).toHaveLength(1);
    expect(result[0].taxes).toEqual([]);
  });

  test("filters out taxes with undefined tax_id", () => {
    const items = [
      {
        name: "Item 1",
        quantity: 1,
        price: 100,
        taxes: [{ tax_id: undefined }],
      },
    ];
    const result = filterUnresolvedTaxes(items as any);

    expect(result).toHaveLength(1);
    expect(result[0].taxes).toEqual([]);
  });

  test("filters out taxes with null tax_id", () => {
    const items = [
      {
        name: "Item 1",
        quantity: 1,
        price: 100,
        taxes: [{ tax_id: null }],
      },
    ];
    const result = filterUnresolvedTaxes(items as any);

    expect(result).toHaveLength(1);
    expect(result[0].taxes).toEqual([]);
  });

  test("preserves taxes with valid tax_id", () => {
    const items = [
      {
        name: "Item 1",
        quantity: 1,
        price: 100,
        taxes: [{ tax_id: "tax-123" }],
      },
    ];
    const result = filterUnresolvedTaxes(items as any);

    expect(result).toHaveLength(1);
    expect(result[0].taxes).toEqual([{ tax_id: "tax-123" }]);
  });

  test("filters mixed valid and invalid taxes", () => {
    const items = [
      {
        name: "Item 1",
        quantity: 1,
        price: 100,
        taxes: [{ tax_id: undefined }, { tax_id: "tax-123" }, { tax_id: null }],
      },
    ];
    const result = filterUnresolvedTaxes(items as any);

    expect(result).toHaveLength(1);
    expect(result[0].taxes).toEqual([{ tax_id: "tax-123" }]);
  });

  test("handles multiple items with different tax states", () => {
    const items = [
      {
        name: "Item 1",
        quantity: 1,
        price: 100,
        taxes: [{ tax_id: undefined }],
      },
      {
        name: "Item 2",
        quantity: 2,
        price: 200,
        taxes: [{ tax_id: "tax-456" }],
      },
      {
        name: "Item 3",
        quantity: 3,
        price: 300,
        taxes: [],
      },
    ];
    const result = filterUnresolvedTaxes(items as any);

    expect(result).toHaveLength(3);
    expect(result[0].taxes).toEqual([]);
    expect(result[1].taxes).toEqual([{ tax_id: "tax-456" }]);
    expect(result[2].taxes).toEqual([]);
  });

  test("preserves other item properties", () => {
    const items = [
      {
        name: "Test Item",
        description: "A test description",
        quantity: 5,
        price: 99.99,
        unit: "pcs",
        taxes: [{ tax_id: "tax-123", rate: 22 }],
      },
    ];
    const result = filterUnresolvedTaxes(items as any);

    expect(result[0].name).toBe("Test Item");
    expect(result[0].description).toBe("A test description");
    expect(result[0].quantity).toBe(5);
    expect(result[0].price).toBe(99.99);
    expect(result[0].unit).toBe("pcs");
    expect(result[0].taxes).toEqual([{ tax_id: "tax-123", rate: 22 }]);
  });

  test("preserves tax properties other than tax_id when valid", () => {
    const items = [
      {
        name: "Item 1",
        quantity: 1,
        price: 100,
        taxes: [{ tax_id: "tax-123", rate: 22, name: "VAT" }],
      },
    ];
    const result = filterUnresolvedTaxes(items as any);

    expect(result[0].taxes).toEqual([{ tax_id: "tax-123", rate: 22, name: "VAT" }]);
  });
});
