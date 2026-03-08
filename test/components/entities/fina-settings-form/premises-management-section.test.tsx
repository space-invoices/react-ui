import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockDeletePremise = mock(() => undefined);
const mockDeleteDevice = mock(() => undefined);
const mockRegisterDevice = mock(() => undefined);
let mockDeletePremiseData: any = { mutate: mockDeletePremise };
let mockDeleteDeviceData: any = { mutate: mockDeleteDevice };
let mockRegisterDeviceData: any = { mutate: mockRegisterDevice, isPending: false };

mock.module("@/ui/components/entities/fina-settings-form/fina-settings.hooks", () => ({
  useDeleteFinaPremise: (opts?: any) => {
    mockDeletePremiseData._opts = opts;
    return mockDeletePremiseData;
  },
  useDeleteFinaDevice: (opts?: any) => {
    mockDeleteDeviceData._opts = opts;
    return mockDeleteDeviceData;
  },
  useRegisterFinaElectronicDevice: (opts?: any) => {
    mockRegisterDeviceData._opts = opts;
    return mockRegisterDeviceData;
  },
}));

mock.module("@/ui/components/entities/fina-settings-form/sections/register-premise-dialog", () => ({
  RegisterFinaPremiseDialog: () => <div data-testid="register-premise-dialog" />,
}));

import { PremisesManagementSection } from "@/ui/components/entities/fina-settings-form/sections/premises-management-section";

describe("FINA PremisesManagementSection", () => {
  const mockEntity = { id: "ent_123", country_code: "HR" };
  const t = (key: string) => key;

  beforeEach(() => {
    mockDeletePremise.mockClear();
    mockDeleteDevice.mockClear();
    mockRegisterDevice.mockClear();
    mockDeletePremiseData = { mutate: mockDeletePremise };
    mockDeleteDeviceData = { mutate: mockDeleteDevice };
    mockRegisterDeviceData = { mutate: mockRegisterDevice, isPending: false };
  });

  describe("Empty state", () => {
    it("should show empty state when no premises", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={[]} t={t} />);
      expect(screen.getByText("No premises registered yet")).toBeInTheDocument();
    });

    it("should show Add Premise button", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={[]} t={t} />);
      expect(screen.getByText("Add Premise")).toBeInTheDocument();
    });
  });

  describe("Premise cards", () => {
    const mockPremises = [
      {
        id: "prem_1",
        entity_id: "ent_123",
        business_premise_name: "PP1",
        type: "premise",
        is_active: true,
        registered_at: "2025-01-01",
        closed_at: null,
        created_at: "2025-01-01",
        Devices: [
          { id: "dev_1", electronic_device_name: "1" },
          { id: "dev_2", electronic_device_name: "2" },
        ],
      },
    ] as any;

    it("should display business_premise_name as name", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText("PP1")).toBeInTheDocument();
    });

    it("should display Active badge for active premise", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("should display Inactive badge for inactive premise", () => {
      const inactivePremises = [{ ...mockPremises[0], is_active: false, closed_at: "2025-06-01" }] as any;
      render(<PremisesManagementSection entity={mockEntity} premises={inactivePremises} t={t} />);
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("should display device count badge", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText("2 Devices")).toBeInTheDocument();
    });

    it("should display individual device IDs", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      // Device IDs are rendered in separate elements
      const deviceElements = screen.getAllByText(/^[12]$/);
      expect(deviceElements.length).toBe(2);
    });
  });

  describe("Warning for premises without devices", () => {
    it("should show warning alert when premise has no devices", () => {
      const premisesNoDevices = [
        {
          id: "prem_1",
          entity_id: "ent_123",
          business_premise_name: "PP1",
          type: "premise",
          is_active: true,
          registered_at: "2025-01-01",
          closed_at: null,
          created_at: "2025-01-01",
          Devices: [],
        },
      ] as any;

      render(<PremisesManagementSection entity={mockEntity} premises={premisesNoDevices} t={t} />);
      expect(
        screen.getByText("No devices registered. Add at least one device to fiscalize invoices."),
      ).toBeInTheDocument();
    });
  });

  describe("Device dialog", () => {
    it("should show numeric device ID input in add device dialog", async () => {
      const user = userEvent.setup();

      const premises = [
        {
          id: "prem_1",
          entity_id: "ent_123",
          business_premise_name: "PP1",
          type: "premise",
          is_active: true,
          registered_at: "2025-01-01",
          closed_at: null,
          created_at: "2025-01-01",
          Devices: [],
        },
      ] as any;

      render(<PremisesManagementSection entity={mockEntity} premises={premises} t={t} />);

      // Click "Add Electronic Device" from the no-device warning button
      const addDeviceButtons = screen.getAllByText("Add Electronic Device");
      await user.click(addDeviceButtons[0]);

      expect(screen.getByText("Device ID")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter a numeric device ID (e.g., 1, 2, 3)")).toBeInTheDocument();
    });

    it("should only allow numeric input in device ID field", async () => {
      const user = userEvent.setup();

      const premises = [
        {
          id: "prem_1",
          entity_id: "ent_123",
          business_premise_name: "PP1",
          type: "premise",
          is_active: true,
          registered_at: "2025-01-01",
          closed_at: null,
          created_at: "2025-01-01",
          Devices: [],
        },
      ] as any;

      render(<PremisesManagementSection entity={mockEntity} premises={premises} t={t} />);

      const addDeviceButtons = screen.getAllByText("Add Electronic Device");
      await user.click(addDeviceButtons[0]);

      const input = screen.getByPlaceholderText("Enter a numeric device ID (e.g., 1, 2, 3)");
      await user.type(input, "abc123def");

      // Only numeric characters should be kept
      expect(input).toHaveValue("123");
    });
  });
});
