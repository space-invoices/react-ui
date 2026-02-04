import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { TableEmptyState } from "@/ui/components/table/table-empty-state";
import { TableNoResults } from "@/ui/components/table/table-no-results";
import { Table, TableBody } from "@/ui/components/ui/table";

describe("TableEmptyState", () => {
  it("should render with default height for 10 rows", () => {
    const { container } = render(<TableEmptyState resource="invoices" />);

    const emptyState = container.querySelector("[style]");
    expect(emptyState?.getAttribute("style")).toContain("height: 530px"); // 10 * 53px
  });

  it("should render with dynamic height based on rows prop", () => {
    const { container } = render(<TableEmptyState resource="invoices" rows={5} />);

    const emptyState = container.querySelector("[style]");
    expect(emptyState?.getAttribute("style")).toContain("height: 265px"); // 5 * 53px
  });

  it("should enforce minimum height of 200px", () => {
    const { container } = render(<TableEmptyState resource="invoices" rows={2} />);

    const emptyState = container.querySelector("[style]");
    expect(emptyState?.getAttribute("style")).toContain("height: 200px"); // min 200px
  });

  it("should display resource name in message", () => {
    render(<TableEmptyState resource="customers" />);

    expect(screen.getByText(/customers/i)).toBeInTheDocument();
    expect(screen.getByText(/list is empty/i)).toBeInTheDocument();
  });

  it("should render create link when provided", () => {
    render(<TableEmptyState resource="items" createNewLink="/items/new" />);

    // Button component renders links with role="button"
    const link = screen.getByRole("button", { name: /create items/i });
    expect(link).toHaveAttribute("href", "/items/new");
  });

  it("should render create trigger when provided", () => {
    render(<TableEmptyState resource="invoices" createNewTrigger={<button type="button">Create Invoice</button>} />);

    expect(screen.getByRole("button", { name: /create invoice/i })).toBeInTheDocument();
  });
});

describe("TableNoResults", () => {
  const renderInTable = (children: React.ReactNode) => {
    return render(
      <Table>
        <TableBody>{children}</TableBody>
      </Table>,
    );
  };

  it("should render with default height for 10 rows", () => {
    const { container } = renderInTable(<TableNoResults resource="invoices" />);

    const cell = container.querySelector("td");
    expect(cell?.getAttribute("style")).toContain("height: 530px"); // 10 * 53px
  });

  it("should render with dynamic height based on rows prop", () => {
    const { container } = renderInTable(<TableNoResults resource="invoices" rows={5} />);

    const cell = container.querySelector("td");
    expect(cell?.getAttribute("style")).toContain("height: 265px"); // 5 * 53px
  });

  it("should enforce minimum height of 150px", () => {
    const { container } = renderInTable(<TableNoResults resource="invoices" rows={1} />);

    const cell = container.querySelector("td");
    expect(cell?.getAttribute("style")).toContain("height: 150px"); // min 150px
  });

  it("should display no results message", () => {
    renderInTable(<TableNoResults resource="customers" />);

    expect(screen.getByText(/No customers found/i)).toBeInTheDocument();
  });

  it("should render search callback button when provided", () => {
    const searchFn = () => {
      // no-op for test
    };
    renderInTable(<TableNoResults resource="items" search={searchFn} />);

    expect(screen.getByRole("button", { name: /clear search/i })).toBeInTheDocument();
  });
});
