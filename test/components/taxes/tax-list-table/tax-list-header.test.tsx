import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
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

  test("renders all expected columns", () => {
    render(
      <TableWrapper>
        <TaxListHeader t={t} />
      </TableWrapper>,
    );

    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThanOrEqual(3);
  });

  test("applies translation function to header labels", () => {
    const customT = (key: string) => {
      const map: Record<string, string> = {
        Name: "Naziv",
        "Tax Rates": "Davčne stopnje",
        Created: "Ustvarjeno",
      };
      return map[key] ?? key;
    };

    render(
      <TableWrapper>
        <TaxListHeader t={customT} />
      </TableWrapper>,
    );

    expect(screen.getByText("Naziv")).toBeInTheDocument();
    expect(screen.getByText("Davčne stopnje")).toBeInTheDocument();
    expect(screen.getByText("Ustvarjeno")).toBeInTheDocument();
  });
});
