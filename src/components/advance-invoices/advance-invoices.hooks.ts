import type {
  AdvanceInvoice,
  CreateAdvanceInvoiceRequest,
  CustomCreateAdvanceInvoice,
  SDKMethodOptions,
  UpdateAdvanceInvoice,
} from "@spaceinvoices/js-sdk";
import { advanceInvoices } from "@spaceinvoices/js-sdk";
import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

export const ADVANCE_INVOICES_CACHE_KEY = "advance-invoices";

const voidAdvanceInvoice = async (id: string, options?: SDKMethodOptions): Promise<void> => {
  await advanceInvoices.void(id, {}, options);
};

const {
  useCreateResource: useCreateAdvanceInvoice,
  useUpdateResource: useUpdateAdvanceInvoice,
  useDeleteResource: useDeleteAdvanceInvoice,
} = createResourceHooks<AdvanceInvoice, CreateAdvanceInvoiceRequest, UpdateAdvanceInvoice>(
  {
    create: advanceInvoices.create,
    update: advanceInvoices.update,
    delete: voidAdvanceInvoice,
  },
  ADVANCE_INVOICES_CACHE_KEY,
);

const { useCreateResource: useCreateCustomAdvanceInvoice } = createResourceHooks<
  AdvanceInvoice,
  CustomCreateAdvanceInvoice,
  UpdateAdvanceInvoice
>(
  {
    create: advanceInvoices.createCustom,
    update: advanceInvoices.update,
    delete: voidAdvanceInvoice,
  },
  ADVANCE_INVOICES_CACHE_KEY,
);

export { useCreateAdvanceInvoice, useCreateCustomAdvanceInvoice, useDeleteAdvanceInvoice, useUpdateAdvanceInvoice };

const FURS_ADV_LAST_USED_KEY = "si:furs:adv:last-used";

export type FursCombo = {
  business_premise_name: string;
  electronic_device_name: string;
};

export function getLastUsedFursCombo(entityId: string): FursCombo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${FURS_ADV_LAST_USED_KEY}:${entityId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setLastUsedFursCombo(entityId: string, combo: FursCombo): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${FURS_ADV_LAST_USED_KEY}:${entityId}`, JSON.stringify(combo));
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}

const FINA_ADV_LAST_USED_KEY = "hr:fina:adv:last-used";

export type FinaCombo = {
  business_premise_name: string;
  electronic_device_name: string;
};

export function getLastUsedFinaCombo(entityId: string): FinaCombo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${FINA_ADV_LAST_USED_KEY}:${entityId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setLastUsedFinaCombo(entityId: string, combo: FinaCombo): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${FINA_ADV_LAST_USED_KEY}:${entityId}`, JSON.stringify(combo));
  } catch {
    // Ignore localStorage errors
  }
}
