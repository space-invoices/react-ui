import { describe, expect, test } from "bun:test";
import { prepareInvoiceSubmission } from "./prepare-invoice-submission";

describe("prepareInvoiceSubmission", () => {
  describe("customer data transformation", () => {
    test("sends only customer_id when customer not editable", () => {
      const values: any = {
        customer_id: "cust-123",
        customer: {} as any,
        number: "INV-001",
        date: "2024-01-01",
        date_due: "2024-01-31",
        items: [],
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: { name: "Test Customer" },
      });

      expect(result.customer_id).toBe("cust-123");
      expect(result.customer).toBeUndefined();
    });

    test("sends only customer_id when customer data unchanged", () => {
      const originalCustomer = {
        name: "Test Customer",
        address: "123 Test St",
      };

      const values: any = {
        customer_id: "cust-123",
        customer: originalCustomer as any,
        number: "INV-001",
        date: "2024-01-01",
        date_due: "2024-01-31",
        items: [],
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: true,
        originalCustomer,
      });

      expect(result.customer_id).toBe("cust-123");
      expect(result.customer).toBeUndefined();
    });

    test("sends customer data with save_customer flag when modified", () => {
      const originalCustomer = {
        name: "Test Customer",
        address: "123 Test St",
      };

      const modifiedCustomer = {
        name: "Test Customer Modified",
        address: "456 New St",
      };

      const values: any = {
        customer_id: "cust-123",
        customer: modifiedCustomer as any,
        number: "INV-001",
        date: "2024-01-01",
        date_due: "2024-01-31",
        items: [],
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: true,
        originalCustomer,
      });

      expect(result.customer_id).toBe("cust-123");
      expect(result.customer).toEqual({
        ...modifiedCustomer,
        save_customer: true,
      });
    });

    test("creates new customer when customer_id not provided", () => {
      const newCustomer = {
        name: "New Customer",
        address: "789 Fresh St",
        city: "New City",
      };

      const values: any = {
        customer: newCustomer as any,
        number: "INV-001",
        date: "2024-01-01",
        date_due: "2024-01-31",
        items: [],
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.customer_id).toBeUndefined();
      expect(result.customer).toEqual({
        ...newCustomer,
        save_customer: true,
      });
    });

    test("removes empty customer fields from submission", () => {
      const customerWithEmpty = {
        name: "Customer",
        address: "",
        city: null,
        state: undefined,
        post_code: "12345",
      };

      const values: any = {
        customer: customerWithEmpty as any,
        number: "INV-001",
        date: "2024-01-01",
        date_due: "2024-01-31",
        items: [],
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.customer).toEqual({
        name: "Customer",
        post_code: "12345",
        save_customer: true,
      });
    });

    test("removes customer completely when all fields are empty", () => {
      const emptyCustomer = {
        name: "",
        address: "",
        city: null,
        state: undefined,
      };

      const values: any = {
        customer: emptyCustomer as any,
        number: "INV-001",
        date: "2024-01-01",
        date_due: "2024-01-31",
        items: [],
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.customer).toBeUndefined();
    });

    test("removes customer_id when empty", () => {
      const values: any = {
        customer_id: "",
        number: "INV-001",
        date: "2024-01-01",
        date_due: "2024-01-31",
        items: [],
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.customer_id).toBeUndefined();
    });
  });

  describe("date conversion", () => {
    test("converts date string to Date object", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.date).toBeInstanceOf(Date);
      expect((result.date as Date).toISOString()).toContain("2024-01-15");
    });

    test("converts date_due string to Date object", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.date_due).toBeInstanceOf(Date);
      expect((result.date_due as Date).toISOString()).toContain("2024-02-15");
    });

    test("handles undefined dates", () => {
      const values: any = {
        number: "INV-001",
        items: [],
      } as any;

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.date).toBeUndefined();
      expect(result.date_due).toBeUndefined();
    });
  });

  describe("payment data", () => {
    test("adds payment data when markAsPaid is true", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        markAsPaid: true,
        paymentTypes: ["bank_transfer"],
      });

      expect(result.payments).toBeDefined();
      expect(result.payments?.[0]?.type).toBe("bank_transfer");
      expect(result.payments?.[0]?.date).toBeInstanceOf(Date);
    });

    test("uses correct payment type", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        markAsPaid: true,
        paymentTypes: ["cash"],
      });

      expect(result.payments?.[0]?.type).toBe("cash");
    });

    test("uses default payment type when not specified", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        markAsPaid: true,
      });

      expect(result.payments).toBeUndefined();
    });

    test("does not add payment data when markAsPaid is false", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        markAsPaid: false,
      });

      expect(result.payments).toBeUndefined();
    });

    test("does not add payment data when markAsPaid not provided", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.payments).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    test("handles customer with partial data", () => {
      const customer = {
        name: "Partial Customer",
        city: "Test City",
        // Missing other fields
      };

      const values: any = {
        customer: customer as any,
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.customer).toEqual({
        name: "Partial Customer",
        city: "Test City",
        save_customer: true,
      });
    });

    test("preserves other invoice fields", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [
          {
            name: "Item 1",
            description: "Description",
            quantity: 1,
            price: 100,
          },
        ] as any,
        note: "Test notes",
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe("Item 1");
      expect(result.note).toBe("Test notes");
    });

    test("never includes number in payload (server auto-generates)", () => {
      const values: any = {
        number: "INV-001", // Even if form has a preview number
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      // Number should never be sent - server always generates it
      expect(result.number).toBeUndefined();
    });
  });

  describe("gross price transformation", () => {
    test("transforms items with priceModes[index]=true to send gross_price", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [
          {
            name: "Item 1",
            quantity: 1,
            price: 122,
            taxes: [{ tax_id: "tax-1" }],
          },
        ] as any,
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        priceModes: { 0: true },
      });

      expect(result.items[0].gross_price).toBe(122);
      expect(result.items[0].price).toBeUndefined();
    });

    test("transforms items with priceModes[index]=false to send price", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [
          {
            name: "Item 1",
            quantity: 1,
            price: 100,
            taxes: [{ tax_id: "tax-1" }],
          },
        ] as any,
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        priceModes: { 0: false },
      });

      expect(result.items[0].price).toBe(100);
      expect(result.items[0].gross_price).toBeUndefined();
    });

    test("defaults to net price when priceModes not provided", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [
          {
            name: "Item 1",
            quantity: 1,
            price: 100,
            taxes: [{ tax_id: "tax-1" }],
          },
        ] as any,
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.items[0].price).toBe(100);
      expect(result.items[0].gross_price).toBeUndefined();
    });

    test("handles mixed net and gross price items via priceModes", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [
          {
            name: "Net Item",
            quantity: 1,
            price: 100,
            taxes: [{ tax_id: "tax-1" }],
          },
          {
            name: "Gross Item",
            quantity: 2,
            price: 244,
            taxes: [{ tax_id: "tax-1" }],
          },
        ] as any,
      };

      const result = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        priceModes: { 0: false, 1: true },
      });

      expect(result.items[0].price).toBe(100);
      expect(result.items[0].gross_price).toBeUndefined();
      expect(result.items[1].gross_price).toBe(244);
      expect(result.items[1].price).toBeUndefined();
    });
  });

  describe("FURS fiscalization data", () => {
    test("adds FURS data when premise and device provided", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        furs: {
          business_premise_name: "P1",
          electronic_device_name: "E1",
        },
      });

      expect(result.furs).toEqual({
        business_premise_name: "P1",
        electronic_device_name: "E1",
      });
    });

    test("does not add FURS data when no options provided", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
      });

      expect(result.furs).toBeUndefined();
    });

    test("does not add FURS data when only premise provided", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        furs: {
          business_premise_name: "P1",
        },
      });

      expect(result.furs).toBeUndefined();
    });

    test("does not add FURS data when only device provided", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        furs: {
          electronic_device_name: "E1",
        },
      });

      expect(result.furs).toBeUndefined();
    });

    test("adds skip flag when skip fiscalization is true", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        furs: {
          skip: true,
        },
      });

      expect(result.furs).toEqual({ skip: true });
    });

    test("skip flag takes precedence over premise/device", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        furs: {
          skip: true,
          business_premise_name: "P1",
          electronic_device_name: "E1",
        },
      });

      // Skip should take precedence - don't send premise/device
      expect(result.furs).toEqual({ skip: true });
    });

    test("FURS data works with payment data", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        markAsPaid: true,
        paymentTypes: ["cash"],
        furs: {
          business_premise_name: "P1",
          electronic_device_name: "E1",
        },
      });

      expect(result.furs).toEqual({
        business_premise_name: "P1",
        electronic_device_name: "E1",
      });
      expect(result.payments).toBeDefined();
      expect(result.payments?.[0]?.type).toBe("cash");
    });
  });

  describe("draft invoices", () => {
    test("sets is_draft to true when isDraft option is true", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        isDraft: true,
      });

      expect(result.is_draft).toBe(true);
    });

    test("does not set is_draft when isDraft is false", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        isDraft: false,
      });

      expect(result.is_draft).toBeUndefined();
    });

    test("draft invoice without FURS data (form skips FURS for drafts)", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      // Form component passes undefined for furs when isDraft=true
      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        isDraft: true,
        // furs: undefined (not passed for drafts)
      });

      expect(result.is_draft).toBe(true);
      expect(result.furs).toBeUndefined();
    });

    test("draft invoice without e-SLOG validation (form skips e-SLOG for drafts)", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      // Form component passes undefined for eslog when isDraft=true
      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        isDraft: true,
        // eslog: undefined (not passed for drafts)
      });

      expect(result.is_draft).toBe(true);
      expect(result.eslog).toBeUndefined();
    });

    test("draft invoice without payment data (form skips markAsPaid for drafts)", () => {
      const values: any = {
        number: "INV-001",
        date: "2024-01-15",
        date_due: "2024-02-15",
        items: [],
      };

      // Form component passes markAsPaid=false when isDraft=true
      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        isDraft: true,
        markAsPaid: false,
      });

      expect(result.is_draft).toBe(true);
      expect(result.payment).toBeUndefined();
    });

    test("draft invoice preserves all other invoice data", () => {
      const values: any = {
        number: "DRAFT-123",
        date: "2024-01-15",
        date_due: "2024-02-15",
        customer_id: "cust-123",
        items: [
          {
            name: "Item 1",
            quantity: 2,
            price: 100,
            taxes: [{ tax_id: "tax-1" }],
          },
        ] as any,
        note: "Draft note",
        currency_code: "EUR",
      };

      const result: any = prepareInvoiceSubmission(values, {
        wasCustomerFormShown: false,
        originalCustomer: null,
        isDraft: true,
      });

      expect(result.is_draft).toBe(true);
      expect(result.number).toBeUndefined(); // Number is never sent - server auto-generates
      expect(result.customer_id).toBe("cust-123");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe("Item 1");
      expect(result.note).toBe("Draft note");
      expect(result.currency_code).toBe("EUR");
    });
  });
});
