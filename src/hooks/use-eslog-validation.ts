/**
 * Shared hook for eSLOG validation state.
 *
 * Encapsulates the eSLOG availability check, enabled toggle, and
 * entity error tracking duplicated across invoice and advance invoice forms.
 */

import { useEffect, useState } from "react";

type EslogError = { field: string; message: string };

type Entity = {
  country_code?: string;
  settings?: Record<string, any>;
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
};

export function useEslogValidation(activeEntity: Entity): EslogValidationResult {
  const isSlovenianEntity = activeEntity?.country_code === "SI";
  const entityEslogEnabled = !!(activeEntity?.settings as any)?.eslog_validation_enabled;
  const isAvailable = isSlovenianEntity && entityEslogEnabled;

  const [isEnabled, setEnabled] = useState<boolean | undefined>(undefined);
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
  };
}
