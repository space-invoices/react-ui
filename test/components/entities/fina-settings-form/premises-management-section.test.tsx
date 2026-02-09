import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockClosePremise = mock(() => undefined);
const mockRegisterDevice = mock(() => undefined);
let mockClosePremiseData: any = { mutate: mockClosePremise };
let mockRegisterDeviceData: any = { mutate: mockRegisterDevice, isPending: false };

mock.module("@/ui/components/entities/fina-settings-form/fina-settings.hooks", () => ({
  useCloseFinaPremise: (opts?: any) => {
    mockClosePremiseData._opts = opts;
    return mockClosePremiseData;
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
        premise_id: "PP1",
        type: "real_estate",
        real_estate: {
          street: "Ilica",
          house_number: "1",
          city: "Zagreb",
          postal_code: "10000",
          cadastral_municipality: "Zagreb",
          land_registry_number: "456",
        },
        is_active: true,
        registered_at: "2025-01-01",
        closed_at: null,
        created_at: "2025-01-01",
        Devices: [
          { id: "dev_1", device_id: "1" },
          { id: "dev_2", device_id: "2" },
        ],
      },
    ] as any;

    it("should display premise_id as name", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText("PP1")).toBeInTheDocument();
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

    it("should display device count and device IDs", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText("2 Devices")).toBeInTheDocument();
      expect(screen.getByText("1, 2")).toBeInTheDocument();
    });

    it("should display address for real estate premise", () => {
      render(<PremisesManagementSection entity={mockEntity} premises={mockPremises} t={t} />);
      expect(screen.getByText(/Ilica 1/)).toBeInTheDocument();
      expect(screen.getByText(/10000 Zagreb/)).toBeInTheDocument();
    });
  });

  describe("Warning for premises without devices", () => {
    it("should show warning alert when premise has no devices", () => {
      const premisesNoDevices = [
        {
          id: "prem_1",
          entity_id: "ent_123",
          premise_id: "PP1",
          type: "real_estate",
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

  describe("Movable premise display", () => {
    it("should display Vehicle type for movable premise", () => {
      const movablePremises = [
        {
          id: "prem_2",
          entity_id: "ent_123",
          premise_id: "MOB1",
          type: "movable",
          movable_premise: { type: "vehicle" },
          is_active: true,
          registered_at: "2025-01-01",
          closed_at: null,
          created_at: "2025-01-01",
          Devices: [{ id: "dev_1", device_id: "1" }],
        },
      ] as any;

      render(<PremisesManagementSection entity={mockEntity} premises={movablePremises} t={t} />);
      expect(screen.getByText("Vehicle")).toBeInTheDocument();
    });

    it("should display Market Stall type for market_stall movable premise", () => {
      const movablePremises = [
        {
          id: "prem_3",
          entity_id: "ent_123",
          premise_id: "MKT1",
          type: "movable",
          movable_premise: { type: "market_stall" },
          is_active: true,
          registered_at: "2025-01-01",
          closed_at: null,
          created_at: "2025-01-01",
          Devices: [{ id: "dev_1", device_id: "1" }],
        },
      ] as any;

      render(<PremisesManagementSection entity={mockEntity} premises={movablePremises} t={t} />);
      expect(screen.getByText("Market Stall")).toBeInTheDocument();
    });

    it("should display Other type for other movable premise", () => {
      const movablePremises = [
        {
          id: "prem_4",
          entity_id: "ent_123",
          premise_id: "OTH1",
          type: "movable",
          movable_premise: { type: "other" },
          is_active: true,
          registered_at: "2025-01-01",
          closed_at: null,
          created_at: "2025-01-01",
          Devices: [{ id: "dev_1", device_id: "1" }],
        },
      ] as any;

      render(<PremisesManagementSection entity={mockEntity} premises={movablePremises} t={t} />);
      expect(screen.getByText("Other")).toBeInTheDocument();
    });
  });

  describe("Device dialog", () => {
    it("should show numeric device ID input in add device dialog", async () => {
      const user = userEvent.setup();

      const premises = [
        {
          id: "prem_1",
          entity_id: "ent_123",
          premise_id: "PP1",
          type: "real_estate",
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
          premise_id: "PP1",
          type: "real_estate",
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
