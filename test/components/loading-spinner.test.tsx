import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";

import { LoadingSpinner } from "@/ui/components/loading-spinner";

describe("LoadingSpinner", () => {
  test("renders component", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.firstChild;
    expect(spinner).toBeInTheDocument();
  });

  test("applies size classes correctly", () => {
    const { container: smallContainer } = render(<LoadingSpinner size="sm" />);
    const smallSpinner = smallContainer.firstChild;
    expect(smallSpinner).toHaveClass("h-4 w-4");

    const { container: mediumContainer } = render(<LoadingSpinner size="md" />);
    const mediumSpinner = mediumContainer.firstChild;
    expect(mediumSpinner).toHaveClass("h-6 w-6");

    const { container: largeContainer } = render(<LoadingSpinner size="lg" />);
    const largeSpinner = largeContainer.firstChild;
    expect(largeSpinner).toHaveClass("h-8 w-8");
  });

  test("applies custom className", () => {
    const { container } = render(<LoadingSpinner className="test-class" />);
    const spinner = container.firstChild;
    expect(spinner).toHaveClass("test-class");
  });
});
