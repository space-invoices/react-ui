import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentExportForm } from "@/ui/components/export/document-export-form";

// Mock translation function
const mockT = (key: string) => key;

// Default props
const defaultProps = {
  entityId: "ent_123",
  token: "test-token",
  language: "en",
  t: mockT,
};

describe("DocumentExportForm", () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ "content-disposition": 'filename="test_export.xlsx"' }),
        blob: () => Promise.resolve(new Blob()),
      }),
    ) as unknown as typeof fetch;

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = mock(() => "blob:test-url");
    global.URL.revokeObjectURL = mock(() => undefined);
  });

  describe("Rendering", () => {
    it("should render description text", () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getByText("export-page.description")).toBeInTheDocument();
    });

    it("should render document type selector", () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getByText("export-page.document-type")).toBeInTheDocument();
    });

    it("should render export format selector", () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getByText("export-page.format")).toBeInTheDocument();
    });

    it("should render date from and date to inputs", () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getByText("export-page.date-from")).toBeInTheDocument();
      expect(screen.getByText("export-page.date-to")).toBeInTheDocument();
    });

    it("should render export button", () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /export-page.export-button/i })).toBeInTheDocument();
    });

    it("should render clear dates button when dates are set", () => {
      render(<DocumentExportForm {...defaultProps} />);
      // Default dates are set to previous month
      expect(screen.getByText("export-page.clear-dates")).toBeInTheDocument();
    });
  });

  describe("Document Type Selection", () => {
    it("should have invoice as default document type", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);
      // Open the dropdown to verify invoice is listed and selected by default
      const trigger = screen.getByRole("combobox", { name: /export-page.document-type/i });
      await user.click(trigger);
      // Invoice option should be in the list
      expect(screen.getByText("export-page.types.invoice")).toBeInTheDocument();
    });

    it("should allow selecting different document types", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const trigger = screen.getByRole("combobox", { name: /export-page.document-type/i });
      await user.click(trigger);

      expect(screen.getByText("export-page.types.invoice")).toBeInTheDocument();
      expect(screen.getByText("export-page.types.estimate")).toBeInTheDocument();
      expect(screen.getByText("export-page.types.credit_note")).toBeInTheDocument();
    });
  });

  describe("Export Format Selection", () => {
    it("should have xlsx as default export format", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);
      // Open the dropdown to verify xlsx is listed
      const trigger = screen.getByRole("combobox", { name: /export-page.format/i });
      await user.click(trigger);
      expect(screen.getByText("export-page.formats.xlsx")).toBeInTheDocument();
    });

    it("should allow selecting different export formats", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const trigger = screen.getByRole("combobox", { name: /export-page.format/i });
      await user.click(trigger);

      expect(screen.getByText("export-page.formats.xlsx")).toBeInTheDocument();
      expect(screen.getByText("export-page.formats.csv")).toBeInTheDocument();
      expect(screen.getByText("export-page.formats.pdf_zip")).toBeInTheDocument();
    });

    it("should show PDF export info when pdf_zip is selected", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const trigger = screen.getByRole("combobox", { name: /export-page.format/i });
      await user.click(trigger);
      await user.click(screen.getByText("export-page.formats.pdf_zip"));

      expect(screen.getByText("export-page.pdf-export-info")).toBeInTheDocument();
    });
  });

  describe("Date Range Validation", () => {
    it("should show error when date range exceeds 1 year", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const dateFromInput = screen.getByLabelText("export-page.date-from");
      const dateToInput = screen.getByLabelText("export-page.date-to");

      await user.clear(dateFromInput);
      await user.type(dateFromInput, "2020-01-01");
      await user.clear(dateToInput);
      await user.type(dateToInput, "2023-12-31");

      expect(screen.getByText("export-page.error.date-range-exceeded")).toBeInTheDocument();
    });

    it("should disable export button when date range is invalid", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const dateFromInput = screen.getByLabelText("export-page.date-from");
      const dateToInput = screen.getByLabelText("export-page.date-to");

      await user.clear(dateFromInput);
      await user.type(dateFromInput, "2020-01-01");
      await user.clear(dateToInput);
      await user.type(dateToInput, "2023-12-31");

      const exportButton = screen.getByRole("button", { name: /export-page.export-button/i });
      expect(exportButton).toBeDisabled();
    });

    it("should clear date range error when dates are cleared", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      // First set invalid range
      const dateFromInput = screen.getByLabelText("export-page.date-from");
      const dateToInput = screen.getByLabelText("export-page.date-to");

      await user.clear(dateFromInput);
      await user.type(dateFromInput, "2020-01-01");
      await user.clear(dateToInput);
      await user.type(dateToInput, "2023-12-31");

      expect(screen.getByText("export-page.error.date-range-exceeded")).toBeInTheDocument();

      // Clear dates
      await user.click(screen.getByText("export-page.clear-dates"));

      expect(screen.queryByText("export-page.error.date-range-exceeded")).not.toBeInTheDocument();
    });
  });

  describe("Clear Dates Button", () => {
    it("should clear both date inputs when clicked", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const clearButton = screen.getByText("export-page.clear-dates");
      await user.click(clearButton);

      const dateFromInput = screen.getByLabelText("export-page.date-from") as HTMLInputElement;
      const dateToInput = screen.getByLabelText("export-page.date-to") as HTMLInputElement;

      expect(dateFromInput.value).toBe("");
      expect(dateToInput.value).toBe("");
    });

    it("should hide clear dates button after dates are cleared", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const clearButton = screen.getByText("export-page.clear-dates");
      await user.click(clearButton);

      expect(screen.queryByText("export-page.clear-dates")).not.toBeInTheDocument();
    });
  });

  describe("Export Functionality", () => {
    it("should call onSuccess with filename after successful export", async () => {
      const onSuccess = mock();
      const user = userEvent.setup();

      render(<DocumentExportForm {...defaultProps} onSuccess={onSuccess} />);

      const exportButton = screen.getByRole("button", { name: /export-page.export-button/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("test_export.xlsx");
      });
    });

    it("should call onError when export fails", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          statusText: "Internal Server Error",
        }),
      ) as unknown as typeof fetch;

      const onError = mock();
      const user = userEvent.setup();

      render(<DocumentExportForm {...defaultProps} onError={onError} />);

      const exportButton = screen.getByRole("button", { name: /export-page.export-button/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it("should call onLoadingChange when export starts and ends", async () => {
      const onLoadingChange = mock();
      const user = userEvent.setup();

      render(<DocumentExportForm {...defaultProps} onLoadingChange={onLoadingChange} />);

      const exportButton = screen.getByRole("button", { name: /export-page.export-button/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith(true, null);
        expect(onLoadingChange).toHaveBeenCalledWith(false, null);
      });
    });

    it("should disable button during export and re-enable after", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const exportButton = screen.getByRole("button", { name: /export-page.export-button/i });
      expect(exportButton).not.toBeDisabled();

      await user.click(exportButton);

      // After export completes, button should be enabled again
      await waitFor(() => {
        expect(exportButton).not.toBeDisabled();
      });
    });

    it("should include correct query params in fetch request", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const exportButton = screen.getByRole("button", { name: /export-page.export-button/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/documents\/export\?.*type=invoice.*format=xlsx.*language=en/),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer test-token",
              "x-entity-id": "ent_123",
            }),
          }),
        );
      });
    });
  });

  describe("PDF Export", () => {
    it("should call onPdfExportStarted for pdf_zip format", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      ) as unknown as typeof fetch;

      const onPdfExportStarted = mock();
      const user = userEvent.setup();

      render(<DocumentExportForm {...defaultProps} onPdfExportStarted={onPdfExportStarted} />);

      // Select PDF format
      const formatTrigger = screen.getByRole("combobox", { name: /export-page.format/i });
      await user.click(formatTrigger);
      await user.click(screen.getByText("export-page.formats.pdf_zip"));

      const exportButton = screen.getByRole("button", { name: /export-page.export-button/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onPdfExportStarted).toHaveBeenCalled();
      });
    });

    it("should POST to /documents/export/pdf for pdf_zip format", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      ) as unknown as typeof fetch;

      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      // Select PDF format
      const formatTrigger = screen.getByRole("combobox", { name: /export-page.format/i });
      await user.click(formatTrigger);
      await user.click(screen.getByText("export-page.formats.pdf_zip"));

      const exportButton = screen.getByRole("button", { name: /export-page.export-button/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/documents/export/pdf",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: "Bearer test-token",
              "x-entity-id": "ent_123",
              "Content-Type": "application/json",
            }),
          }),
        );
      });
    });
  });
});
