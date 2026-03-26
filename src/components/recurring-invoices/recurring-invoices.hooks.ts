import type { CreateRecurringInvoiceBody, RecurringInvoice, UpdateRecurringInvoiceBody } from "@spaceinvoices/js-sdk";
import { recurringInvoices } from "@spaceinvoices/js-sdk";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

export const RECURRING_INVOICES_CACHE_KEY = "recurring-invoices";

const {
  useCreateResource: useCreateRecurringInvoice,
  useUpdateResource: useUpdateRecurringInvoice,
  useDeleteResource: useDeleteRecurringInvoice,
  useRestoreResource: useRestoreRecurringInvoice,
  usePermanentDeleteResource: usePermanentDeleteRecurringInvoice,
} = createResourceHooks<RecurringInvoice, CreateRecurringInvoiceBody, UpdateRecurringInvoiceBody>(
  {
    create: recurringInvoices.create,
    update: recurringInvoices.update,
    delete: recurringInvoices.delete,
    restore: recurringInvoices.restoreRecurringInvoice,
    permanentDelete: recurringInvoices.permanentDeleteRecurringInvoice,
  },
  RECURRING_INVOICES_CACHE_KEY,
);

export {
  useCreateRecurringInvoice,
  useDeleteRecurringInvoice,
  usePermanentDeleteRecurringInvoice,
  useRestoreRecurringInvoice,
  useUpdateRecurringInvoice,
};
