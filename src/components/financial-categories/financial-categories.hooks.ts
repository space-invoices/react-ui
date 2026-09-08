import type {
  CreateFinancialCategoryBody,
  FinancialCategoryResponse,
  RevenueByCategoryResponse,
  UpdateFinancialCategoryBody,
} from "@spaceinvoices/js-sdk";
import { financialCategories } from "@spaceinvoices/js-sdk";
import { useMutation, useQuery } from "@tanstack/react-query";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";
import { REVENUE_BY_CATEGORY_CACHE_KEY } from "@/ui/lib/dashboard-stats-cache";
import { getCalendarDateInTimeZone, getCalendarYearToDateRange, resolveEntityTimeZone } from "@/ui/lib/entity-calendar";

export const FINANCIAL_CATEGORIES_CACHE_KEY = "financial-categories";
export { REVENUE_BY_CATEGORY_CACHE_KEY };

const {
  useCreateResource: useCreateFinancialCategory,
  useUpdateResource: useUpdateFinancialCategory,
  useDeleteResource: useDeleteFinancialCategory,
} = createResourceHooks<FinancialCategoryResponse, CreateFinancialCategoryBody, UpdateFinancialCategoryBody>(
  {
    create: financialCategories.create,
    update: financialCategories.update,
    delete: financialCategories.delete,
  },
  FINANCIAL_CATEGORIES_CACHE_KEY,
);

export { useCreateFinancialCategory, useDeleteFinancialCategory, useUpdateFinancialCategory };

export function useUpdateDocumentItemFinancialCategory(entityId: string | undefined) {
  return useMutation({
    mutationFn: async ({ id, financial_category_id }: { id: string; financial_category_id: string | null }) => {
      if (!entityId) throw new Error("Missing entity");

      return financialCategories.updateDocumentItemFinancialCategory(
        id,
        { financial_category_id },
        { entity_id: entityId },
      );
    },
  });
}

export function useUpdateDocumentItemFinancialCategories(entityId: string | undefined) {
  return useMutation({
    mutationFn: async ({
      assignments,
    }: {
      assignments: Array<{ id: string; financial_category_id: string | null }>;
    }) => {
      if (!entityId) throw new Error("Missing entity");

      return financialCategories.updateDocumentItemFinancialCategories({ assignments }, { entity_id: entityId });
    },
  });
}

export function useFinancialCategories(entityId: string | undefined, includeArchived = false) {
  return useQuery({
    queryKey: [FINANCIAL_CATEGORIES_CACHE_KEY, entityId, includeArchived],
    queryFn: async ({ signal }) => {
      if (!entityId) throw new Error("Missing entity");

      return financialCategories.list({
        entity_id: entityId,
        ...(includeArchived ? { include_archived: true } : {}),
        signal,
      });
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });
}

export type RevenueByCategoryOptions = {
  /**
   * Entity IANA timezone; the report runs from 1 January through the entity's calendar today.
   * Omitted, empty or unusable values fall back to the API's own entity default (`UTC`).
   */
  timeZone?: string | null;
};

export function useRevenueByCategory(entityId: string | undefined, options?: RevenueByCategoryOptions) {
  const timeZone = resolveEntityTimeZone({ timezone: options?.timeZone });
  const { from: dateFrom, to: dateTo } = getCalendarYearToDateRange(getCalendarDateInTimeZone(new Date(), timeZone));

  return useQuery({
    queryKey: [REVENUE_BY_CATEGORY_CACHE_KEY, entityId, dateFrom, dateTo],
    queryFn: async ({ signal }): Promise<RevenueByCategoryResponse> => {
      if (!entityId) throw new Error("Missing entity");
      return financialCategories.getRevenueByFinancialCategory(
        {
          date_from: dateFrom,
          date_to: dateTo,
        },
        { entity_id: entityId, signal },
      );
    },
    enabled: !!entityId,
    staleTime: 120_000,
  });
}
