import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockClosePremise = mock(() => undefined);
const mockRegisterDevice = mock(() => undefined);
let mockClosePremiseData: any = { mutate: mockClosePremise };
let mockRegisterDeviceData: any = { mutate: mockRegisterDevice, isPending: false };

mock.module("@/ui/components/entities/furs-settings-form/furs-settings.hooks", () => ({
  useClosePremise: (opts?: any) => {
    mockClosePremiseData._opts = opts;
    return mockClosePremiseData;
  },
  useRegisterElectronicDevice: (opts?: any) => {
    mockRegisterDeviceData._opts = opts;
    return mockRegisterDeviceData;
  },
}));

mock.module("@/ui/components/entities/furs-settings-form/sections/register-premise-dialog", () => ({
  RegisterPremiseDialog: () => <div data-testid="register-premise-dialog" />,
}));

import { PremisesManagementSection } from "@/ui/components/entities/furs-settings-form/sections/premises-management-section";

describe("FURS PremisesManagementSection", () => {
  const mockEntity = { id: "ent_123", country_code: "SI" } as any;
  const t = (key: string) => key;

  beforeEach(() => {
    mockClosePremise.mockClear();
    mockRegisterDevice.mockClear();
    mockClosePremiseData = { mutate: mockClosePremise };
    mockRegisterDeviceData = { mutate: mockRegisterDevice, isPending: false };
  });

  describe("Empty state", () => {
    it("should show empty state when no premises", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={[]} t={t} />);
      expect(screen.getByText("No premises registered yet")).toBeInTheDocument();
    });

    it("should show Add Real Estate and Add Movable buttons", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={[]} t={t} />);
      expect(screen.getByText("Add Real Estate")).toBeInTheDocument();
      expect(screen.getByText("Add Movable")).toBeInTheDocument();
    });
  });

  describe("Premise cards", () => {
    const mockPremises = [
      {
        id: "prem_1",
        entity_id: "ent_123",
        business_premise_name: "OFFICE1",
        type: "real_estate",
        real_estate: {
          street: "Main Street",
          house_number: "1",
          city: "Ljubljana",
          postal_code: "1000",
          cadastral_number: "123",
          building_number: "456",
        },
        is_active: true,
        environment: "production",
        registered_at: "2025-01-01",
        closed_at: null,
        created_at: "2025-01-01",
        Devices: [
          { id: "dev_1", electronic_device_name: "E1" },
          { id: "dev_2", electronic_device_name: "E2" },
        ],
      },
    ] as any;

    it("should display premise name", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText("OFFICE1")).toBeInTheDocument();
    });

    it("should display Active badge for active premise", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("should display Closed badge for closed premise", () => {
      const closedPremises = [{ ...mockPremises[0], is_active: false, closed_at: "2025-06-01" }] as any;
      render(<PremisesManagementSection entity={mockEntity} premises={closedPremises} t={t} />);
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });

    it("should display Real Estate type badge", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText("Real Estate")).toBeInTheDocument();
    });

    it("should display device count and names", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText("2 Devices")).toBeInTheDocument();
      expect(screen.getByText("E1, E2")).toBeInTheDocument();
    });

    it("should display address for real estate premise", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText(/Main Street 1/)).toBeInTheDocument();
      expect(screen.getByText(/1000 Ljubljana/)).toBeInTheDocument();
    });
  });

  describe("Warning for premises without devices", () => {
    it("should show warning alert when premise has no devices", () => {
      const premisesNoDevices = [
        {
          id: "prem_1",
          entity_id: "ent_123",
          business_premise_name: "OFFICE1",
          type: "real_estate",
          is_active: true,
          environment: "production",
          registered_at: "2025-01-01",
          closed_at: null,
          created_at: "2025-01-01",
          Devices: [],
        },
      ] as any;

      render(<PremisesManagementSection entity={mockEntity} premises={premisesNoDevices} t={t} />);
      expect(
        screen.getByText(/No devices registered\. Add at least one device to fiscalize invoices\./),
      ).toBeInTheDocument();
    });
  });

  describe("Movable premise display", () => {
    it("should display Vehicle type for movable premise with type A", () => {
      const movablePremises = [
        {
          id: "prem_2",
          entity_id: "ent_123",
          business_premise_name: "VEH1",
          type: "movable",
          movable_premise: { premise_type: "A" },
          is_active: true,
          environment: "production",
          registered_at: "2025-01-01",
          closed_at: null,
          created_at: "2025-01-01",
          Devices: [{ id: "dev_1", electronic_device_name: "E1" }],
        },
      ] as any;

      render(<PremisesManagementSection entity={mockEntity} premises={movablePremises} t={t} />);
      expect(screen.getByText("Vehicle")).toBeInTheDocument();
    });
  });

  describe("Device dialog", () => {
    it("should show device name input in add device dialog", async () => {
      const user = userEvent.setup();

      const premises = [
        {
          id: "prem_1",
          entity_id: "ent_123",
          business_premise_name: "OFFICE1",
          type: "real_estate",
          is_active: true,
          environment: "production",
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

      expect(screen.getByText("Device Name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("E1")).toBeInTheDocument();
    });
  });
});
