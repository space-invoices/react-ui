import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import de from "@/ui/components/entities/entity-settings-form/locales/de";
import sl from "@/ui/components/entities/entity-settings-form/locales/sl";
import { TaxRulesSettingsForm } from "@/ui/components/entities/settings/tax-rules-settings-form";
import { createTranslation } from "@/ui/lib/translation";
import { FormFooterProvider } from "@/ui/providers/form-footer-context";

// Mock the hooks
const mockUpdateEntity = mock(() => undefined);
let mockUpdateEntityData: any = { mutate: mockUpdateEntity, isPending: false };

mock.module("@/ui/components/entities/entities.hooks", () => ({
  useUpdateEntity: () => mockUpdateEntityData,
}));

// Wrapper that provides FormFooterProvider context
const Wrapper = ({ children }: { children: ReactNode }) => <FormFooterProvider>{children}</FormFooterProvider>;

// Base entity without tax_clause_defaults feature
const baseEntity = {
  id: "ent_123",
  name: "Test Company",
  country_code: "SI",
  country: "Slovenia",
  settings: {
    tax_rules: {
      eu: {
        vies_validate_vat: true,
        auto_reverse_charge: false,
        auto_remove_tax_export: false,
        require_gross_prices: false,
      },
    },
  },
  country_rules: {
    features: [],
  },
} as any;

// Entity with tax_clause_defaults feature enabled
const entityWithTaxClausesFeature = {
  ...baseEntity,
  settings: {
    ...baseEntity.settings,
    tax_clause_defaults: {
      domestic: "Default domestic clause",
      intra_eu_b2b: "Reverse charge clause",
      export: "Export exemption clause",
    },
  },
  country_rules: {
    features: ["tax_clause_defaults"],
  },
} as any;

describe("TaxRulesSettingsForm Translation Sanity Check", () => {
  it("should resolve keys correctly from sl locale", () => {
    const translations = { sl, de } as any;
    const { result } = renderHook(() => createTranslation({ locale: "sl", translations }));
    const translate = result.current;

    expect(translate("EU Tax Rules")).toBe("EU davčna pravila");
    expect(translate("Default Tax Clauses")).toBe("Privzete davčne klavzule");
  });

  it("should resolve keys correctly from de locale", () => {
    const translations = { sl, de } as any;
    const { result } = renderHook(() => createTranslation({ locale: "de", translations }));
    const translate = result.current;

    expect(translate("EU Tax Rules")).toBe("EU-Steuerregeln");
    expect(translate("Default Tax Clauses")).toBe("Standard-Steuerklauseln");
  });
});

describe("TaxRulesSettingsForm", () => {
  beforeEach(() => {
    mockUpdateEntity.mockClear();
    mockUpdateEntityData = {
      mutate: mockUpdateEntity,
      isPending: false,
    };
  });

  describe("EU Tax Rules Section", () => {
    it("should render EU Tax Rules header", () => {
      render(<TaxRulesSettingsForm entity={baseEntity} />, { wrapper: Wrapper });
      expect(screen.getByText("EU Tax Rules")).toBeInTheDocument();
    });

    it("should render all four EU tax rule switches", () => {
      render(<TaxRulesSettingsForm entity={baseEntity} />, { wrapper: Wrapper });

      // Check for switch labels using the translation keys
      expect(screen.getByText("tax-rules.vies_validate_vat.label")).toBeInTheDocument();
      expect(screen.getByText("tax-rules.auto_reverse_charge.label")).toBeInTheDocument();
      expect(screen.getByText("tax-rules.auto_remove_tax_export.label")).toBeInTheDocument();
      expect(screen.getByText("tax-rules.require_gross_prices.label")).toBeInTheDocument();
    });

    it("should initialize switches with entity settings values", () => {
      const entityWithSettings = {
        ...baseEntity,
        settings: {
          tax_rules: {
            eu: {
              vies_validate_vat: true,
              auto_reverse_charge: true,
              auto_remove_tax_export: false,
              require_gross_prices: true,
            },
          },
        },
      } as any;

      render(<TaxRulesSettingsForm entity={entityWithSettings} />, { wrapper: Wrapper });

      const switches = screen.getAllByRole("switch");
      // Order: vies_validate_vat, auto_reverse_charge, auto_remove_tax_export, require_gross_prices
      expect(switches[0]).toBeChecked(); // vies_validate_vat = true
      expect(switches[1]).toBeChecked(); // auto_reverse_charge = true
      expect(switches[2]).not.toBeChecked(); // auto_remove_tax_export = false
      expect(switches[3]).toBeChecked(); // require_gross_prices = true
    });
  });

  describe("Tax Clauses Section", () => {
    it("should NOT render tax clauses section when feature is disabled", () => {
      render(<TaxRulesSettingsForm entity={baseEntity} />, { wrapper: Wrapper });
      expect(screen.queryByText("Default Tax Clauses")).not.toBeInTheDocument();
    });

    it("should render tax clauses section when feature is enabled", () => {
      render(<TaxRulesSettingsForm entity={entityWithTaxClausesFeature} />, { wrapper: Wrapper });
      expect(screen.getByText("Default Tax Clauses")).toBeInTheDocument();
    });

    it("should render domestic tax clause field when feature is enabled", () => {
      render(<TaxRulesSettingsForm entity={entityWithTaxClausesFeature} />, { wrapper: Wrapper });
      expect(screen.getByText("tax-clauses.domestic.label")).toBeInTheDocument();
    });

    it("should initialize tax clause fields with entity settings", () => {
      render(<TaxRulesSettingsForm entity={entityWithTaxClausesFeature} />, { wrapper: Wrapper });

      // The domestic field should be visible and have the default value
      const domesticTextarea = screen.getByPlaceholderText("Enter default tax clause...");
      expect(domesticTextarea).toHaveValue("Default domestic clause");
    });

    it("should have collapsible section for other tax clauses", async () => {
      const user = userEvent.setup();
      render(<TaxRulesSettingsForm entity={entityWithTaxClausesFeature} />, { wrapper: Wrapper });

      // Other tax clauses should be collapsed by default
      expect(screen.queryByText("tax-clauses.intra_eu_b2b.label")).not.toBeInTheDocument();

      // Click to expand
      const expandButton = screen.getByText("tax-clauses.other-title");
      await user.click(expandButton);

      // Now should see other tax clause fields
      await waitFor(() => {
        expect(screen.getByText("tax-clauses.intra_eu_b2b.label")).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should call updateEntity on form submit", async () => {
      const user = userEvent.setup();
      render(<TaxRulesSettingsForm entity={baseEntity} />, { wrapper: Wrapper });

      // Find and submit the form
      const form = document.querySelector("form#tax-rules-settings-form");
      expect(form).toBeInTheDocument();

      // Trigger a change to make form dirty
      const switches = screen.getAllByRole("switch");
      await user.click(switches[1]); // Toggle auto_reverse_charge

      // Submit the form
      form?.dispatchEvent(new Event("submit", { bubbles: true }));

      await waitFor(() => {
        expect(mockUpdateEntity).toHaveBeenCalled();
      });
    });

    it("should include tax_clause_defaults in submission when feature enabled", async () => {
      const user = userEvent.setup();
      render(<TaxRulesSettingsForm entity={entityWithTaxClausesFeature} />, { wrapper: Wrapper });

      // Modify the domestic tax clause
      const domesticTextarea = screen.getByPlaceholderText("Enter default tax clause...");
      await user.clear(domesticTextarea);
      await user.type(domesticTextarea, "New domestic clause");

      // Submit the form
      const form = document.querySelector("form#tax-rules-settings-form");
      form?.dispatchEvent(new Event("submit", { bubbles: true }));

      await waitFor(() => {
        expect(mockUpdateEntity).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "ent_123",
            data: expect.objectContaining({
              settings: expect.objectContaining({
                tax_clause_defaults: expect.objectContaining({
                  domestic: "New domestic clause",
                }),
              }),
            }),
          }),
        );
      });
    });
  });

  describe("Section Help Integration", () => {
    it("should call renderSection with correct section type for tax-rules", () => {
      const renderSection = mock((section: string, content: ReactNode) => (
        <div data-testid={`help-${section}`}>{content}</div>
      ));

      render(<TaxRulesSettingsForm entity={baseEntity} renderSection={renderSection} />, { wrapper: Wrapper });

      expect(renderSection).toHaveBeenCalledWith("tax-rules", expect.anything());
    });

    it("should call renderSection for tax-clauses when feature enabled", () => {
      const renderSection = mock((section: string, content: ReactNode) => (
        <div data-testid={`help-${section}`}>{content}</div>
      ));

      render(<TaxRulesSettingsForm entity={entityWithTaxClausesFeature} renderSection={renderSection} />, {
        wrapper: Wrapper,
      });

      expect(renderSection).toHaveBeenCalledWith("tax-clauses", expect.anything());
      expect(renderSection).toHaveBeenCalledWith("tax-rules", expect.anything());
    });
  });
});
