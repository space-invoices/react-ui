import type {
  CreateFinancialCategoryBody,
  FinancialCategoryResponse,
  RevenueByCategoryResponse,
  UpdateFinancialCategoryBody,
} from "@spaceinvoices/js-sdk";
import { financialCategories } from "@spaceinvoices/js-sdk";
import { useMutation, useQuery } from "@tanstack/react-query";

import { createResourceHooks } from "@/ui/hooks/create-resource-hooks";

export const FINANCIAL_CATEGORIES_CACHE_KEY = "financial-categories";
export const REVENUE_BY_CATEGORY_CACHE_KEY = "revenue-by-category";

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
    queryFn: async () => {
      if (!entityId) throw new Error("Missing entity");

      return financialCategories.list({
        entity_id: entityId,
        ...(includeArchived ? { include_archived: true } : {}),
      });
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useRevenueByCategory(entityId: string | undefined) {
  const now = new Date();
  const dateFrom = `${now.getFullYear()}-01-01`;
  const dateTo = formatDate(now);

  return useQuery({
    queryKey: [REVENUE_BY_CATEGORY_CACHE_KEY, entityId, dateFrom, dateTo],
    queryFn: async (): Promise<RevenueByCategoryResponse> => {
      if (!entityId) throw new Error("Missing entity");
      return financialCategories.getRevenueByFinancialCategory(
        {
          date_from: dateFrom,
          date_to: dateTo,
        },
        { entity_id: entityId },
      );
    },
    enabled: !!entityId,
    staleTime: 120_000,
  });
}
