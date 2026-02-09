import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUploadCertificate = mock(() => undefined);
let mockUploadCertificateData: any = { mutate: mockUploadCertificate, isPending: false, isSuccess: false };

mock.module("@/ui/components/entities/furs-settings-form/furs-settings.hooks", () => ({
  useUploadFursCertificate: (opts?: any) => {
    // Store callbacks so we can simulate success/error
    mockUploadCertificateData._opts = opts;
    return mockUploadCertificateData;
  },
}));

import { CertificateSettingsSection } from "@/ui/components/entities/furs-settings-form/sections/certificate-settings-section";

describe("FURS CertificateSettingsSection", () => {
  const mockEntity = { id: "ent_123", country_code: "SI" } as any;
  const t = (key: string) => key;

  beforeEach(() => {
    mockUploadCertificate.mockClear();
    mockUploadCertificateData = { mutate: mockUploadCertificate, isPending: false, isSuccess: false };
  });

  describe("Certificate status display", () => {
    it("should show Valid status with green icon", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: true,
              certificate_status: "valid",
              certificate_expiry: "2026-12-31",
            } as any
          }
          t={t}
        />,
      );

      expect(screen.getByText(/Certificate Status: Valid/)).toBeInTheDocument();
    });

    it("should show Expiring Soon status", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: true,
              certificate_status: "expiring_soon",
              certificate_expiry: "2025-02-28",
            } as any
          }
          t={t}
        />,
      );

      expect(screen.getByText(/Certificate Status: Expiring Soon/)).toBeInTheDocument();
    });

    it("should show Expired status with destructive variant", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: true,
              certificate_status: "expired",
              certificate_expiry: "2024-01-01",
            } as any
          }
          t={t}
        />,
      );

      expect(screen.getByText(/Certificate Status: Expired/)).toBeInTheDocument();
    });

    it("should show Missing status when no certificate", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: false,
              certificate_status: "missing",
            } as any
          }
          t={t}
        />,
      );

      // Upload form should be visible when missing
      expect(screen.getByText("P12/PFX Certificate File")).toBeInTheDocument();
    });
  });

  describe("Certificate details", () => {
    it("should display expiry date when loaded", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: true,
              certificate_status: "valid",
              certificate_expiry: "2026-12-31",
            } as any
          }
          t={t}
        />,
      );

      expect(screen.getByText(/Expires/)).toBeInTheDocument();
    });

    it("should display issuer when available", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: true,
              certificate_status: "valid",
              certificate_issuer: "FURS CA",
            } as any
          }
          t={t}
        />,
      );

      expect(screen.getByText(/Issuer/)).toBeInTheDocument();
      expect(screen.getByText(/FURS CA/)).toBeInTheDocument();
    });

    it("should display subject when available", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: true,
              certificate_status: "valid",
              certificate_subject: "CN=Test Company",
            } as any
          }
          t={t}
        />,
      );

      expect(screen.getByText(/Subject/)).toBeInTheDocument();
      expect(screen.getByText(/CN=Test Company/)).toBeInTheDocument();
    });
  });

  describe("Upload form", () => {
    it("should show upload form when no certificate exists", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: false,
              certificate_status: "missing",
            } as any
          }
          t={t}
        />,
      );

      expect(screen.getByText("P12/PFX Certificate File")).toBeInTheDocument();
      expect(screen.getByText("Certificate Passphrase")).toBeInTheDocument();
    });

    it("should show Change Certificate button when certificate exists", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: true,
              certificate_status: "valid",
            } as any
          }
          t={t}
        />,
      );

      expect(screen.getByText("Change Certificate")).toBeInTheDocument();
    });

    it("should show upload form after clicking Change Certificate", async () => {
      const user = userEvent.setup();

      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: true,
              certificate_status: "valid",
            } as any
          }
          t={t}
        />,
      );

      await user.click(screen.getByText("Change Certificate"));

      expect(screen.getByText("P12/PFX Certificate File")).toBeInTheDocument();
    });

    it("should disable upload button without file and passphrase", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          fursSettings={
            {
              has_certificate: false,
              certificate_status: "missing",
            } as any
          }
          t={t}
        />,
      );

      const uploadButton = screen.getByText("Upload Certificate");
      expect(uploadButton.closest("button")).toBeDisabled();
    });
  });
});
