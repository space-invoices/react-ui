import { describe, expect, it } from "bun:test";
import type { Invoice } from "@spaceinvoices/js-sdk";
import { render, screen } from "@testing-library/react";
import { FursInfoDisplay } from "@/ui/components/invoices/view/furs-info-display";

describe("FursInfoDisplay", () => {
  const mockInvoice = {
    id: "inv_123",
    furs: {
      status: "success",
      fiscalized_at: new Date().toISOString(),
      data: {
        zoi: "test-zoi",
        eor: "test-eor",
        qr_code: "base64-qr-code",
        business_premise_name: "Premise 1",
        electronic_device_name: "Device 1",
        invoice_number: "123",
      },
    },
  } as unknown as Invoice;

  it("should render nothing if no FURS data", () => {
    const invoiceWithoutFurs = { ...mockInvoice, furs: undefined } as unknown as Invoice;
    const { container } = render(<FursInfoDisplay invoice={invoiceWithoutFurs} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should render success badge when status is success", () => {
    render(<FursInfoDisplay invoice={mockInvoice} />);
    expect(screen.getByText("Fiscalized")).toBeInTheDocument();
  });

  it("should render pending badge when status is pending", () => {
    const pendingInvoice = {
      ...mockInvoice,
      furs: { ...mockInvoice.furs, status: "pending" },
    } as unknown as Invoice;
    render(<FursInfoDisplay invoice={pendingInvoice} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("should render failed badge and error when status is failed", () => {
    const failedInvoice = {
      ...mockInvoice,
      furs: { ...mockInvoice.furs, status: "failed", error: "Some error" },
    } as unknown as Invoice;
    render(<FursInfoDisplay invoice={failedInvoice} />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Some error")).toBeInTheDocument();
  });

  it("should render ZOI and EOR", () => {
    render(<FursInfoDisplay invoice={mockInvoice} />);
    expect(screen.getByText("test-zoi")).toBeInTheDocument();
    expect(screen.getByText("test-eor")).toBeInTheDocument();
  });

  it("should render premise and device names", () => {
    render(<FursInfoDisplay invoice={mockInvoice} />);
    expect(screen.getByText("Premise 1")).toBeInTheDocument();
    expect(screen.getByText("Device 1")).toBeInTheDocument();
  });

  it("should render cancelled info if present", () => {
    const cancelledInvoice = {
      ...mockInvoice,
      furs: {
        ...mockInvoice.furs,
        cancellation_reason: "Mistake",
        data: { ...mockInvoice.furs!.data, cancelled: true, cancelled_eor: "cancelled-eor" },
      },
    } as unknown as Invoice;
    render(<FursInfoDisplay invoice={cancelledInvoice} />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Mistake")).toBeInTheDocument();
    expect(screen.getByText("cancelled-eor")).toBeInTheDocument();
  });
});
