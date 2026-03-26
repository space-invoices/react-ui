import type { CreateEstimateRequest, Estimate, UpdateEstimate } from "@spaceinvoices/js-sdk";
import { estimates } from "@spaceinvoices/js-sdk";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

// Define a constant for the estimates cache key
export const ESTIMATES_CACHE_KEY = "estimates";

const deleteEstimate = async (): Promise<void> => {
  throw new Error("Deleting estimates is not supported by the modular SDK.");
};

// Create estimate-specific hooks using the factory
const {
  useCreateResource: useCreateEstimate,
  useUpdateResource: useUpdateEstimate,
  useDeleteResource: useDeleteEstimate,
} = createResourceHooks<Estimate, CreateEstimateRequest, UpdateEstimate>(
  {
    create: estimates.create,
    update: estimates.update,
    delete: deleteEstimate,
  },
  ESTIMATES_CACHE_KEY,
);

export { useCreateEstimate, useDeleteEstimate, useUpdateEstimate };
