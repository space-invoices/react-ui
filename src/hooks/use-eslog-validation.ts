/**
 * Shared hook for eSLOG validation state.
 *
 * Encapsulates the eSLOG availability check, enabled toggle, and
 * entity error tracking duplicated across invoice and advance invoice forms.
 */

import { useEffect, useState } from "react";

type EslogError = {
  field: string;
  message: string;
  params?: Record<string, number | string>;
};

type Entity = {
  country_code?: string;
  settings?: Record<string, any>;
} | null;

export type EslogValidationInitialState = {
  validation_enabled?: boolean | null;
} | null;

export type EslogValidationResult = {
  /** Whether eSLOG is available (SI entity + setting enabled) */
  isAvailable: boolean;
  /** Current enabled state (undefined until initialized) */
  isEnabled: boolean | undefined;
  /** Toggle eSLOG validation on/off */
  setEnabled: (v: boolean) => void;
  /** Entity-level errors that require settings updates */
  entityErrors: EslogError[];
  /** Update entity errors (e.g. from validation results) */
  setEntityErrors: (errors: EslogError[]) => void;
  /** Whether eSLOG creates should also enforce UJP package/envelope prerequisites */
  requiresUjpValidation: boolean;
};

export function getInitialEslogValidationEnabled(
  isEditMode: boolean,
  eslog?: EslogValidationInitialState,
): boolean | undefined {
  if (!isEditMode) {
    return undefined;
  }

  return typeof eslog?.validation_enabled === "boolean" ? eslog.validation_enabled : undefined;
}

export function useEslogValidation(activeEntity: Entity, initialEnabled?: boolean): EslogValidationResult {
  const isSlovenianEntity = activeEntity?.country_code === "SI";
  const entityEslogEnabled = !!(activeEntity?.settings as any)?.eslog_validation_enabled;
  const isAvailable = isSlovenianEntity && entityEslogEnabled;
  const requiresUjpValidation = isAvailable && !!(activeEntity?.settings as any)?.ujp_validation_with_eslog_enabled;

  const [isEnabled, setEnabled] = useState<boolean | undefined>(initialEnabled);
  const [entityErrors, setEntityErrors] = useState<EslogError[]>([]);

  // Auto-enable when available and not yet initialized
  useEffect(() => {
    if (isAvailable && isEnabled === undefined) {
      setEnabled(true);
    }
  }, [isAvailable, isEnabled]);

  // Clear entity errors when disabled
  useEffect(() => {
    if (!isEnabled) {
      setEntityErrors([]);
    }
  }, [isEnabled]);

  return {
    isAvailable,
    isEnabled,
    setEnabled,
    entityErrors,
    setEntityErrors,
    requiresUjpValidation,
  };
}
