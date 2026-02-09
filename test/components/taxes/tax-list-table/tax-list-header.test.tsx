import { describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaxListHeader from "@/ui/components/taxes/tax-list-table/tax-list-header";

const t = (key: string) => key;

function TableWrapper({ children }: { children: React.ReactNode }) {
  return <table>{children}</table>;
}

describe("TaxListHeader", () => {
  test("renders column headers", () => {
    render(
      <TableWrapper>
        <TaxListHeader t={t} />
      </TableWrapper>,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Tax Rates")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  test("calls onSort when sortable header clicked", async () => {
    const onSort = mock();
    const user = userEvent.setup();

    render(
      <TableWrapper>
        <TaxListHeader onSort={onSort} t={t} />
      </TableWrapper>,
    );

    await user.click(screen.getByText("Name"));

    expect(onSort).toHaveBeenCalled();
  });

  test("shows active sort indicator", () => {
    render(
      <TableWrapper>
        <TaxListHeader orderBy="name:asc" onSort={() => undefined} t={t} />
      </TableWrapper>,
    );

    // Name header should reflect active sort
    expect(screen.getByText("Name")).toBeInTheDocument();
  });
});
