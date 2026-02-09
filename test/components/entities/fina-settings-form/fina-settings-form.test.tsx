import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinaSettingsForm } from "@/ui/components/entities/fina-settings-form/fina-settings-form";
import en from "@/ui/components/entities/fina-settings-form/locales/en";
import { createTranslation } from "@/ui/lib/translation";

let mockFinaSettingsData: any = { data: { enabled: true, has_certificate: false }, isLoading: false };
let mockFinaPremisesData: any = { data: [], isLoading: false };
const mockUpdateSettings = mock(() => undefined);
let mockUpdateFinaSettingsData: any = { mutate: mockUpdateSettings, isPending: false };
const mockUploadCertificate = mock(() => undefined);
let mockUploadCertificateData: any = { mutate: mockUploadCertificate, isPending: false };
const mockClosePremise = mock(() => undefined);
const mockRegisterDevice = mock(() => undefined);

// Mock only hooks, NOT section components (to avoid mock.module contamination across test files)
mock.module("@/ui/components/entities/fina-settings-form/fina-settings.hooks", () => ({
  useFinaSettings: () => mockFinaSettingsData,
  useFinaPremises: () => mockFinaPremisesData,
  useUpdateFinaSettings: () => mockUpdateFinaSettingsData,
  useUploadFinaCertificate: () => mockUploadCertificateData,
  useCloseFinaPremise: () => ({ mutate: mockClosePremise }),
  useRegisterFinaElectronicDevice: () => ({ mutate: mockRegisterDevice, isPending: false }),
}));

// Mock only the register premise dialog (complex deps)
mock.module("@/ui/components/entities/fina-settings-form/sections/register-premise-dialog", () => ({
  RegisterFinaPremiseDialog: () => null,
}));

describe("FinaSettingsForm Translation Sanity Check", () => {
  it("should resolve keys correctly from en locale", () => {
    const translations = { en } as any;
    const { result } = renderHook(() => createTranslation({ locale: "en", translations }));
    const translate = result.current;

    expect(translate("Certificate")).toBe("Certificate");
    expect(translate("General Settings")).toBe("General Settings");
  });
});

describe("FinaSettingsForm", () => {
  const mockEntity = {
    id: "ent_123",
    country_code: "HR",
    environment: "production",
  };

  beforeEach(() => {
    mockUpdateSettings.mockClear();
    mockUploadCertificate.mockClear();

    mockFinaSettingsData = {
      data: { enabled: true, has_certificate: false },
      isLoading: false,
    };

    mockFinaPremisesData = {
      data: [],
      isLoading: false,
    };

    mockUpdateFinaSettingsData = {
      mutate: mockUpdateSettings,
      isPending: false,
    };

    mockUploadCertificateData = {
      mutate: mockUploadCertificate,
      isPending: false,
    };
  });

  it("should show error if entity is not Croatian", () => {
    const nonHrEntity = { ...mockEntity, country_code: "US" };
    render(<FinaSettingsForm entity={nonHrEntity} />);
    expect(screen.getByText(/FINA is for Croatian Entities/i)).toBeInTheDocument();
  });

  it("should render loading spinner when data is loading", () => {
    mockFinaSettingsData = { isLoading: true };
    render(<FinaSettingsForm entity={mockEntity} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should render General Settings step by default", () => {
    render(<FinaSettingsForm entity={mockEntity} />);
    expect(screen.getByText(/Save Settings/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Digital Certificate/i })).not.toBeInTheDocument();
  });

  it("should allow navigating to Certificate step (always accessible)", async () => {
    const user = userEvent.setup();
    render(<FinaSettingsForm entity={mockEntity} />);

    const certificateTab = screen.getByRole("tab", { name: /Certificate/i });
    await user.click(certificateTab);

    expect(screen.getByRole("heading", { name: /Digital Certificate/i })).toBeInTheDocument();
  });

  it("should allow Certificate tab even if FINA is disabled", async () => {
    mockFinaSettingsData = {
      data: { enabled: false, has_certificate: false },
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FinaSettingsForm entity={mockEntity} />);

    const certificateTab = screen.getByRole("tab", { name: /Certificate/i });
    await user.click(certificateTab);

    expect(screen.getByRole("heading", { name: /Digital Certificate/i })).toBeInTheDocument();
  });

  it("should disable Premises step if no certificate", async () => {
    mockFinaSettingsData = {
      data: { enabled: false, has_certificate: false, certificate_status: "missing" },
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FinaSettingsForm entity={mockEntity} />);

    const premisesTab = screen.getByRole("tab", { name: /Business Premises/i });
    await user.click(premisesTab);

    expect(screen.queryByText(/Register your business premises/i)).not.toBeInTheDocument();
  });

  it("should disable Enable tab if prerequisites not met", async () => {
    mockFinaSettingsData = {
      data: { enabled: false, has_certificate: true, certificate_status: "valid" },
      isLoading: false,
    };
    mockFinaPremisesData = {
      data: [],
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FinaSettingsForm entity={mockEntity} />);

    const enableTab = screen.getByRole("tab", { name: /Enable Fiscalization/i });
    await user.click(enableTab);

    expect(screen.queryByText(/Setup Checklist/i)).not.toBeInTheDocument();
  });

  it("should call updateSettings on Save Settings click", async () => {
    const user = userEvent.setup();
    render(<FinaSettingsForm entity={mockEntity} initialStep="settings" />);

    const saveButton = screen.getByText(/Save Settings/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  it("should navigate to enable tab when all prerequisites met", async () => {
    mockFinaSettingsData = {
      data: { enabled: false, has_certificate: true, certificate_status: "valid" },
      isLoading: false,
    };
    mockFinaPremisesData = {
      data: [{ id: "prem_1", premise_id: "PP1", is_active: true, Devices: [{ id: "dev_1" }] }],
      isLoading: false,
    };

    const user = userEvent.setup();
    render(<FinaSettingsForm entity={mockEntity} />);

    const enableTab = screen.getByRole("tab", { name: /Enable Fiscalization/i });
    await user.click(enableTab);

    expect(screen.getByText(/Setup Checklist/i)).toBeInTheDocument();
  });

  it("should redirect locked step to first unlocked step", () => {
    mockFinaSettingsData = {
      data: { enabled: false, has_certificate: false, certificate_status: "missing" },
      isLoading: false,
    };

    render(<FinaSettingsForm entity={mockEntity} initialStep="premises" />);

    expect(screen.queryByText(/Register your business premises/i)).not.toBeInTheDocument();
  });
});
