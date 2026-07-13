import type { Entity } from "@spaceinvoices/js-sdk";
import { Building2, Cpu, Hash, MapPin, MoreVertical, Truck } from "lucide-react";
import { type FC, type ReactNode, useState } from "react";
import type { SectionType } from "../furs-settings-form";

// Local UI view model extends the SDK type with the response fields this section reads.
type ExtendedFursBusinessPremise = {
  id: string;
  entity_id: string;
  business_premise_name: string;
  starting_number?: number | null;
  can_update_starting_number?: boolean;
  type: string;
  real_estate?: {
    cadastral_number?: string; // String in DB, not number
    building_number?: string; // String in DB, not number
    building_section?: string; // Stored as string in DB/API
    street?: string;
    house_number?: string;
    house_number_additional?: string | null;
    community?: string;
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
    starting_number?: number | null;
    can_update_starting_number?: boolean;
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
import {
  canEditStartingNumber,
  isFiscalStartingNumberValueValid,
  optionalFiscalStartingNumber,
} from "../../fiscal-starting-number";
import {
  DeviceStartingNumberButton,
  StartingNumberDialog,
  StartingNumberInput,
  StartingNumberMenuItem,
  type StartingNumberTarget,
} from "../../starting-number-dialog";
import {
  useClosePremise,
  useRegisterElectronicDevice,
  useUpdateFursDevice,
  useUpdateFursPremise,
} from "../furs-settings.hooks";
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
  const [deviceStartingNumber, setDeviceStartingNumber] = useState("");
  const [startingNumberTarget, setStartingNumberTarget] = useState<StartingNumberTarget | null>(null);
  const numberingStrategy = (entity.settings?.furs?.numbering_strategy ?? "C") as "B" | "C";
  const isPremiseStartingNumberEnabled = numberingStrategy === "C";
  const isDeviceStartingNumberEnabled = numberingStrategy === "B";
  const startingNumberLockedMessage = t(
    "Starting number can no longer be changed after invoices have been issued for this fiscal sequence.",
  );

  const getSuggestedDeviceName = (premiseId: string) => {
    const premise = premises.find((item) => item.id === premiseId);
    const nextIndex = (premise?.Devices?.length || 0) + 1;
    return `E${nextIndex}`;
  };

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
      setDeviceStartingNumber("");
      setSelectedPremiseId(null);
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const { mutate: updatePremise, isPending: isUpdatingPremise } = useUpdateFursPremise({
    onSuccess: () => {
      setStartingNumberTarget(null);
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const { mutate: updateDevice, isPending: isUpdatingDevice } = useUpdateFursDevice({
    onSuccess: () => {
      setStartingNumberTarget(null);
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
    setDeviceName(getSuggestedDeviceName(premiseId));
    setDeviceStartingNumber("1");
    setAddDeviceDialogOpen(true);
  };

  const handleRegisterDevice = () => {
    if (!selectedPremiseId || !deviceName.trim() || !isFiscalStartingNumberValueValid(deviceStartingNumber)) return;
    const startingNumber = isDeviceStartingNumberEnabled
      ? optionalFiscalStartingNumber(deviceStartingNumber)
      : undefined;

    registerDevice({
      entityId: entity.id,
      premiseId: selectedPremiseId,
      deviceName: deviceName.trim(),
      startingNumber,
    });
  };

  const handleEditStartingNumber = (target: StartingNumberTarget) => {
    setStartingNumberTarget(target);
  };

  const handleSaveStartingNumber = (value: number | null, target: StartingNumberTarget) => {
    if (target.type === "premise") {
      updatePremise({
        entityId: entity.id,
        premiseId: target.id,
        data: { starting_number: value },
      });
      return;
    }

    updateDevice({
      entityId: entity.id,
      premiseId: target.premiseId,
      deviceId: target.id,
      data: { starting_number: value },
    });
  };

  const isUpdatingStartingNumber = isUpdatingPremise || isUpdatingDevice;

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
          <Button
            onClick={() => handleAddPremise("real-estate")}
            variant="default"
            className="flex-1 cursor-pointer"
            data-testid="furs-add-real-estate-premise"
          >
            <Building2 className="mr-2 h-4 w-4" />
            {t("Add Real Estate")}
          </Button>
          <Button
            onClick={() => handleAddPremise("movable")}
            variant="outline"
            className="flex-1 cursor-pointer"
            data-testid="furs-add-movable-premise"
          >
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
                          <DropdownMenuItem
                            onClick={() => handleAddDevice(premise.id)}
                            className="cursor-pointer"
                            data-testid={`furs-add-device-${premise.business_premise_name}`}
                          >
                            <Cpu className="mr-2 h-4 w-4" />
                            {t("Add Electronic Device")}
                          </DropdownMenuItem>
                          {isPremiseStartingNumberEnabled && (
                            <StartingNumberMenuItem
                              label={t("Set Starting Number")}
                              canEdit={canEditStartingNumber(premise)}
                              lockedMessage={startingNumberLockedMessage}
                              onEdit={() =>
                                handleEditStartingNumber({
                                  type: "premise",
                                  id: premise.id,
                                  label: premise.business_premise_name,
                                  current: premise.starting_number,
                                })
                              }
                            />
                          )}
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

                    {isPremiseStartingNumberEnabled && premise.starting_number != null && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Hash className="h-4 w-4" />
                        <span>
                          {t("Starting Number")}: {premise.starting_number}
                        </span>
                      </div>
                    )}

                    {/* Devices Count or Warning */}
                    {premise.Devices && premise.Devices.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Badge variant="secondary" className="text-xs">
                            {premise.Devices.length} {premise.Devices.length === 1 ? t("Device") : t("Devices")}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {premise.Devices.map((device) => {
                            const deviceName = device.electronic_device_name || device.name || t("Unnamed");

                            return (
                              <div key={device.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                                <Cpu className="h-3 w-3 text-muted-foreground" />
                                <span>{deviceName}</span>
                                {isDeviceStartingNumberEnabled && device.starting_number != null && (
                                  <span className="text-muted-foreground">
                                    {t("Starting Number")}: {device.starting_number}
                                  </span>
                                )}
                                {premise.is_active && isDeviceStartingNumberEnabled && (
                                  <DeviceStartingNumberButton
                                    canEdit={canEditStartingNumber(device)}
                                    title={t("Set Starting Number")}
                                    lockedMessage={startingNumberLockedMessage}
                                    onEdit={() =>
                                      handleEditStartingNumber({
                                        type: "device",
                                        id: device.id,
                                        premiseId: premise.id,
                                        label: deviceName,
                                        current: device.starting_number,
                                      })
                                    }
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <Alert>
                        <AlertDescription className="flex items-center justify-between">
                          <span className="text-sm">
                            ⚠️ {t("No devices registered. Add at least one device to fiscalize invoices.")}
                          </span>
                          {premise.is_active ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddDevice(premise.id)}
                              className="cursor-pointer"
                              data-testid={`furs-add-device-${premise.business_premise_name}`}
                            >
                              <Cpu className="mr-2 h-4 w-4" />
                              {t("Add Electronic Device")}
                            </Button>
                          ) : null}
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
          premises={premises}
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
                  data-testid="furs-device-name-input"
                />
                <p className="text-muted-foreground text-sm">
                  {t("Enter a unique name for this device (e.g., E1, E2, POS1, DEVICE1)")}
                </p>
              </div>
              {isDeviceStartingNumberEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="deviceStartingNumber">{t("Starting Number")}</Label>
                  <StartingNumberInput
                    id="deviceStartingNumber"
                    value={deviceStartingNumber}
                    onChange={setDeviceStartingNumber}
                    t={t}
                    data-testid="furs-device-starting-number-input"
                  />
                  <p className="text-muted-foreground text-sm">{t("First invoice number for this device sequence")}</p>
                </div>
              )}
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
                disabled={
                  !deviceName.trim() || isRegisteringDevice || !isFiscalStartingNumberValueValid(deviceStartingNumber)
                }
                className="cursor-pointer"
                data-testid="furs-register-device-submit"
              >
                {isRegisteringDevice ? t("Registering...") : t("Register Device")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <StartingNumberDialog
          target={startingNumberTarget}
          onOpenChange={(open) => !open && setStartingNumberTarget(null)}
          onSave={handleSaveStartingNumber}
          isPending={isUpdatingStartingNumber}
          t={t}
          inputTestId="furs-starting-number-edit-input"
          saveTestId="furs-starting-number-save"
        />
      </div>
    </div>
  );

  return <>{wrap("premises-list", premisesContent)}</>;
};
