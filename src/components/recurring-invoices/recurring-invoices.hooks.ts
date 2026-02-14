import type { CreateRecurringInvoiceBody, RecurringInvoice } from "@spaceinvoices/js-sdk";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

export const RECURRING_INVOICES_CACHE_KEY = "recurring-invoices";

const {
  useCreateResource: useCreateRecurringInvoice,
  useUpdateResource: useUpdateRecurringInvoice,
  useDeleteResource: useDeleteRecurringInvoice,
  useRestoreResource: useRestoreRecurringInvoice,
  usePermanentDeleteResource: usePermanentDeleteRecurringInvoice,
} = createResourceHooks<RecurringInvoice, CreateRecurringInvoiceBody>(
  "recurringInvoices",
  RECURRING_INVOICES_CACHE_KEY,
  {
    restoreMethodName: "restoreRecurringInvoice",
    permanentDeleteMethodName: "permanentDeleteRecurringInvoice",
  },
);

export {
  useCreateRecurringInvoice,
  useUpdateRecurringInvoice,
  useDeleteRecurringInvoice,
  useRestoreRecurringInvoice,
  usePermanentDeleteRecurringInvoice,
};
