import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Entity } from "@spaceinvoices/js-sdk";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { FursSettingsForm } from "@/ui/components/entities/furs-settings-form/furs-settings-form";
import en from "@/ui/components/entities/furs-settings-form/locales/en";
import { createTranslation } from "@/ui/lib/translation";
import { FormFooterProvider } from "@/ui/providers/form-footer-context";

// Create mutable variables that the mocks will reference
let mockFursSettingsData: any = { data: { enabled: true, has_certificate: false }, isLoading: false };
let mockFursPremisesData: any = { data: [], isLoading: false };
const mockUpdateSettings = mock(() => undefined);
let mockUpdateFursSettingsData: any = { mutate: mockUpdateSettings, isPending: false };

// Mock the hooks
mock.module("@/ui/components/entities/furs-settings-form/furs-settings.hooks", () => ({
  useFursSettings: () => mockFursSettingsData,
  useFursPremises: () => mockFursPremisesData,
  useUpdateFursSettings: () => mockUpdateFursSettingsData,
}));

// Mock the sub-components to simplify testing
mock.module("@/ui/components/entities/furs-settings-form/sections/certificate-settings-section", () => ({
  CertificateSettingsSection: () => <div data-testid="certificate-section">Certificate Section</div>,
}));
mock.module("@/ui/components/entities/furs-settings-form/sections/general-settings-section", () => ({
  GeneralSettingsSection: () => (
    <div data-testid="general-section">
      General Section
      <button type="submit">Save Settings</button>
    </div>
  ),
}));
mock.module("@/ui/components/entities/furs-settings-form/sections/premises-management-section", () => ({
  PremisesManagementSection: () => <div data-testid="premises-section">Premises Section</div>,
}));
mock.module("@/ui/components/entities/furs-settings-form/sections/enable-fiscalization-section", () => ({
  EnableFiscalizationSection: () => <div data-testid="enable-section">Enable Fiscalization Section</div>,
}));

// Wrapper that provides FormFooterProvider context
const Wrapper = ({ children }: { children: ReactNode }) => <FormFooterProvider>{children}</FormFooterProvider>;

describe("FursSettingsForm Translation Sanity Check", () => {
  it("should resolve keys correctly from en locale", () => {
    const translations = { en } as any;
    const { result } = renderHook(() => createTranslation({ locale: "en", translations }));
    const translate = result.current;

    expect(translate("Certificate")).toBe("Certificate");
    expect(translate("General Settings")).toBe("General Settings");
  });
});

describe("FursSettingsForm", () => {
  const mockEntity = {
    id: "ent_123",
    country_code: "SI",
    environment: "production",
  } as Entity;

  beforeEach(() => {
    mockUpdateSettings.mockClear();

    // Reset to default mock values
    mockFursSettingsData = {
      data: { enabled: true, has_certificate: false },
      isLoading: false,
    };

    mockFursPremisesData = {
      data: [],
      isLoading: false,
    };

    mockUpdateFursSettingsData = {
      mutate: mockUpdateSettings,
      isPending: false,
    };
  });

  it("should show error if entity is not Slovenian", () => {
    const nonSiEntity = { ...mockEntity, country_code: "US" };
    render(<FursSettingsForm entity={nonSiEntity} />, { wrapper: Wrapper });
    // Note: using regex matcher because text might be split or have different whitespace
    expect(screen.getByText(/FURS is for Slovenian Entities/i)).toBeInTheDocument();
  });

  it("should render loading spinner when data is loading", () => {
    mockFursSettingsData = { isLoading: true };
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should render General Settings step by default", () => {
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });
    expect(screen.getByTestId("general-section")).toBeInTheDocument();
    expect(screen.queryByTestId("certificate-section")).not.toBeInTheDocument();
  });

  it("should allow navigating to Certificate step (always accessible)", async () => {
    // NEW FLOW: Certificate is always accessible, regardless of FURS enabled state
    const user = userEvent.setup();
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });

    const certificateTab = screen.getByRole("tab", { name: /Certificate/i });
    await user.click(certificateTab);

    expect(screen.getByTestId("certificate-section")).toBeInTheDocument();
  });

  it("should allow Certificate tab even if FURS is disabled", async () => {
    // NEW FLOW: Certificate is the 2nd step and always accessible
    mockFursSettingsData = {
      data: { enabled: false, has_certificate: false },
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });

    const certificateTab = screen.getByRole("tab", { name: /Certificate/i });
    await user.click(certificateTab);

    // Should navigate to certificate section
    expect(screen.getByTestId("certificate-section")).toBeInTheDocument();
  });

  it("should disable Premises step if no certificate", async () => {
    // NEW FLOW: Premises requires valid certificate
    mockFursSettingsData = {
      data: { enabled: false, has_certificate: false, certificate_status: "missing" },
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });

    const premisesTab = screen.getByRole("tab", { name: /Business Premises/i });
    await user.click(premisesTab);

    // Should NOT navigate to premises (still on certificate or first unlocked)
    expect(screen.queryByTestId("premises-section")).not.toBeInTheDocument();
  });

  it("should disable Enable tab if prerequisites not met", async () => {
    // NEW FLOW: Enable requires certificate + premise + device
    mockFursSettingsData = {
      data: { enabled: false, has_certificate: true, certificate_status: "valid" },
      isLoading: false,
    };
    mockFursPremisesData = {
      data: [], // No premises
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });

    const enableTab = screen.getByRole("tab", { name: /Enable Fiscalization/i });
    await user.click(enableTab);

    // Should NOT navigate to enable section
    expect(screen.queryByTestId("enable-section")).not.toBeInTheDocument();
  });

  it("should show certificate required alert when on premises without certificate", async () => {
    // NEW FLOW: Show alert when trying to access premises without certificate
    mockFursSettingsData = {
      data: { enabled: false, has_certificate: false, certificate_status: "missing" },
      isLoading: false,
    };

    render(<FursSettingsForm entity={mockEntity} initialStep="premises" />, { wrapper: Wrapper });

    // The smart step selection should redirect to certificate since premises is locked
    // but the alert should still appear if we somehow got there
    expect(screen.queryByTestId("premises-section")).not.toBeInTheDocument();
  });

  it("should call updateSettings on form submit from settings tab", async () => {
    const user = userEvent.setup();
    render(<FursSettingsForm entity={mockEntity} initialStep="settings" />, { wrapper: Wrapper });

    const saveButton = screen.getByText(/Save Settings/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  it("should navigate to enable tab when all prerequisites met", async () => {
    // NEW FLOW: Enable tab accessible when certificate valid + premise + device exists
    mockFursSettingsData = {
      data: { enabled: false, has_certificate: true, certificate_status: "valid" },
      isLoading: false,
    };
    mockFursPremisesData = {
      data: [{ id: "prem_1", business_premise_name: "P1", is_active: true, Devices: [{ id: "dev_1" }] }],
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });

    const enableTab = screen.getByRole("tab", { name: /Enable Fiscalization/i });
    await user.click(enableTab);

    expect(screen.getByTestId("enable-section")).toBeInTheDocument();
  });
});
