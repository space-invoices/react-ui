import { describe, expect, mock, test } from "bun:test";
import type { Tax } from "@spaceinvoices/js-sdk";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TaxListRow from "@/ui/components/taxes/tax-list-table/tax-list-row";

const t = (key: string) => key;

const mockTax: Tax = {
  id: "tax-123",
  name: "VAT 22%",
  tax_rates: [{ rate: 22 }, { rate: 10 }],
  is_default: false,
  entity_id: "entity-123",
  created_at: "2024-06-15T00:00:00.000Z",
  updated_at: "2024-06-15T00:00:00.000Z",
} as Tax;

// Table wrapper for proper DOM structure
function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <table>
      <tbody>{children}</tbody>
    </table>
  );
}

describe("TaxListRow", () => {
  test("renders tax name and formatted rates", () => {
    render(
      <TableWrapper>
        <TaxListRow tax={mockTax} t={t} />
      </TableWrapper>,
    );

    expect(screen.getByText("VAT 22%")).toBeInTheDocument();
    expect(screen.getByText("22%, 10%")).toBeInTheDocument();
  });

  test("shows Default badge when is_default=true", () => {
    const defaultTax = { ...mockTax, is_default: true } as Tax;

    render(
      <TableWrapper>
        <TaxListRow tax={defaultTax} t={t} />
      </TableWrapper>,
    );

    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  test("hides badge when is_default=false", () => {
    render(
      <TableWrapper>
        <TaxListRow tax={mockTax} t={t} />
      </TableWrapper>,
    );

    expect(screen.queryByText("Default")).toBeNull();
  });

  test("calls onRowClick on name click", async () => {
    const onRowClick = mock();
    const user = userEvent.setup();

    render(
      <TableWrapper>
        <TaxListRow tax={mockTax} onRowClick={onRowClick} t={t} />
      </TableWrapper>,
    );

    await user.click(screen.getByText("VAT 22%"));

    expect(onRowClick).toHaveBeenCalledWith(mockTax);
  });
});
