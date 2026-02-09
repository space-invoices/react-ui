import type { CreatePaymentRequest, Payment } from "@spaceinvoices/js-sdk";

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
} = createResourceHooks<Payment, CreatePaymentRequest>("payments", PAYMENTS_CACHE_KEY, {
  restoreMethodName: "restorePayment",
  permanentDeleteMethodName: "permanentDeletePayment",
});

export { useCreatePayment, useUpdatePayment, useDeletePayment, useRestorePayment, usePermanentDeletePayment };
