import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Entity } from "@spaceinvoices/js-sdk";
import { render, renderHook, screen } from "@testing-library/react";
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
const mockUploadCertificate = mock(() => undefined);
let mockUploadCertificateData: any = { mutate: mockUploadCertificate, isPending: false, isSuccess: false };
const mockClosePremise = mock(() => undefined);
const mockRegisterDevice = mock(() => undefined);

const mockUpdateUserSettings = mock(() => undefined);

// Mock the hooks — but NOT the section components (to avoid mock.module contamination)
mock.module("@/ui/components/entities/furs-settings-form/furs-settings.hooks", () => ({
  useFursSettings: () => mockFursSettingsData,
  useFursPremises: () => mockFursPremisesData,
  useUpdateFursSettings: () => mockUpdateFursSettingsData,
  useUploadFursCertificate: () => mockUploadCertificateData,
  useClosePremise: () => ({ mutate: mockClosePremise }),
  useRegisterElectronicDevice: () => ({ mutate: mockRegisterDevice, isPending: false }),
  useUserFursSettings: () => ({ data: null, isLoading: false }),
  useUpdateUserFursSettings: () => ({ mutate: mockUpdateUserSettings, isPending: false }),
  useCurrentUser: () => ({ data: null, isLoading: false }),
}));

// Mock the register premise dialog since it has complex deps
mock.module("@/ui/components/entities/furs-settings-form/sections/register-premise-dialog", () => ({
  RegisterPremiseDialog: () => null,
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
    mockUploadCertificate.mockClear();

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

    mockUploadCertificateData = {
      mutate: mockUploadCertificate,
      isPending: false,
      isSuccess: false,
    };
  });

  it("should show error if entity is not Slovenian", () => {
    const nonSiEntity = { ...mockEntity, country_code: "US" };
    render(<FursSettingsForm entity={nonSiEntity} />, { wrapper: Wrapper });
    expect(screen.getByText(/FURS is for Slovenian Entities/i)).toBeInTheDocument();
  });

  it("should render loading spinner when data is loading", () => {
    mockFursSettingsData = { isLoading: true };
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should render General Settings step when all steps are complete", () => {
    // When all steps are complete, smart step defaults to "settings"
    mockFursSettingsData = {
      data: { enabled: true, has_certificate: true, certificate_status: "valid" },
      isLoading: false,
    };
    mockFursPremisesData = {
      data: [{ id: "prem_1", business_premise_name: "P1", is_active: true, Devices: [{ id: "dev_1" }] }],
      isLoading: false,
    };

    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });
    // General settings section renders operator settings content
    expect(screen.getByText(/Your Operator Settings/i)).toBeInTheDocument();
  });

  it("should allow navigating to Certificate step from settings", async () => {
    // Set all complete so form defaults to settings step
    mockFursSettingsData = {
      data: { enabled: true, has_certificate: true, certificate_status: "valid" },
      isLoading: false,
    };
    mockFursPremisesData = {
      data: [{ id: "prem_1", business_premise_name: "P1", is_active: true, Devices: [{ id: "dev_1" }] }],
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });

    const certificateTab = screen.getByRole("tab", { name: /Certificate/i });
    await user.click(certificateTab);

    expect(screen.getByRole("heading", { name: /Digital Certificate/i })).toBeInTheDocument();
  });

  it("should show certificate step content when initialStep is certificate", () => {
    mockFursSettingsData = {
      data: { enabled: false, has_certificate: false },
      isLoading: false,
    };

    render(<FursSettingsForm entity={mockEntity} initialStep="certificate" />, { wrapper: Wrapper });

    // Certificate step is always accessible, so initialStep="certificate" works
    expect(screen.getByText(/Upload your FURS digital certificate/i)).toBeInTheDocument();
  });

  it("should disable Premises step if no certificate", async () => {
    mockFursSettingsData = {
      data: { enabled: false, has_certificate: false, certificate_status: "missing" },
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FursSettingsForm entity={mockEntity} />, { wrapper: Wrapper });

    const premisesTab = screen.getByRole("tab", { name: /Business Premises/i });
    await user.click(premisesTab);

    // Should NOT navigate to premises (still on first unlocked step)
    expect(screen.queryByText(/Register your business premises/i)).not.toBeInTheDocument();
  });

  it("should disable Enable tab if prerequisites not met", async () => {
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
    expect(screen.queryByText(/Setup Checklist/i)).not.toBeInTheDocument();
  });

  it("should show certificate required alert when on premises without certificate", async () => {
    mockFursSettingsData = {
      data: { enabled: false, has_certificate: false, certificate_status: "missing" },
      isLoading: false,
    };

    render(<FursSettingsForm entity={mockEntity} initialStep="premises" />, { wrapper: Wrapper });

    // The smart step selection should redirect to certificate since premises is locked
    expect(screen.queryByText(/Register your business premises/i)).not.toBeInTheDocument();
  });

  it("should navigate to enable tab when all prerequisites met", async () => {
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

    expect(screen.getByText(/Setup Checklist/i)).toBeInTheDocument();
  });
});
