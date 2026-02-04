import type { Entity } from "@spaceinvoices/js-sdk";
import { Building2, Cpu, MapPin, MoreVertical, Truck } from "lucide-react";
import { type FC, type ReactNode, useState } from "react";
import type { SectionType } from "../furs-settings-form";

// Extended premise type - SDK type is incomplete, so we extend it locally
// TODO: Update SDK types when backend OpenAPI spec is fixed
type ExtendedFursBusinessPremise = {
  id: string;
  entity_id: string;
  business_premise_name: string;
  type: string;
  real_estate?: {
    cadastral_number?: string; // String in DB, not number
    building_number?: string; // String in DB, not number
    building_section?: string; // Renamed from building_section_number
    street?: string;
    house_number?: string;
    house_number_additional?: string | null;
    community?: string; // Added - required by FURS
    city?: string;
    postal_code?: string;
  };
  movable_premise?: {
    premise_type?: string;
  };
  is_active: boolean;
  environment: string;
  registered_at: Date | string | null;
  closed_at: Date | string | null;
  created_at: Date | string;
  Devices?: Array<{
    id: string;
    electronic_device_name?: string; // API returns this field name
    name?: string; // Frontend might use this
  }>;
};

import { Alert, AlertDescription } from "@/ui/components/ui/alert";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { cn } from "@/ui/lib/utils";
import { useClosePremise, useRegisterElectronicDevice } from "../furs-settings.hooks";
import { RegisterPremiseDialog } from "./register-premise-dialog";

interface PremisesManagementSectionProps {
  entity: Entity;
  premises: ExtendedFursBusinessPremise[];
  t: (key: string) => string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  wrapSection?: (section: SectionType, content: ReactNode) => ReactNode;
}

export const PremisesManagementSection: FC<PremisesManagementSectionProps> = ({
  entity,
  premises,
  t,
  onSuccess,
  onError,
  wrapSection,
}) => {
  const wrap = (section: SectionType, content: ReactNode) => (wrapSection ? wrapSection(section, content) : content);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [registerType, setRegisterType] = useState<"real-estate" | "movable">("real-estate");
  const [addDeviceDialogOpen, setAddDeviceDialogOpen] = useState(false);
  const [selectedPremiseId, setSelectedPremiseId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");

  const { mutate: closePremise } = useClosePremise({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const { mutate: registerDevice, isPending: isRegisteringDevice } = useRegisterElectronicDevice({
    onSuccess: () => {
      setAddDeviceDialogOpen(false);
      setDeviceName("");
      setSelectedPremiseId(null);
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const handleClosePremise = (premiseId: string) => {
    if (confirm(t("Are you sure you want to close this premise? This action cannot be undone."))) {
      closePremise({
        entityId: entity.id,
        premiseId,
      });
    }
  };

  const handleAddPremise = (type: "real-estate" | "movable") => {
    setRegisterType(type);
    setRegisterDialogOpen(true);
  };

  const handleAddDevice = (premiseId: string) => {
    setSelectedPremiseId(premiseId);
    setDeviceName("");
    setAddDeviceDialogOpen(true);
  };

  const handleRegisterDevice = () => {
    if (!selectedPremiseId || !deviceName.trim()) return;

    registerDevice({
      entityId: entity.id,
      premiseId: selectedPremiseId,
      deviceName: deviceName.trim(),
    });
  };

  const premisesContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{t("Business Premises")}</h3>
          <p className="text-muted-foreground text-sm">{t("Register your business premises with FURS")}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Add Premise Buttons */}
        <div className="flex gap-3">
          <Button onClick={() => handleAddPremise("real-estate")} variant="default" className="flex-1 cursor-pointer">
            <Building2 className="mr-2 h-4 w-4" />
            {t("Add Real Estate")}
          </Button>
          <Button onClick={() => handleAddPremise("movable")} variant="outline" className="flex-1 cursor-pointer">
            <Truck className="mr-2 h-4 w-4" />
            {t("Add Movable")}
          </Button>
        </div>

        {/* Premises List */}
        {premises.length === 0 ? (
          <Alert>
            <AlertDescription>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">{t("No premises registered yet")}</p>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {premises.map((premise) => (
              <Card key={premise.id} className={cn(!premise.is_active && "opacity-60")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{premise.business_premise_name}</CardTitle>
                        <Badge variant={premise.is_active ? "default" : "secondary"}>
                          {premise.is_active ? t("Active") : t("Closed")}
                        </Badge>
                        <Badge variant="outline">{premise.real_estate ? t("Real Estate") : t("Movable")}</Badge>
                      </div>
                      <CardDescription>
                        {premise.environment === "test" ? t("Test Environment") : t("Production")}
                      </CardDescription>
                    </div>
                    {premise.is_active && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAddDevice(premise.id)} className="cursor-pointer">
                            <Cpu className="mr-2 h-4 w-4" />
                            {t("Add Electronic Device")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleClosePremise(premise.id)}
                            className="cursor-pointer text-destructive"
                          >
                            {t("Close Premise")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Real Estate Info */}
                    {premise.real_estate && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {premise.real_estate.street} {premise.real_estate.house_number}
                            {premise.real_estate.house_number_additional &&
                              ` ${premise.real_estate.house_number_additional}`}
                          </p>
                          <p className="text-muted-foreground">
                            {premise.real_estate.postal_code} {premise.real_estate.city}
                          </p>
                          {premise.real_estate.cadastral_number && (
                            <p className="text-muted-foreground text-xs">
                              {t("Cadastral Number")}: {premise.real_estate.cadastral_number}
                              {premise.real_estate.building_number &&
                                ` / ${t("Building Number")}: ${premise.real_estate.building_number}`}
                              {premise.real_estate.building_section &&
                                ` / ${t("Building Section")}: ${premise.real_estate.building_section}`}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Movable Info */}
                    {premise.movable_premise && (
                      <div className="flex items-start gap-2 text-sm">
                        <Truck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {premise.movable_premise.premise_type === "A" && t("Vehicle")}
                            {premise.movable_premise.premise_type === "B" && t("Object at Market")}
                            {premise.movable_premise.premise_type === "C" && t("Other")}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Devices Count or Warning */}
                    {premise.Devices && premise.Devices.length > 0 ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Badge variant="secondary" className="text-xs">
                          {premise.Devices.length} {premise.Devices.length === 1 ? t("Device") : t("Devices")}
                        </Badge>
                        <span className="text-xs">
                          {premise.Devices.map((d) => d.electronic_device_name || d.name || t("Unnamed")).join(", ")}
                        </span>
                      </div>
                    ) : (
                      <Alert>
                        <AlertDescription className="flex items-center justify-between">
                          <span className="text-sm">
                            ⚠️ {t("No devices registered. Add at least one device to fiscalize invoices.")}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddDevice(premise.id)}
                            className="cursor-pointer"
                          >
                            <Cpu className="mr-2 h-4 w-4" />
                            {t("Add Electronic Device")}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Dates */}
                    <div className="flex gap-4 border-t pt-2 text-muted-foreground text-xs">
                      <span>
                        {t("Created")}: {new Date(premise.created_at).toLocaleDateString()}
                      </span>
                      {premise.closed_at && (
                        <span>
                          {t("Closed")}: {new Date(premise.closed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Register Premise Dialog */}
        <RegisterPremiseDialog
          open={registerDialogOpen}
          onOpenChange={setRegisterDialogOpen}
          entity={entity}
          type={registerType}
          t={t}
          onSuccess={() => {
            setRegisterDialogOpen(false);
            onSuccess?.();
          }}
          onError={onError}
        />

        {/* Add Device Dialog */}
        <Dialog open={addDeviceDialogOpen} onOpenChange={setAddDeviceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("Add Electronic Device")}</DialogTitle>
              <DialogDescription>
                {t("Register an electronic device (cash register, POS terminal) for this business premise.")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deviceName">{t("Device Name")}</Label>
                <Input
                  id="deviceName"
                  placeholder={t("E1")}
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && deviceName.trim()) {
                      handleRegisterDevice();
                    }
                  }}
                />
                <p className="text-muted-foreground text-sm">
                  {t("Enter a unique name for this device (e.g., E1, E2, POS1, DEVICE1)")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDeviceDialogOpen(false)}
                disabled={isRegisteringDevice}
                className="cursor-pointer"
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleRegisterDevice}
                disabled={!deviceName.trim() || isRegisteringDevice}
                className="cursor-pointer"
              >
                {isRegisteringDevice ? t("Registering...") : t("Register Device")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  return <>{wrap("premises-list", premisesContent)}</>;
};
