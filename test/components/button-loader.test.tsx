import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";

import ButtonLoader from "@/ui/components/button-loader";

describe("ButtonLoader", () => {
  test("renders component", () => {
    render(<ButtonLoader />);
    const loader = screen.getByRole("status");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute("aria-label", "Loading");
  });

  test("applies custom className", () => {
    render(<ButtonLoader className="test-class" />);
    const loader = screen.getByRole("status");
    expect(loader).toHaveClass("test-class");
    expect(loader).toHaveClass("animate-spin");
  });
});
