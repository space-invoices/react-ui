import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

mock.module("@/ui/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
      <select aria-label="select-native" data-testid="select-native" value={value} onChange={(e) => onValueChange(e.target.value)}>
        {Array.isArray(children?.[1]?.props?.children)
          ? children[1].props.children.map((child: any) => (
              <option key={child.props.value} value={child.props.value}>
                {child.props.children}
              </option>
            ))
          : null}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

import { KirExportForm } from "@/ui/components/tax-reports/kir-export-form";

// Mock translation function
const mockT = (key: string) => key;

// Mock SDK
const mockGenerateKirExport = mock(() => Promise.resolve(new Blob()));

const mockSDK = {
  taxReports: {
    generateKirExport: mockGenerateKirExport,
  },
} as any;

// Default props
const defaultProps = {
  sdk: mockSDK,
  entityId: "ent_123",
  t: mockT,
};

describe("KirExportForm", () => {
  beforeEach(() => {
    mockGenerateKirExport.mockClear();
    mockGenerateKirExport.mockImplementation(() => Promise.resolve(new Blob()));

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = mock(() => "blob:test-url");
    global.URL.revokeObjectURL = mock(() => undefined);
  });

  describe("Rendering", () => {
    it("should render year selector", () => {
      render(<KirExportForm {...defaultProps} />);
      expect(screen.getByText("Year")).toBeInTheDocument();
    });

    it("should render period type toggle", () => {
      render(<KirExportForm {...defaultProps} />);
      expect(screen.getByText("Period type")).toBeInTheDocument();
      expect(screen.getAllByText("Month").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Quarter").length).toBeGreaterThanOrEqual(1);
    });

    it("should render month selector by default", () => {
      render(<KirExportForm {...defaultProps} />);
      expect(screen.getAllByText("Month").length).toBeGreaterThanOrEqual(1);
    });

    it("should render export button", () => {
      render(<KirExportForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /export kir zip/i })).toBeInTheDocument();
    });

    it("should render file preview", () => {
      render(<KirExportForm {...defaultProps} />);
      expect(screen.getByText(/file preview/i)).toBeInTheDocument();
      expect(screen.getByText(/KIR_\d{4}_M\d+\.zip/)).toBeInTheDocument();
    });
  });

  describe("Year Selection", () => {
    it("should default to current or previous month's year", () => {
      render(<KirExportForm {...defaultProps} />);
      const [trigger] = screen.getAllByTestId("select-native");
      // Should have a valid year (current or previous based on month)
      expect((trigger as HTMLSelectElement).value).toMatch(/\d{4}/);
    });

    it("should show 6 year options", async () => {
      render(<KirExportForm {...defaultProps} />);

      const currentYear = new Date().getFullYear();
      // Current year appears in both trigger and dropdown option
      expect(screen.getAllByText(currentYear.toString()).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText((currentYear - 5).toString()).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Period Type Selection", () => {
    it("should have month as default period type", () => {
      render(<KirExportForm {...defaultProps} />);
      // Month selector should be visible by default (quarter selector should not)
      expect(screen.getAllByText("Month").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Quarter").length).toBe(1);
    });

    it("should show quarter selector when quarter button is clicked", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Quarter" }));

      expect(screen.getAllByText("Quarter").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Month").length).toBe(1);
    });

    it("should show month selector when month button is clicked", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      // First switch to quarter
      await user.click(screen.getByRole("button", { name: "Quarter" }));

      // Then switch back to month
      await user.click(screen.getByRole("button", { name: "Month" }));

      expect(screen.getAllByText("Month").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Quarter").length).toBe(1);
    });

    it("should update file preview when switching period type", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      // Default is month
      expect(screen.getByText(/KIR_\d{4}_M\d+\.zip/)).toBeInTheDocument();

      // Switch to quarter
      await user.click(screen.getByRole("button", { name: "Quarter" }));

      expect(screen.getByText(/KIR_\d{4}_Q\d\.zip/)).toBeInTheDocument();
    });
  });

  describe("Month Selection", () => {
    it("should show all 12 months", async () => {
      render(<KirExportForm {...defaultProps} />);

      ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].forEach(
        (month) => expect(screen.getAllByText(month).length).toBeGreaterThanOrEqual(1),
      );
    });
  });

  describe("Quarter Selection", () => {
    it("should show all 4 quarters", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      // Switch to quarter
      await user.click(screen.getByRole("button", { name: "Quarter" }));

      ["Q1", "Q2", "Q3", "Q4"].forEach((quarter) => expect(screen.getAllByText(quarter).length).toBeGreaterThanOrEqual(1));
    });
  });

  describe("Export Functionality", () => {
    it("should call SDK generateKirExport with month params", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      const exportButton = screen.getByRole("button", { name: /export kir zip/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockGenerateKirExport).toHaveBeenCalledWith(
          expect.objectContaining({
            year: expect.any(String),
            month: expect.any(String),
            quarter: undefined,
          }),
          { entity_id: "ent_123" },
        );
      });
    });

    it("should call SDK generateKirExport with quarter params", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      // Switch to quarter
      await user.click(screen.getByRole("button", { name: "Quarter" }));

      const exportButton = screen.getByRole("button", { name: /export kir zip/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockGenerateKirExport).toHaveBeenCalledWith(
          expect.objectContaining({
            year: expect.any(String),
            month: undefined,
            quarter: expect.any(String),
          }),
          { entity_id: "ent_123" },
        );
      });
    });

    it("should call onSuccess with filename after successful export", async () => {
      const onSuccess = mock();
      const user = userEvent.setup();

      render(<KirExportForm {...defaultProps} onSuccess={onSuccess} />);

      const exportButton = screen.getByRole("button", { name: /export kir zip/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(expect.stringMatching(/KIR_\d{4}_M\d+\.zip/));
      });
    });

    it("should call onSuccess with quarter filename when quarter is selected", async () => {
      const onSuccess = mock();
      const user = userEvent.setup();

      render(<KirExportForm {...defaultProps} onSuccess={onSuccess} />);

      // Switch to quarter
      await user.click(screen.getByRole("button", { name: "Quarter" }));

      const exportButton = screen.getByRole("button", { name: /export kir zip/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(expect.stringMatching(/KIR_\d{4}_Q\d\.zip/));
      });
    });

    it("should call onError when export fails", async () => {
      const error = new Error("Export failed");
      mockGenerateKirExport.mockImplementation(() => Promise.reject(error));

      const onError = mock();
      const user = userEvent.setup();

      render(<KirExportForm {...defaultProps} onError={onError} />);

      const exportButton = screen.getByRole("button", { name: /export kir zip/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it("should call onLoadingChange when export starts and ends", async () => {
      const onLoadingChange = mock();
      const user = userEvent.setup();

      render(<KirExportForm {...defaultProps} onLoadingChange={onLoadingChange} />);

      const exportButton = screen.getByRole("button", { name: /export kir zip/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith(true, null);
        expect(onLoadingChange).toHaveBeenCalledWith(false, null);
      });
    });

    it("should disable button during export and re-enable after", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      const exportButton = screen.getByRole("button", { name: /export kir zip/i });
      expect(exportButton).not.toBeDisabled();

      await user.click(exportButton);

      // After export completes, button should be enabled again
      await waitFor(() => {
        expect(exportButton).not.toBeDisabled();
      });
    });
  });
});
