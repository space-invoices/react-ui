import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

mock.module("@/ui/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
      <select
        aria-label="select-native"
        data-testid="select-native"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
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
    it("should render document type selector", () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getByText("Document type")).toBeInTheDocument();
    });

    it("should render export format selector", () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getByText("Format")).toBeInTheDocument();
    });

    it("should render date from and date to inputs", () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getByText("Date from")).toBeInTheDocument();
      expect(screen.getByText("Date to")).toBeInTheDocument();
    });

    it("should render export button", () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /export documents/i })).toBeInTheDocument();
    });

    it("should render clear dates button when dates are set", () => {
      render(<DocumentExportForm {...defaultProps} />);
      // Default dates are set to previous month
      expect(screen.getByText("Clear dates")).toBeInTheDocument();
    });
  });

  describe("Document Type Selection", () => {
    it("should have invoice as default document type", async () => {
      render(<DocumentExportForm {...defaultProps} />);
      const [documentTypeSelect] = screen.getAllByTestId("select-native");
      expect(documentTypeSelect).toHaveValue("invoice");
      expect(screen.getAllByText("Invoice").length).toBeGreaterThanOrEqual(1);
    });

    it("should allow selecting different document types", async () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getAllByText("Invoice").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Estimate").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Credit note").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Advance invoice").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Delivery note").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Export Format Selection", () => {
    it("should have xlsx as default export format", async () => {
      render(<DocumentExportForm {...defaultProps} />);
      const [, formatSelect] = screen.getAllByTestId("select-native");
      expect(formatSelect).toHaveValue("xlsx");
      expect(screen.getAllByText("Excel (.xlsx)").length).toBeGreaterThanOrEqual(1);
    });

    it("should allow selecting different export formats", async () => {
      render(<DocumentExportForm {...defaultProps} />);
      expect(screen.getAllByText("Excel (.xlsx)").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("CSV (.csv)").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("PDF ZIP archive").length).toBeGreaterThanOrEqual(1);
    });

    it("should show PDF export info when pdf_zip is selected", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const [, formatSelect] = screen.getAllByTestId("select-native");
      await user.selectOptions(formatSelect, "pdf_zip");

      expect(
        screen.getByText("PDF export runs asynchronously and generates a ZIP archive for the selected document types."),
      ).toBeInTheDocument();
    });

    it("should show multi-type checkboxes when pdf_zip is selected", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const [, formatSelect] = screen.getAllByTestId("select-native");
      await user.selectOptions(formatSelect, "pdf_zip");

      // Should show checkboxes for all 5 document types
      expect(screen.getAllByText("Invoice").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Estimate").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Credit note").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Advance invoice").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Delivery note").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Date Range Validation", () => {
    it("should show error when date range exceeds 1 year", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const dateFromInput = screen.getByLabelText("Date from");
      const dateToInput = screen.getByLabelText("Date to");

      await user.clear(dateFromInput);
      await user.type(dateFromInput, "2020-01-01");
      await user.clear(dateToInput);
      await user.type(dateToInput, "2023-12-31");

      expect(screen.getByText("Date range cannot exceed one year.")).toBeInTheDocument();
    });

    it("should disable export button when date range is invalid", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const dateFromInput = screen.getByLabelText("Date from");
      const dateToInput = screen.getByLabelText("Date to");

      await user.clear(dateFromInput);
      await user.type(dateFromInput, "2020-01-01");
      await user.clear(dateToInput);
      await user.type(dateToInput, "2023-12-31");

      const exportButton = screen.getByRole("button", { name: /export documents/i });
      expect(exportButton).toBeDisabled();
    });

    it("should clear date range error when dates are cleared", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      // First set invalid range
      const dateFromInput = screen.getByLabelText("Date from");
      const dateToInput = screen.getByLabelText("Date to");

      await user.clear(dateFromInput);
      await user.type(dateFromInput, "2020-01-01");
      await user.clear(dateToInput);
      await user.type(dateToInput, "2023-12-31");

      expect(screen.getByText("Date range cannot exceed one year.")).toBeInTheDocument();

      // Clear dates
      await user.click(screen.getByText("Clear dates"));

      expect(screen.queryByText("Date range cannot exceed one year.")).not.toBeInTheDocument();
    });
  });

  describe("Clear Dates Button", () => {
    it("should clear both date inputs when clicked", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const clearButton = screen.getByText("Clear dates");
      await user.click(clearButton);

      const dateFromInput = screen.getByLabelText("Date from") as HTMLInputElement;
      const dateToInput = screen.getByLabelText("Date to") as HTMLInputElement;

      expect(dateFromInput.value).toBe("");
      expect(dateToInput.value).toBe("");
    });

    it("should hide clear dates button after dates are cleared", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const clearButton = screen.getByText("Clear dates");
      await user.click(clearButton);

      expect(screen.queryByText("Clear dates")).not.toBeInTheDocument();
    });
  });

  describe("Export Functionality", () => {
    it("should call onSuccess with filename after successful export", async () => {
      const onSuccess = mock();
      const user = userEvent.setup();

      render(<DocumentExportForm {...defaultProps} onSuccess={onSuccess} />);

      const exportButton = screen.getByRole("button", { name: /export documents/i });
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

      const exportButton = screen.getByRole("button", { name: /export documents/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it("should call onLoadingChange when export starts and ends", async () => {
      const onLoadingChange = mock();
      const user = userEvent.setup();

      render(<DocumentExportForm {...defaultProps} onLoadingChange={onLoadingChange} />);

      const exportButton = screen.getByRole("button", { name: /export documents/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith(true, null);
        expect(onLoadingChange).toHaveBeenCalledWith(false, null);
      });
    });

    it("should disable button during export and re-enable after", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const exportButton = screen.getByRole("button", { name: /export documents/i });
      expect(exportButton).not.toBeDisabled();

      await user.click(exportButton);

      // After export completes, button should be enabled again
      await waitFor(() => {
        expect(exportButton).not.toBeDisabled();
      });
    });

    it("should omit language overrides for standard exports by default", async () => {
      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const exportButton = screen.getByRole("button", { name: /export documents/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/documents\/export\?.*type=invoice.*format=xlsx/),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer test-token",
              "x-entity-id": "ent_123",
            }),
          }),
        );

        const url = (global.fetch as any).mock.calls[0][0] as string;
        expect(url).not.toContain("language=");
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

      const [, formatSelect] = screen.getAllByTestId("select-native");
      await user.selectOptions(formatSelect, "pdf_zip");

      const exportButton = screen.getByRole("button", { name: /export documents/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(onPdfExportStarted).toHaveBeenCalled();
      });
    });

    it("should POST to /documents/export/pdf with types array and no implicit locale override", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      ) as unknown as typeof fetch;

      const user = userEvent.setup();
      render(<DocumentExportForm {...defaultProps} />);

      const [, formatSelect] = screen.getAllByTestId("select-native");
      await user.selectOptions(formatSelect, "pdf_zip");

      const exportButton = screen.getByRole("button", { name: /export documents/i });
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

        // Verify the body contains types array instead of type string
        const fetchCall = (global.fetch as any).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        expect(body.types).toEqual(["invoice"]);
        expect(body.type).toBeUndefined();
        expect(body.locale).toBeUndefined();
        expect(body.language).toBeUndefined();
      });
    });
  });
});
