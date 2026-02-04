import type { CreateEstimateRequest, Estimate } from "@spaceinvoices/js-sdk";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

// Define a constant for the estimates cache key
export const ESTIMATES_CACHE_KEY = "estimates";

// Create estimate-specific hooks using the factory
const {
  useCreateResource: useCreateEstimate,
  useUpdateResource: useUpdateEstimate,
  useDeleteResource: useDeleteEstimate,
} = createResourceHooks<Estimate, CreateEstimateRequest>("estimates", ESTIMATES_CACHE_KEY);

export { useCreateEstimate, useUpdateEstimate, useDeleteEstimate };
