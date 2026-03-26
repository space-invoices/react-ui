import type {
  CreateDeliveryNoteRequest,
  DeliveryNote,
  SDKMethodOptions,
  UpdateDeliveryNote,
} from "@spaceinvoices/js-sdk";
import { deliveryNotes } from "@spaceinvoices/js-sdk";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

// Define a constant for the delivery notes cache key
export const DELIVERY_NOTES_CACHE_KEY = "delivery-notes";

const voidDeliveryNote = async (id: string, options?: SDKMethodOptions): Promise<void> => {
  await deliveryNotes.void(id, {}, options);
};

// Create delivery-note-specific hooks using the factory
const {
  useCreateResource: useCreateDeliveryNote,
  useUpdateResource: useUpdateDeliveryNote,
  useDeleteResource: useDeleteDeliveryNote,
} = createResourceHooks<DeliveryNote, CreateDeliveryNoteRequest, UpdateDeliveryNote>(
  {
    create: deliveryNotes.create,
    update: deliveryNotes.update,
    delete: voidDeliveryNote,
  },
  DELIVERY_NOTES_CACHE_KEY,
);

export { useCreateDeliveryNote, useDeleteDeliveryNote, useUpdateDeliveryNote };
