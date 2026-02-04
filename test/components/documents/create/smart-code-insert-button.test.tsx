import { describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { SmartCodeInsertButton } from "@/ui/components/documents/create/smart-code-insert-button";

describe("SmartCodeInsertButton", () => {
  const mockT = (key: string) => key;
  const mockOnInsert = mock(() => undefined);

  const defaultProps = {
    textareaRef: createRef<HTMLTextAreaElement>(),
    onInsert: mockOnInsert,
    value: "",
    t: mockT,
  };

  it("should render the sparkles button", () => {
    render(<SmartCodeInsertButton {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should show dropdown menu when clicked", async () => {
    const user = userEvent.setup();
    render(<SmartCodeInsertButton {...defaultProps} />);

    const button = screen.getByRole("button");
    await user.click(button);

    // Should show categories (wait for dropdown to open)
    await waitFor(() => {
      expect(screen.getByText("Entity")).toBeInTheDocument();
    });
    expect(screen.getByText("Document")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Bank Account")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  describe("Bank Account category", () => {
    it("should include bank account template variables", async () => {
      const user = userEvent.setup();
      render(<SmartCodeInsertButton {...defaultProps} />);

      await user.click(screen.getByRole("button"));

      // Should show bank account variables
      await waitFor(() => {
        expect(screen.getByText("{bank_account}")).toBeInTheDocument();
      });
      expect(screen.getByText("{bank_account.iban}")).toBeInTheDocument();
      expect(screen.getByText("{bank_account.bank_name}")).toBeInTheDocument();
      expect(screen.getByText("{bank_account.bic}")).toBeInTheDocument();
      expect(screen.getByText("{bank_account.account_number}")).toBeInTheDocument();
    });

    it("should show descriptive labels for bank account variables", async () => {
      const user = userEvent.setup();
      render(<SmartCodeInsertButton {...defaultProps} />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("Full account info")).toBeInTheDocument();
      });
      expect(screen.getByText("IBAN")).toBeInTheDocument();
      expect(screen.getByText("Bank name")).toBeInTheDocument();
      expect(screen.getByText("BIC/SWIFT")).toBeInTheDocument();
      expect(screen.getByText("Account number")).toBeInTheDocument();
    });

    it("should call onInsert with {bank_account} when clicked", async () => {
      const user = userEvent.setup();
      const onInsert = mock(() => undefined);
      render(<SmartCodeInsertButton {...defaultProps} onInsert={onInsert} />);

      await user.click(screen.getByRole("button"));
      await waitFor(() => {
        expect(screen.getByText("{bank_account}")).toBeInTheDocument();
      });
      await user.click(screen.getByText("{bank_account}"));

      expect(onInsert).toHaveBeenCalledWith("{bank_account}");
    });

    it("should call onInsert with {bank_account.iban} when clicked", async () => {
      const user = userEvent.setup();
      const onInsert = mock(() => undefined);
      render(<SmartCodeInsertButton {...defaultProps} onInsert={onInsert} />);

      await user.click(screen.getByRole("button"));
      await waitFor(() => {
        expect(screen.getByText("{bank_account.iban}")).toBeInTheDocument();
      });
      await user.click(screen.getByText("{bank_account.iban}"));

      expect(onInsert).toHaveBeenCalledWith("{bank_account.iban}");
    });
  });

  describe("variable insertion", () => {
    it("should insert variable at cursor position", async () => {
      const user = userEvent.setup();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const onInsert = mock(() => undefined);

      render(
        <>
          <textarea ref={textareaRef} defaultValue="Hello World" />
          <SmartCodeInsertButton {...defaultProps} textareaRef={textareaRef} onInsert={onInsert} value="Hello World" />
        </>,
      );

      // Simulate cursor at position 5 ("Hello| World")
      if (textareaRef.current) {
        textareaRef.current.selectionStart = 5;
        textareaRef.current.selectionEnd = 5;
      }

      await user.click(screen.getByRole("button"));
      await waitFor(() => {
        expect(screen.getByText("{entity_name}")).toBeInTheDocument();
      });
      await user.click(screen.getByText("{entity_name}"));

      expect(onInsert).toHaveBeenCalledWith("Hello{entity_name} World");
    });

    it("should insert at beginning when no cursor position", async () => {
      const user = userEvent.setup();
      const onInsert = mock(() => undefined);

      render(<SmartCodeInsertButton {...defaultProps} onInsert={onInsert} value="Hello" />);

      await user.click(screen.getByRole("button"));
      await waitFor(() => {
        expect(screen.getByText("{entity_name}")).toBeInTheDocument();
      });
      await user.click(screen.getByText("{entity_name}"));

      // Inserts at position 0 since no textarea ref means cursor defaults to 0
      expect(onInsert).toHaveBeenCalledWith("{entity_name}Hello");
    });
  });

  describe("Entity category", () => {
    it("should include entity template variables", async () => {
      const user = userEvent.setup();
      render(<SmartCodeInsertButton {...defaultProps} />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("{entity_name}")).toBeInTheDocument();
      });
      expect(screen.getByText("{entity_email}")).toBeInTheDocument();
    });
  });

  describe("Document category", () => {
    it("should include document template variables", async () => {
      const user = userEvent.setup();
      render(<SmartCodeInsertButton {...defaultProps} />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("{document_number}")).toBeInTheDocument();
      });
      expect(screen.getByText("{document_date}")).toBeInTheDocument();
      expect(screen.getByText("{document_due_date}")).toBeInTheDocument();
      expect(screen.getByText("{document_total}")).toBeInTheDocument();
      expect(screen.getByText("{document_currency}")).toBeInTheDocument();
    });
  });

  describe("Customer category", () => {
    it("should include customer template variables", async () => {
      const user = userEvent.setup();
      render(<SmartCodeInsertButton {...defaultProps} />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("{customer_name}")).toBeInTheDocument();
      });
      expect(screen.getByText("{customer_email}")).toBeInTheDocument();
    });
  });

  describe("Other category", () => {
    it("should include other template variables", async () => {
      const user = userEvent.setup();
      render(<SmartCodeInsertButton {...defaultProps} />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("{current_date}")).toBeInTheDocument();
      });
      expect(screen.getByText("{current_year}")).toBeInTheDocument();
    });
  });
});
