import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ChartEmptyState } from "@/ui/components/dashboard";

describe("ChartEmptyState", () => {
  it("should render children with muted styling", () => {
    render(
      <ChartEmptyState>
        <div data-testid="chart-content">Chart Content</div>
      </ChartEmptyState>,
    );

    const content = screen.getByTestId("chart-content");
    expect(content).toBeInTheDocument();

    // Parent should have opacity and grayscale classes
    const parent = content.parentElement;
    expect(parent?.className).toContain("opacity-30");
    expect(parent?.className).toContain("grayscale");
  });

  it("should display default 'No data' label", () => {
    render(
      <ChartEmptyState>
        <div>Chart</div>
      </ChartEmptyState>,
    );

    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("should display custom label when provided", () => {
    render(
      <ChartEmptyState label="No invoices yet">
        <div>Chart</div>
      </ChartEmptyState>,
    );

    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ChartEmptyState className="custom-class">
        <div>Chart</div>
      </ChartEmptyState>,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render label with proper styling", () => {
    render(
      <ChartEmptyState>
        <div>Chart</div>
      </ChartEmptyState>,
    );

    const label = screen.getByText("No data");
    expect(label.className).toContain("rounded-md");
    expect(label.className).toContain("bg-muted");
  });
});
