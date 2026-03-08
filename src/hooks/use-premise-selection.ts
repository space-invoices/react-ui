/**
 * Shared hook for FURS/FINA premise and device selection.
 *
 * Encapsulates the premise/device loading, localStorage persistence,
 * auto-selection, and readiness logic duplicated across invoice,
 * credit note, and advance invoice create forms.
 */

import { useEffect, useMemo, useState } from "react";

import { useFinaPremises, useFinaSettings } from "../components/entities/fina-settings-form/fina-settings.hooks";
import { useFursPremises, useFursSettings } from "../components/entities/furs-settings-form/furs-settings.hooks";
import {
  type FinaCombo,
  type FursCombo,
  getLastUsedFinaCombo,
  getLastUsedFursCombo,
  setLastUsedFinaCombo,
  setLastUsedFursCombo,
} from "../components/invoices/invoices.hooks";

/** Minimal premise shape needed by the hook */
type Premise = {
  id: string;
  business_premise_name: string;
  is_active?: boolean;
  Devices?: Array<{
    electronic_device_name: string;
    is_active?: boolean;
  }>;
};

export type PremiseSelectionResult = {
  /** Whether the fiscalization system is enabled in settings */
  isEnabled: boolean;
  /** Raw settings object (for form-specific logic like unified_numbering) */
  settings: any;
  /** Whether settings/premises are still loading */
  isLoading: boolean;
  /** Active (non-archived) premises */
  activePremises: Premise[];
  /** Whether there are any active premises */
  hasPremises: boolean;
  /** Active devices for the currently selected premise */
  activeDevices: Array<{ electronic_device_name: string; is_active?: boolean }>;
  /** Currently selected premise name */
  selectedPremiseName: string | undefined;
  /** Currently selected device name */
  selectedDeviceName: string | undefined;
  /** Update selected premise */
  setSelectedPremiseName: (name: string | undefined) => void;
  /** Update selected device */
  setSelectedDeviceName: (name: string | undefined) => void;
  /** True when disabled OR both premise+device are selected */
  isSelectionReady: boolean;
  /** True when enabled, has premises, and both are selected */
  isActive: boolean;
  /** Save current combo to localStorage (call on successful submission) */
  saveCombo: () => void;
};

export function usePremiseSelection(opts: {
  entityId: string;
  type: "furs" | "fina";
  enabled?: boolean;
}): PremiseSelectionResult {
  const { entityId, type } = opts;
  const externalEnabled = opts.enabled !== false;

  // --- FURS hooks (only called when type is furs) ---
  const { data: fursSettings, isLoading: isFursSettingsLoading } = useFursSettings(entityId, {
    enabled: type === "furs" && externalEnabled,
  });
  const { data: fursPremises, isLoading: isFursPremisesLoading } = useFursPremises(entityId, {
    enabled: type === "furs" && externalEnabled && fursSettings?.enabled === true,
  });

  // --- FINA hooks (only called when type is fina) ---
  const { data: finaSettings, isLoading: isFinaSettingsLoading } = useFinaSettings(entityId, {
    enabled: type === "fina" && externalEnabled,
  });
  const { data: finaPremises, isLoading: isFinaPremisesLoading } = useFinaPremises(entityId, {
    enabled: type === "fina" && externalEnabled && finaSettings?.enabled === true,
  });

  // Unified values
  const settings = type === "furs" ? fursSettings : finaSettings;
  const premises = type === "furs" ? fursPremises : finaPremises;
  const isSettingsLoading = type === "furs" ? isFursSettingsLoading : isFinaSettingsLoading;
  const isPremisesLoading = type === "furs" ? isFursPremisesLoading : isFinaPremisesLoading;

  const isEnabled = settings?.enabled === true;
  const isLoading = isSettingsLoading || (isEnabled && isPremisesLoading);

  const activePremises = useMemo(() => (premises?.filter((p: any) => p.is_active) as Premise[]) || [], [premises]);
  const hasPremises = activePremises.length > 0;

  // Selection state
  const [selectedPremiseName, setSelectedPremiseName] = useState<string | undefined>();
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | undefined>();

  // Active devices for selected premise
  const activeDevices = useMemo(() => {
    if (!selectedPremiseName) return [];
    const premise = activePremises.find((p) => p.business_premise_name === selectedPremiseName);
    const devices = premise?.Devices?.filter((d) => d.is_active) || [];
    // For FURS, exclude the legacy "OLD" device
    return type === "furs" ? devices.filter((d) => d.electronic_device_name !== "OLD") : devices;
  }, [activePremises, selectedPremiseName, type]);

  // Initialize selection from localStorage or first active combo
  useEffect(() => {
    if (!isEnabled || !hasPremises || selectedPremiseName) return;

    const lastUsed = type === "furs" ? getLastUsedFursCombo(entityId) : getLastUsedFinaCombo(entityId);

    if (lastUsed) {
      const premise = activePremises.find((p) => p.business_premise_name === lastUsed.business_premise_name);
      const device = premise?.Devices?.find(
        (d) => d.electronic_device_name === lastUsed.electronic_device_name && d.is_active,
      );
      if (premise && device) {
        setSelectedPremiseName(lastUsed.business_premise_name);
        setSelectedDeviceName(lastUsed.electronic_device_name);
        return;
      }
    }

    // Fall back to first active premise/device
    const firstPremise = activePremises[0];
    const firstDevice = firstPremise?.Devices?.find((d) => d.is_active);
    if (firstPremise && firstDevice) {
      setSelectedPremiseName(firstPremise.business_premise_name);
      setSelectedDeviceName(firstDevice.electronic_device_name);
    }
  }, [isEnabled, hasPremises, activePremises, entityId, selectedPremiseName, type]);

  // When premise changes, auto-select first active device if current is invalid
  useEffect(() => {
    if (!selectedPremiseName) return;
    const premise = activePremises.find((p) => p.business_premise_name === selectedPremiseName);
    const devicesForPremise =
      type === "furs"
        ? premise?.Devices?.filter((d) => d.is_active && d.electronic_device_name !== "OLD")
        : premise?.Devices?.filter((d) => d.is_active);
    const firstDevice = devicesForPremise?.[0];
    if (firstDevice && selectedDeviceName !== firstDevice.electronic_device_name) {
      const currentDeviceInPremise = devicesForPremise?.find((d) => d.electronic_device_name === selectedDeviceName);
      if (!currentDeviceInPremise) {
        setSelectedDeviceName(firstDevice.electronic_device_name);
      }
    }
  }, [selectedPremiseName, activePremises, selectedDeviceName, type]);

  const isSelectionReady = !isEnabled || !hasPremises || (!!selectedPremiseName && !!selectedDeviceName);
  const isActive = !!(isEnabled && hasPremises && selectedPremiseName && selectedDeviceName);

  const saveCombo = () => {
    if (!isActive || !selectedPremiseName || !selectedDeviceName) return;
    const combo: FursCombo | FinaCombo = {
      business_premise_name: selectedPremiseName,
      electronic_device_name: selectedDeviceName,
    };
    if (type === "furs") {
      setLastUsedFursCombo(entityId, combo);
    } else {
      setLastUsedFinaCombo(entityId, combo);
    }
  };

  return {
    isEnabled,
    settings,
    isLoading: !!isLoading,
    activePremises,
    hasPremises,
    activeDevices,
    selectedPremiseName,
    selectedDeviceName,
    setSelectedPremiseName,
    setSelectedDeviceName,
    isSelectionReady,
    isActive,
    saveCombo,
  };
}
