import type { CreatePaymentRequest, Payment, UpdatePaymentBody } from "@spaceinvoices/js-sdk";
import { payments } from "@spaceinvoices/js-sdk";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

// Define a constant for the payments cache key
export const PAYMENTS_CACHE_KEY = "payments";

// Create payment-specific hooks using the factory
const {
  useCreateResource: useCreatePayment,
  useUpdateResource: useUpdatePayment,
  useDeleteResource: useDeletePayment,
  useRestoreResource: useRestorePayment,
  usePermanentDeleteResource: usePermanentDeletePayment,
} = createResourceHooks<Payment, CreatePaymentRequest, UpdatePaymentBody>(
  {
    create: payments.create,
    update: payments.update,
    delete: payments.delete,
    restore: payments.restorePayment,
    permanentDelete: payments.permanentDeletePayment,
  },
  PAYMENTS_CACHE_KEY,
);

export { useCreatePayment, useDeletePayment, usePermanentDeletePayment, useRestorePayment, useUpdatePayment };
