import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      expect(screen.getByText("kir-export.year")).toBeInTheDocument();
    });

    it("should render period type selector", () => {
      render(<KirExportForm {...defaultProps} />);
      expect(screen.getByText("kir-export.period-type")).toBeInTheDocument();
    });

    it("should render month selector by default", () => {
      render(<KirExportForm {...defaultProps} />);
      expect(screen.getByText("kir-export.month")).toBeInTheDocument();
    });

    it("should render export button", () => {
      render(<KirExportForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /kir-export.export-button/i })).toBeInTheDocument();
    });
  });

  describe("Year Selection", () => {
    it("should default to current or previous month's year", () => {
      render(<KirExportForm {...defaultProps} />);
      const trigger = screen.getByRole("combobox", { name: /kir-export.year/i });
      // Should have a valid year (current or previous based on month)
      expect(trigger.textContent).toMatch(/\d{4}/);
    });

    it("should show 6 year options", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      const trigger = screen.getByRole("combobox", { name: /kir-export.year/i });
      await user.click(trigger);

      const currentYear = new Date().getFullYear();
      // Check first and last year options
      expect(screen.getByText(currentYear.toString())).toBeInTheDocument();
      expect(screen.getByText((currentYear - 5).toString())).toBeInTheDocument();
    });
  });

  describe("Period Type Selection", () => {
    it("should have month as default period type", () => {
      render(<KirExportForm {...defaultProps} />);
      // Month selector should be visible by default (quarter selector should not)
      expect(screen.getByText("kir-export.month")).toBeInTheDocument();
      expect(screen.queryByText("kir-export.quarter")).not.toBeInTheDocument();
    });

    it("should show month and quarter options", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      const trigger = screen.getByRole("combobox", { name: /kir-export.period-type/i });
      await user.click(trigger);

      expect(screen.getByText("kir-export.period-types.month")).toBeInTheDocument();
      expect(screen.getByText("kir-export.period-types.quarter")).toBeInTheDocument();
    });

    it("should show quarter selector when quarter is selected", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      const trigger = screen.getByRole("combobox", { name: /kir-export.period-type/i });
      await user.click(trigger);
      await user.click(screen.getByText("kir-export.period-types.quarter"));

      expect(screen.getByText("kir-export.quarter")).toBeInTheDocument();
      expect(screen.queryByText("kir-export.month")).not.toBeInTheDocument();
    });

    it("should show month selector when month is selected", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      // First switch to quarter
      const trigger = screen.getByRole("combobox", { name: /kir-export.period-type/i });
      await user.click(trigger);
      await user.click(screen.getByText("kir-export.period-types.quarter"));

      // Then switch back to month
      await user.click(trigger);
      await user.click(screen.getByText("kir-export.period-types.month"));

      expect(screen.getByText("kir-export.month")).toBeInTheDocument();
      expect(screen.queryByText("kir-export.quarter")).not.toBeInTheDocument();
    });
  });

  describe("Month Selection", () => {
    it("should show all 12 months", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      const trigger = screen.getByRole("combobox", { name: /kir-export.month/i });
      await user.click(trigger);

      for (let i = 1; i <= 12; i++) {
        expect(screen.getByText(`kir-export.months.${i}`)).toBeInTheDocument();
      }
    });
  });

  describe("Quarter Selection", () => {
    it("should show all 4 quarters", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      // Switch to quarter
      const periodTrigger = screen.getByRole("combobox", { name: /kir-export.period-type/i });
      await user.click(periodTrigger);
      await user.click(screen.getByText("kir-export.period-types.quarter"));

      // Open quarter selector
      const quarterTrigger = screen.getByRole("combobox", { name: /kir-export.quarter/i });
      await user.click(quarterTrigger);

      for (let i = 1; i <= 4; i++) {
        expect(screen.getByText(`kir-export.quarters.${i}`)).toBeInTheDocument();
      }
    });
  });

  describe("Export Functionality", () => {
    it("should call SDK generateKirExport with month params", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      const exportButton = screen.getByRole("button", { name: /kir-export.export-button/i });
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
      const periodTrigger = screen.getByRole("combobox", { name: /kir-export.period-type/i });
      await user.click(periodTrigger);
      await user.click(screen.getByText("kir-export.period-types.quarter"));

      const exportButton = screen.getByRole("button", { name: /kir-export.export-button/i });
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

      const exportButton = screen.getByRole("button", { name: /kir-export.export-button/i });
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
      const periodTrigger = screen.getByRole("combobox", { name: /kir-export.period-type/i });
      await user.click(periodTrigger);
      await user.click(screen.getByText("kir-export.period-types.quarter"));

      const exportButton = screen.getByRole("button", { name: /kir-export.export-button/i });
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

      const exportButton = screen.getByRole("button", { name: /kir-export.export-button/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it("should call onLoadingChange when export starts and ends", async () => {
      const onLoadingChange = mock();
      const user = userEvent.setup();

      render(<KirExportForm {...defaultProps} onLoadingChange={onLoadingChange} />);

      const exportButton = screen.getByRole("button", { name: /kir-export.export-button/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith(true, null);
        expect(onLoadingChange).toHaveBeenCalledWith(false, null);
      });
    });

    it("should disable button during export and re-enable after", async () => {
      const user = userEvent.setup();
      render(<KirExportForm {...defaultProps} />);

      const exportButton = screen.getByRole("button", { name: /kir-export.export-button/i });
      expect(exportButton).not.toBeDisabled();

      await user.click(exportButton);

      // After export completes, button should be enabled again
      await waitFor(() => {
        expect(exportButton).not.toBeDisabled();
      });
    });
  });
});
