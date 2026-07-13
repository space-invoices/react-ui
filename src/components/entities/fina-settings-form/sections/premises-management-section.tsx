import { Building2, Cpu, Hash, Info, MoreVertical, Trash2 } from "lucide-react";
import { type FC, type ReactNode, useState } from "react";
import type { FinaSectionType } from "../fina-settings-form";

type FinaBusinessPremise = {
  id: string;
  entity_id: string;
  business_premise_name: string;
  starting_number?: number | null;
  can_update_starting_number?: boolean;
  type: string;
  is_active: boolean;
  registered_at: Date | string | null;
  closed_at: Date | string | null;
  created_at: Date | string;
  Devices?: Array<{
    id: string;
    electronic_device_name?: string;
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
  useDeleteFinaDevice,
  useDeleteFinaPremise,
  useRegisterFinaElectronicDevice,
  useUpdateFinaDevice,
  useUpdateFinaPremise,
} from "../fina-settings.hooks";
import { RegisterFinaPremiseDialog } from "./register-premise-dialog";

interface PremisesManagementSectionProps {
  entity: any;
  premises: FinaBusinessPremise[];
  t: (key: string) => string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  wrapSection?: (section: FinaSectionType, content: ReactNode) => ReactNode;
}

export const PremisesManagementSection: FC<PremisesManagementSectionProps> = ({
  entity,
  premises,
  t,
  onSuccess,
  onError,
  wrapSection,
}) => {
  const wrap = (section: FinaSectionType, content: ReactNode) =>
    wrapSection ? wrapSection(section, content) : content;
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [addDeviceDialogOpen, setAddDeviceDialogOpen] = useState(false);
  const [selectedPremiseId, setSelectedPremiseId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [deviceStartingNumber, setDeviceStartingNumber] = useState("");
  const [startingNumberTarget, setStartingNumberTarget] = useState<StartingNumberTarget | null>(null);
  const numberingSequence = (entity.settings?.fina?.numbering_sequence ?? "P") as "P" | "N";
  const isPremiseStartingNumberEnabled = numberingSequence === "P";
  const isDeviceStartingNumberEnabled = numberingSequence === "N";
  const startingNumberLockedMessage = t(
    "Starting number can no longer be changed after invoices have been issued for this fiscal sequence.",
  );

  const { mutate: deletePremise } = useDeleteFinaPremise({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const { mutate: deleteDevice } = useDeleteFinaDevice({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const { mutate: registerDevice, isPending: isRegisteringDevice } = useRegisterFinaElectronicDevice({
    onSuccess: () => {
      setAddDeviceDialogOpen(false);
      setDeviceId("");
      setDeviceStartingNumber("");
      setSelectedPremiseId(null);
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const { mutate: updatePremise, isPending: isUpdatingPremise } = useUpdateFinaPremise({
    onSuccess: () => {
      setStartingNumberTarget(null);
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const { mutate: updateDevice, isPending: isUpdatingDevice } = useUpdateFinaDevice({
    onSuccess: () => {
      setStartingNumberTarget(null);
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const handleDeletePremise = (premiseId: string) => {
    if (confirm(t("Are you sure you want to delete this premise? This will also deactivate all its devices."))) {
      deletePremise({
        entityId: entity.id,
        premiseId,
      });
    }
  };

  const handleDeleteDevice = (deviceId: string) => {
    if (confirm(t("Are you sure you want to delete this device?"))) {
      deleteDevice({
        entityId: entity.id,
        deviceId,
      });
    }
  };

  const handleAddDevice = (premiseId: string) => {
    setSelectedPremiseId(premiseId);
    setDeviceId("");
    setDeviceStartingNumber("1");
    setAddDeviceDialogOpen(true);
  };

  const handleRegisterDevice = () => {
    if (!selectedPremiseId || !deviceId.trim() || !isFiscalStartingNumberValueValid(deviceStartingNumber)) return;
    const startingNumber = isDeviceStartingNumberEnabled
      ? optionalFiscalStartingNumber(deviceStartingNumber)
      : undefined;

    registerDevice({
      entityId: entity.id,
      premiseId: selectedPremiseId,
      deviceId: deviceId.trim(),
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
          <p className="text-muted-foreground text-sm">{t("Manage your business premises for FINA")}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Info banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t("Register your premises on ePorezna first, then add the premise ID here.")}
          </AlertDescription>
        </Alert>

        {/* Add Premise Button */}
        <Button
          onClick={() => setRegisterDialogOpen(true)}
          variant="default"
          className="cursor-pointer"
          data-testid="fina-add-premise"
        >
          <Building2 className="mr-2 h-4 w-4" />
          {t("Add Premise")}
        </Button>

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
                          {premise.is_active ? t("Active") : t("Inactive")}
                        </Badge>
                      </div>
                      <CardDescription />
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
                            data-testid={`fina-add-device-${premise.business_premise_name}`}
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
                            onClick={() => handleDeletePremise(premise.id)}
                            className="cursor-pointer text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("Delete Premise")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Badge variant="secondary" className="text-xs">
                            {premise.Devices.length} {premise.Devices.length === 1 ? t("Device") : t("Devices")}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {premise.Devices.map((d) => (
                            <div key={d.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                              <Cpu className="h-3 w-3 text-muted-foreground" />
                              <span>{d.electronic_device_name || "?"}</span>
                              {isDeviceStartingNumberEnabled && d.starting_number != null && (
                                <span className="text-muted-foreground">
                                  {t("Starting Number")}: {d.starting_number}
                                </span>
                              )}
                              {premise.is_active && isDeviceStartingNumberEnabled && (
                                <DeviceStartingNumberButton
                                  canEdit={canEditStartingNumber(d)}
                                  title={t("Set Starting Number")}
                                  lockedMessage={startingNumberLockedMessage}
                                  onEdit={() =>
                                    handleEditStartingNumber({
                                      type: "device",
                                      id: d.id,
                                      premiseId: premise.id,
                                      label: d.electronic_device_name || "?",
                                      current: d.starting_number,
                                    })
                                  }
                                />
                              )}
                              {premise.is_active && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDevice(d.id)}
                                  className="ml-1 cursor-pointer text-muted-foreground hover:text-destructive"
                                  title={t("Delete Device")}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Alert>
                        <AlertDescription className="flex items-center justify-between">
                          <span className="text-sm">
                            {t("No devices registered. Add at least one device to fiscalize invoices.")}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddDevice(premise.id)}
                            className="cursor-pointer"
                            data-testid={`fina-add-device-${premise.business_premise_name}`}
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
        <RegisterFinaPremiseDialog
          open={registerDialogOpen}
          onOpenChange={setRegisterDialogOpen}
          entity={entity}
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
              <DialogDescription>{t("Register an electronic device for this business premise.")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deviceId">{t("Device ID")}</Label>
                <Input
                  id="deviceId"
                  placeholder={t("Enter a numeric device ID (e.g., 1, 2, 3)")}
                  value={deviceId}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setDeviceId(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && deviceId.trim()) {
                      handleRegisterDevice();
                    }
                  }}
                  data-testid="fina-device-id-input"
                />
              </div>
              {isDeviceStartingNumberEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="deviceStartingNumber">{t("Starting Number")}</Label>
                  <StartingNumberInput
                    id="deviceStartingNumber"
                    value={deviceStartingNumber}
                    onChange={setDeviceStartingNumber}
                    t={t}
                    data-testid="fina-device-starting-number-input"
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
                  !deviceId.trim() || isRegisteringDevice || !isFiscalStartingNumberValueValid(deviceStartingNumber)
                }
                className="cursor-pointer"
                data-testid="fina-register-device-submit"
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
          inputTestId="fina-starting-number-edit-input"
          saveTestId="fina-starting-number-save"
        />
      </div>
    </div>
  );

  return <>{wrap("premises-list", premisesContent)}</>;
};
