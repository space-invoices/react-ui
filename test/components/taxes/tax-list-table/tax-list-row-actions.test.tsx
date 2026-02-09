import { describe, expect, test } from "bun:test";
import type { Tax } from "@spaceinvoices/js-sdk";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaxListRowActions from "@/ui/components/taxes/tax-list-table/tax-list-row-actions";

const t = (key: string) => key;

const mockTax: Tax = {
  id: "tax-123",
  name: "VAT 22%",
  tax_rates: [{ rate: 22 }],
  is_default: false,
  entity_id: "entity-123",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
} as Tax;

describe("TaxListRowActions", () => {
  test("renders menu trigger button", () => {
    render(<TaxListRowActions tax={mockTax} t={t} />);

    // sr-only text
    expect(screen.getByText("Open menu")).toBeInTheDocument();
  });

  test("shows Copy ID and View items when opened", async () => {
    const user = userEvent.setup();

    render(<TaxListRowActions tax={mockTax} t={t} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Copy tax ID")).toBeInTheDocument();
    expect(screen.getByText("View tax")).toBeInTheDocument();
  });
});
