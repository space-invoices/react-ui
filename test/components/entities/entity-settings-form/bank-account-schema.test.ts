/**
 * Bank Account Schema Validation Tests
 * Tests the Zod schema validation for bank account fields in EntitySettingsForm
 */

import { describe, expect, test } from "bun:test";
import { z } from "zod";

// Recreate the bank account related schema validations from entity-settings-form.tsx
const bankAccountIbanSchema = z
  .union([z.string(), z.null()])
  .refine((val) => !val || /^[A-Z]{2}[0-9A-Z]{2,32}$/.test(val.replace(/\s/g, "")), {
    message: "Must be a valid IBAN",
  })
  .optional();

const upnQrPurposeCodeSchema = z
  .union([z.string(), z.null()])
  .refine((val) => !val || /^[A-Z]{4}$/.test(val), {
    message: "Must be a 4-letter uppercase code (e.g., OTHR)",
  })
  .optional();

const bankAccountNameSchema = z.union([z.string(), z.null()]).optional();
const bankAccountBankNameSchema = z.union([z.string(), z.null()]).optional();
const bankAccountBicSchema = z.union([z.string(), z.null()]).optional();

describe("Bank Account Schema Validation", () => {
  describe("IBAN validation", () => {
    test("should accept valid Slovenian IBAN", () => {
      const result = bankAccountIbanSchema.safeParse("SI56012345678901234");
      expect(result.success).toBe(true);
    });

    test("should accept valid German IBAN", () => {
      const result = bankAccountIbanSchema.safeParse("DE89370400440532013000");
      expect(result.success).toBe(true);
    });

    test("should accept valid IBAN with spaces (normalized)", () => {
      // Spaces should be stripped before validation
      const result = bankAccountIbanSchema.safeParse("SI56 0123 4567 8901 234");
      expect(result.success).toBe(true);
    });

    test("should accept null", () => {
      const result = bankAccountIbanSchema.safeParse(null);
      expect(result.success).toBe(true);
    });

    test("should accept empty string (falsy)", () => {
      const result = bankAccountIbanSchema.safeParse("");
      expect(result.success).toBe(true);
    });

    test("should reject IBAN without country code", () => {
      const result = bankAccountIbanSchema.safeParse("12345678901234");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Must be a valid IBAN");
      }
    });

    test("should reject IBAN with lowercase country code", () => {
      const result = bankAccountIbanSchema.safeParse("si56012345678901234");
      expect(result.success).toBe(false);
    });

    test("should reject IBAN with only country code", () => {
      // Regex requires at least 2 characters after country code
      const result = bankAccountIbanSchema.safeParse("SI5");
      expect(result.success).toBe(false);
    });

    test("should reject IBAN with invalid characters", () => {
      const result = bankAccountIbanSchema.safeParse("SI56-0123-4567-8901");
      expect(result.success).toBe(false);
    });
  });

  describe("UPN QR purpose code validation", () => {
    test("should accept OTHR", () => {
      const result = upnQrPurposeCodeSchema.safeParse("OTHR");
      expect(result.success).toBe(true);
    });

    test("should accept GDSV", () => {
      const result = upnQrPurposeCodeSchema.safeParse("GDSV");
      expect(result.success).toBe(true);
    });

    test("should accept SUPP", () => {
      const result = upnQrPurposeCodeSchema.safeParse("SUPP");
      expect(result.success).toBe(true);
    });

    test("should accept any 4-letter uppercase code", () => {
      const result = upnQrPurposeCodeSchema.safeParse("ABCD");
      expect(result.success).toBe(true);
    });

    test("should accept null", () => {
      const result = upnQrPurposeCodeSchema.safeParse(null);
      expect(result.success).toBe(true);
    });

    test("should accept empty string (falsy)", () => {
      const result = upnQrPurposeCodeSchema.safeParse("");
      expect(result.success).toBe(true);
    });

    test("should reject lowercase code", () => {
      const result = upnQrPurposeCodeSchema.safeParse("othr");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Must be a 4-letter uppercase code (e.g., OTHR)");
      }
    });

    test("should reject code with numbers", () => {
      const result = upnQrPurposeCodeSchema.safeParse("OTH1");
      expect(result.success).toBe(false);
    });

    test("should reject code that is too short", () => {
      const result = upnQrPurposeCodeSchema.safeParse("OTH");
      expect(result.success).toBe(false);
    });

    test("should reject code that is too long", () => {
      const result = upnQrPurposeCodeSchema.safeParse("OTHER");
      expect(result.success).toBe(false);
    });
  });

  describe("Bank account name validation", () => {
    test("should accept valid name", () => {
      const result = bankAccountNameSchema.safeParse("Main Business Account");
      expect(result.success).toBe(true);
    });

    test("should accept null", () => {
      const result = bankAccountNameSchema.safeParse(null);
      expect(result.success).toBe(true);
    });

    test("should accept empty string", () => {
      const result = bankAccountNameSchema.safeParse("");
      expect(result.success).toBe(true);
    });
  });

  describe("Bank name validation", () => {
    test("should accept valid bank name", () => {
      const result = bankAccountBankNameSchema.safeParse("NLB d.d.");
      expect(result.success).toBe(true);
    });

    test("should accept null", () => {
      const result = bankAccountBankNameSchema.safeParse(null);
      expect(result.success).toBe(true);
    });
  });

  describe("BIC validation", () => {
    test("should accept valid BIC", () => {
      const result = bankAccountBicSchema.safeParse("LJBASI2X");
      expect(result.success).toBe(true);
    });

    test("should accept null", () => {
      const result = bankAccountBicSchema.safeParse(null);
      expect(result.success).toBe(true);
    });
  });
});

describe("Bank account payload transformation", () => {
  // Test the transformation logic from form values to API payload
  // This mirrors the onSubmit logic in entity-settings-form.tsx

  const transformBankAccountPayload = (formValues: {
    bank_account_iban?: string | null;
    bank_account_name?: string | null;
    bank_account_bank_name?: string | null;
    bank_account_bic?: string | null;
  }) => {
    return formValues.bank_account_iban
      ? [
          {
            type: "iban" as const,
            iban: formValues.bank_account_iban,
            name: formValues.bank_account_name || undefined,
            bank_name: formValues.bank_account_bank_name || undefined,
            bic: formValues.bank_account_bic || undefined,
            is_default: true,
          },
        ]
      : undefined;
  };

  test("should create bank account array when IBAN is provided", () => {
    const result = transformBankAccountPayload({
      bank_account_iban: "SI56012345678901234",
      bank_account_name: "Main Account",
      bank_account_bank_name: "NLB d.d.",
      bank_account_bic: "LJBASI2X",
    });

    expect(result).toEqual([
      {
        type: "iban",
        iban: "SI56012345678901234",
        name: "Main Account",
        bank_name: "NLB d.d.",
        bic: "LJBASI2X",
        is_default: true,
      },
    ]);
  });

  test("should omit optional fields when not provided", () => {
    const result = transformBankAccountPayload({
      bank_account_iban: "SI56012345678901234",
      bank_account_name: null,
      bank_account_bank_name: null,
      bank_account_bic: null,
    });

    expect(result).toEqual([
      {
        type: "iban",
        iban: "SI56012345678901234",
        name: undefined,
        bank_name: undefined,
        bic: undefined,
        is_default: true,
      },
    ]);
  });

  test("should return undefined when no IBAN provided", () => {
    const result = transformBankAccountPayload({
      bank_account_iban: null,
      bank_account_name: "Some Name",
    });

    expect(result).toBeUndefined();
  });

  test("should return undefined when IBAN is empty string", () => {
    const result = transformBankAccountPayload({
      bank_account_iban: "",
    });

    expect(result).toBeUndefined();
  });
});
