import type { CreateDeliveryNoteRequest, DeliveryNote } from "@spaceinvoices/js-sdk";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

// Define a constant for the delivery notes cache key
export const DELIVERY_NOTES_CACHE_KEY = "delivery-notes";

// Create delivery-note-specific hooks using the factory
const {
  useCreateResource: useCreateDeliveryNote,
  useUpdateResource: useUpdateDeliveryNote,
  useDeleteResource: useDeleteDeliveryNote,
} = createResourceHooks<DeliveryNote, CreateDeliveryNoteRequest>("deliveryNotes", DELIVERY_NOTES_CACHE_KEY);

export { useCreateDeliveryNote, useUpdateDeliveryNote, useDeleteDeliveryNote };
