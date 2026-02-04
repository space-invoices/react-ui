import { describe, expect, test } from "bun:test";
import { prepareDocumentSubmission } from "./prepare-document-submission";

describe("prepareDocumentSubmission", () => {
  describe("isDraft option", () => {
    test("sets is_draft to true when isDraft option is true", () => {
      const values = {
        number: "INV-001",
        date: "2024-01-15",
        items: [],
      };

      const result = prepareDocumentSubmission(values, {
        originalCustomer: null,
        documentType: "invoice",
        isDraft: true,
      });

      expect(result.is_draft).toBe(true);
    });

    test("does not set is_draft when isDraft option is false", () => {
      const values = {
        number: "INV-001",
        date: "2024-01-15",
        items: [],
      };

      const result = prepareDocumentSubmission(values, {
        originalCustomer: null,
        documentType: "invoice",
        isDraft: false,
      });

      expect(result.is_draft).toBeUndefined();
    });

    test("does not set is_draft when isDraft option is not provided", () => {
      const values = {
        number: "INV-001",
        date: "2024-01-15",
        items: [],
      };

      const result = prepareDocumentSubmission(values, {
        originalCustomer: null,
        documentType: "invoice",
      });

      expect(result.is_draft).toBeUndefined();
    });

    test("isDraft works with all document types", () => {
      const documentTypes = ["invoice", "estimate", "credit_note", "advance_invoice"] as const;

      for (const docType of documentTypes) {
        const values = {
          date: "2024-01-15",
          items: [],
        };

        const result = prepareDocumentSubmission(values, {
          originalCustomer: null,
          documentType: docType,
          isDraft: true,
        });

        expect(result.is_draft).toBe(true);
      }
    });

    test("isDraft preserves other payload fields", () => {
      const values = {
        number: "INV-001", // number is intentionally removed by prepareDocumentSubmission
        date: "2024-01-15",
        items: [{ name: "Item 1", quantity: 1, price: 100 }],
        note: "Test note",
        currency_code: "EUR",
      };

      const result = prepareDocumentSubmission(values, {
        originalCustomer: null,
        documentType: "invoice",
        isDraft: true,
        secondaryDate: "2024-02-15",
      });

      expect(result.is_draft).toBe(true);
      expect(result.number).toBeUndefined(); // number is always server-generated
      expect(result.note).toBe("Test note");
      expect(result.currency_code).toBe("EUR");
      expect(result.items).toHaveLength(1);
      expect(result.date_due).toBeInstanceOf(Date);
    });

    test("isDraft works with customer data", () => {
      const values = {
        date: "2024-01-15",
        customer_id: "cust-123",
        items: [],
      };

      const result = prepareDocumentSubmission(values, {
        originalCustomer: null,
        documentType: "invoice",
        isDraft: true,
      });

      expect(result.is_draft).toBe(true);
      expect(result.customer_id).toBe("cust-123");
    });

    test("isDraft works with markAsPaid (both can be set)", () => {
      const values = {
        date: "2024-01-15",
        items: [],
      };

      const result = prepareDocumentSubmission(values, {
        originalCustomer: null,
        documentType: "invoice",
        isDraft: true,
        markAsPaid: true,
        paymentType: "cash",
      });

      // Both flags can technically be set, though the form logic prevents this
      expect(result.is_draft).toBe(true);
      expect(result.payment).toBeDefined();
    });
  });
});
