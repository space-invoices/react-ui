import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { TaxCollectedCard } from "@/ui/components/dashboard/tax-collected-card/tax-collected-card";

const mockTaxes = [
  { name: "Tax", rate: 22, amount: 1100 },
  { name: "Tax", rate: 9.5, amount: 475 },
];

describe("TaxCollectedCard", () => {
  test("renders title and period label", () => {
    render(
      <TaxCollectedCard title="Previous Month" periodLabel="Jan 2024" taxes={mockTaxes} total={1575} currency="EUR" />,
    );

    expect(screen.getByText("Previous Month")).toBeInTheDocument();
    expect(screen.getByText("Jan 2024")).toBeInTheDocument();
  });

  test("shows skeleton loaders when isLoading", () => {
    render(
      <TaxCollectedCard
        title="Previous Month"
        periodLabel="Jan 2024"
        taxes={[]}
        total={0}
        currency="EUR"
        isLoading={true}
      />,
    );

    // Title still renders, but content has skeletons
    expect(screen.getByText("Previous Month")).toBeInTheDocument();
    // Skeletons are rendered (no period label in loading state)
    expect(screen.queryByText("Jan 2024")).toBeNull();
    // No tax breakdown or "No tax data" text in loading state
    expect(screen.queryByText("No tax data")).toBeNull();
  });

  test("formats currency amounts correctly", () => {
    render(
      <TaxCollectedCard
        title="Previous Month"
        periodLabel="Jan 2024"
        taxes={mockTaxes}
        total={1575}
        currency="EUR"
        locale="en-US"
      />,
    );

    // Total and breakdown amounts should be formatted
    expect(screen.getByText(/1,575/)).toBeInTheDocument();
    expect(screen.getByText(/1,100/)).toBeInTheDocument();
    expect(screen.getByText("Tax 22%")).toBeInTheDocument();
    expect(screen.getByText("Tax 9.5%")).toBeInTheDocument();
  });

  test("shows 'No tax data' when empty", () => {
    render(<TaxCollectedCard title="Previous Month" periodLabel="Jan 2024" taxes={[]} total={0} currency="EUR" />);

    expect(screen.getByText("No tax data")).toBeInTheDocument();
  });
});
