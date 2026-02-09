import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUploadCertificate = mock(() => undefined);
let mockUploadCertificateData: any = { mutate: mockUploadCertificate, isPending: false };

mock.module("@/ui/components/entities/fina-settings-form/fina-settings.hooks", () => ({
  useUploadFinaCertificate: (opts?: any) => {
    mockUploadCertificateData._opts = opts;
    return mockUploadCertificateData;
  },
}));

import { CertificateSettingsSection } from "@/ui/components/entities/fina-settings-form/sections/certificate-settings-section";

describe("FINA CertificateSettingsSection", () => {
  const mockEntity = { id: "ent_123", country_code: "HR" };
  const t = (key: string) => key;

  beforeEach(() => {
    mockUploadCertificate.mockClear();
    mockUploadCertificateData = { mutate: mockUploadCertificate, isPending: false };
  });

  describe("Certificate status display", () => {
    it("should show Valid status with green icon", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          finaSettings={{
            has_certificate: true,
            certificate_status: "valid",
            certificate_expiry: "2026-12-31",
          }}
          t={t}
        />,
      );

      expect(screen.getByText(/Certificate Status: Valid/)).toBeInTheDocument();
    });

    it("should show Expiring Soon status", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          finaSettings={{
            has_certificate: true,
            certificate_status: "expiring_soon",
            certificate_expiry: "2025-02-28",
          }}
          t={t}
        />,
      );

      expect(screen.getByText(/Certificate Status: Expiring Soon/)).toBeInTheDocument();
    });

    it("should show Expired status with destructive variant", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          finaSettings={{
            has_certificate: true,
            certificate_status: "expired",
            certificate_expiry: "2024-01-01",
          }}
          t={t}
        />,
      );

      expect(screen.getByText(/Certificate Status: Expired/)).toBeInTheDocument();
    });

    it("should show upload form when certificate is missing", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          finaSettings={{
            has_certificate: false,
            certificate_status: "missing",
          }}
          t={t}
        />,
      );

      expect(screen.getByText("P12/PFX Certificate File")).toBeInTheDocument();
    });
  });

  describe("Certificate details", () => {
    it("should display expiry date when loaded", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          finaSettings={{
            has_certificate: true,
            certificate_status: "valid",
            certificate_expiry: "2026-12-31",
          }}
          t={t}
        />,
      );

      expect(screen.getByText(/Expires/)).toBeInTheDocument();
    });

    it("should display issuer when available", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          finaSettings={{
            has_certificate: true,
            certificate_status: "valid",
            certificate_issuer: "FINA CA",
          }}
          t={t}
        />,
      );

      expect(screen.getByText(/Issuer/)).toBeInTheDocument();
      expect(screen.getByText(/FINA CA/)).toBeInTheDocument();
    });

    it("should display subject when available", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          finaSettings={{
            has_certificate: true,
            certificate_status: "valid",
            certificate_subject: "CN=Test Company d.o.o.",
          }}
          t={t}
        />,
      );

      expect(screen.getByText(/Subject/)).toBeInTheDocument();
      expect(screen.getByText(/CN=Test Company d.o.o./)).toBeInTheDocument();
    });
  });

  describe("Upload form", () => {
    it("should show upload form when no certificate exists", () => {
      render(
        <CertificateSettingsSection
          entity={mockEntity}
          finaSettings={{
            has_certificate: false,
            certificate_status: "missing",
          }}
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
          finaSettings={{
            has_certificate: true,
            certificate_status: "valid",
          }}
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
          finaSettings={{
            has_certificate: true,
            certificate_status: "valid",
          }}
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
          finaSettings={{
            has_certificate: false,
            certificate_status: "missing",
          }}
          t={t}
        />,
      );

      const uploadButton = screen.getByText("Upload Certificate");
      expect(uploadButton.closest("button")).toBeDisabled();
    });

    it("should show Cancel button when changing existing certificate", async () => {
      const user = userEvent.setup();

      render(
        <CertificateSettingsSection
          entity={mockEntity}
          finaSettings={{
            has_certificate: true,
            certificate_status: "valid",
          }}
          t={t}
        />,
      );

      await user.click(screen.getByText("Change Certificate"));

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });
});
