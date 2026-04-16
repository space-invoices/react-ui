import type { AdvanceInvoice, CreditNote, DeliveryNote, Estimate, Invoice } from "@spaceinvoices/js-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  REVENUE_BY_CATEGORY_CACHE_KEY,
  useFinancialCategories,
  useUpdateDocumentItemFinancialCategories,
  useUpdateDocumentItemFinancialCategory,
} from "@/ui/components/financial-categories";
import { Button } from "@/ui/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { useWLSubscriptionOptional } from "@/ui/providers/wl-subscription-provider";

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

type DocumentCategoryItem = {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  financial_category_id?: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
  archived_at?: string | null;
};

type DocumentItemCategoriesCardProps = {
  document: Document;
  documentType: DocumentType;
  entityId: string;
} & ComponentTranslationProps;

const NO_CATEGORY_VALUE = "__none__";
const MIXED_VALUE = "__mixed__";

export function DocumentItemCategoriesCard({ document, documentType, entityId, t }: DocumentItemCategoriesCardProps) {
  const queryClient = useQueryClient();
  const subscription = useWLSubscriptionOptional();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const { data: categoriesResponse, isLoading: isCategoriesLoading } = useFinancialCategories(entityId, true);
  const updateDocumentItemCategory = useUpdateDocumentItemFinancialCategory(entityId);
  const updateDocumentItemCategories = useUpdateDocumentItemFinancialCategories(entityId);

  const translate = (key: string, fallback: string) => t?.(key) ?? fallback;

  const items = useMemo(
    () =>
      ((document as unknown as { items?: DocumentCategoryItem[] }).items ?? []).filter(
        (item) => item.type !== "separator",
      ) as DocumentCategoryItem[],
    [document],
  );

  const categories = (categoriesResponse?.data ?? []) as CategoryOption[];
  const hasFinancialCategoriesFeature = !subscription || subscription.hasFeature("financial_categories");
  const activeCategories = categories.filter((category) => !category.archived_at);
  const assignedCategoryIds = [...new Set(items.map((item) => item.financial_category_id).filter(Boolean))] as string[];

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const visibleCategories = useMemo(() => {
    const merged = new Map<string, CategoryOption>();

    for (const category of activeCategories) {
      merged.set(category.id, category);
    }

    for (const categoryId of assignedCategoryIds) {
      const category = categoryMap.get(categoryId);
      if (category) {
        merged.set(category.id, category);
      }
    }

    return [...merged.values()];
  }, [activeCategories, assignedCategoryIds, categoryMap]);

  const normalizedItemValues = items.map((item) => item.financial_category_id ?? NO_CATEGORY_VALUE);
  const uniqueDocumentValues = [...new Set(normalizedItemValues)];
  const isMixed = uniqueDocumentValues.length > 1;
  const documentCategoryValue = isMixed ? MIXED_VALUE : (uniqueDocumentValues[0] ?? NO_CATEGORY_VALUE);
  const hasAnyCategoryConfigured = categories.length > 0;
  const isBulkUpdating = updatingKey === "document";

  useEffect(() => {
    if (isMixed) {
      setAdvancedOpen(true);
    }
  }, [isMixed]);

  if (!hasFinancialCategoriesFeature || items.length === 0 || !hasAnyCategoryConfigured) {
    return null;
  }

  const invalidateCategoryViews = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["documents", documentType, document.id, entityId],
      }),
      queryClient.invalidateQueries({
        queryKey: [REVENUE_BY_CATEGORY_CACHE_KEY],
        exact: false,
      }),
    ]);
  };

  const applyAssignments = async (
    assignments: Array<{ id: string; financial_category_id: string | null }>,
    successMessage: string,
    key: string,
  ) => {
    if (assignments.length === 0) {
      return;
    }

    setUpdatingKey(key);

    try {
      if (assignments.length === 1) {
        await updateDocumentItemCategory.mutateAsync(assignments[0]!);
      } else {
        await updateDocumentItemCategories.mutateAsync({ assignments });
      }
      await invalidateCategoryViews();

      toast.success(translate("common.toast.success.title", "Updated"), {
        description: successMessage,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : translate("financial-categories.document-card.update-error", "Unable to update category.");
      toast.error(translate("common.toast.error.title", "Error"), {
        description: message,
      });
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleDocumentCategoryChange = async (value: string | null) => {
    if (!value || value === MIXED_VALUE) {
      return;
    }

    const nextCategoryId = value === NO_CATEGORY_VALUE ? null : value;
    const assignments = items
      .filter((item) => (item.financial_category_id ?? null) !== nextCategoryId)
      .map((item) => ({
        id: item.id,
        financial_category_id: nextCategoryId,
      }));

    await applyAssignments(
      assignments,
      translate("financial-categories.document-card.bulk-updated", "Document categories updated."),
      "document",
    );
  };

  const handleItemCategoryChange = async (itemId: string, value: string | null) => {
    if (!value) {
      return;
    }

    const nextCategoryId = value === NO_CATEGORY_VALUE ? null : value;
    const item = items.find((candidate) => candidate.id === itemId);

    if (!item || (item.financial_category_id ?? null) === nextCategoryId) {
      return;
    }

    await applyAssignments(
      [{ id: itemId, financial_category_id: nextCategoryId }],
      translate("financial-categories.document-card.line-updated", "Document line category updated."),
      itemId,
    );
  };

  const renderCategoryItems = () => (
    <>
      <SelectItem value={NO_CATEGORY_VALUE}>
        {translate("financial-categories.document-card.no-category", "No category")}
      </SelectItem>
      {visibleCategories.map((category) => (
        <SelectItem key={category.id} value={category.id} disabled={!!category.archived_at}>
          {category.archived_at
            ? `${category.name} (${translate("financial-categories.document-card.archived", "Archived")})`
            : category.name}
        </SelectItem>
      ))}
    </>
  );

  const getCategoryLabel = (value: string | null | undefined) => {
    if (!value || value === NO_CATEGORY_VALUE) {
      return translate("financial-categories.document-card.no-category", "No category");
    }

    if (value === MIXED_VALUE) {
      return translate("financial-categories.document-card.mixed", "Mixed");
    }

    const category = visibleCategories.find((candidate) => candidate.id === value) ?? categoryMap.get(value);

    if (!category) {
      return undefined;
    }

    return category.archived_at
      ? `${category.name} (${translate("financial-categories.document-card.archived", "Archived")})`
      : category.name;
  };

  return (
    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_max-content] sm:items-center">
        <h3 className="font-medium text-sm">{translate("financial-categories.document-card.title", "Categories")}</h3>

        <div className="w-full sm:w-auto sm:justify-self-end">
          <Select
            value={documentCategoryValue}
            onValueChange={handleDocumentCategoryChange}
            disabled={isCategoriesLoading || isBulkUpdating}
          >
            <SelectTrigger className="w-full sm:w-fit sm:min-w-40">
              <SelectValue
                placeholder={translate("financial-categories.document-card.select-placeholder", "Select category")}
              >
                {getCategoryLabel(documentCategoryValue)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {isMixed && (
                <SelectItem value={MIXED_VALUE} disabled>
                  {translate("financial-categories.document-card.mixed", "Mixed")}
                </SelectItem>
              )}
              {renderCategoryItems()}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-h-4 text-muted-foreground text-xs">
          {isMixed
            ? translate(
                "financial-categories.document-card.mixed-description",
                "This document uses multiple line categories.",
              )
            : null}
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto px-0 text-muted-foreground hover:text-foreground">
            <span>{translate("financial-categories.document-card.advanced", "Advanced line categories")}</span>
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>

      {isBulkUpdating && (
        <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {translate("financial-categories.document-card.saving", "Saving...")}
        </div>
      )}

      <CollapsibleContent className="space-y-3">
        {items.map((item) => {
          const isUpdating = updatingKey === item.id && updateDocumentItemCategory.isPending;

          return (
            <div key={item.id} className="space-y-2 rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_max-content] sm:items-start">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.description && <p className="text-muted-foreground text-xs">{item.description}</p>}
                </div>

                <div className="w-full sm:w-auto sm:justify-self-end">
                  <Select
                    value={item.financial_category_id ?? NO_CATEGORY_VALUE}
                    onValueChange={(value) => handleItemCategoryChange(item.id, value)}
                    disabled={isCategoriesLoading || isUpdating}
                  >
                    <SelectTrigger className="w-full sm:w-fit sm:min-w-40">
                      <SelectValue
                        placeholder={translate(
                          "financial-categories.document-card.select-placeholder",
                          "Select category",
                        )}
                      >
                        {getCategoryLabel(item.financial_category_id ?? NO_CATEGORY_VALUE)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>{renderCategoryItems()}</SelectContent>
                  </Select>
                </div>
              </div>

              {isUpdating && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {translate("financial-categories.document-card.saving", "Saving...")}
                </div>
              )}
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
