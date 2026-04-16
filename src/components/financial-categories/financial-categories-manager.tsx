import { useQueryClient } from "@tanstack/react-query";
import { Filter, MoreHorizontal, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  REVENUE_BY_CATEGORY_CACHE_KEY,
  useCreateFinancialCategory,
  useDeleteFinancialCategory,
  useFinancialCategories,
  useUpdateFinancialCategory,
} from "@/ui/components/financial-categories/financial-categories.hooks";
import {
  SettingsResourceListCard,
  SettingsResourceListEmptyState,
  SettingsResourceListItem,
  SettingsResourceListItemActions,
  SettingsResourceListItemBadges,
  SettingsResourceListItemBody,
  SettingsResourceListItemDescription,
  SettingsResourceListItemTitleRow,
} from "@/ui/components/settings-resource-list";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/components/ui/alert-dialog";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Input } from "@/ui/components/ui/input";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

const DEFAULT_CATEGORY_COLOR = "#2563eb";
const CATEGORY_COLOR_PALETTE = [
  "#F4A7A1",
  "#F7B58D",
  "#F3C97A",
  "#E6D37A",
  "#C8D98B",
  "#A8D8A8",
  "#8FD3B6",
  "#85D6C8",
  "#8FD8DD",
  "#93C9E8",
  "#9EB8F2",
  "#B4A7F5",
  "#C7A6F7",
  "#D8A6F0",
  "#E6A8D7",
  "#F0A9C2",
  "#F5B5D1",
  "#D9B8A7",
  "#CDB8A3",
  "#B8C0CC",
] as const;

type FinancialCategoriesManagerProps = {
  entityId: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string, error?: Error) => void;
} & ComponentTranslationProps;

type ManagedCategory = {
  id: string;
  name: string;
  color?: string | null;
  archived_at?: string | null;
};

type CategoryFilterMode = "active" | "archived" | "all";

const translations = {
  en: {
    "financial-categories.filters.filter": "Filter",
    "financial-categories.filters.active-only": "Active only",
    "financial-categories.filters.all": "All",
    "financial-categories.list.empty-active": "No active categories to show.",
    "financial-categories.list.empty-archived": "No archived categories to show.",
    "financial-categories.list.empty-all": "No categories to show.",
  },
} as const;

function CategoryColorSwatch({ color }: { color: string | null | undefined }) {
  return (
    <div
      className="h-3 w-3 rounded-full border border-border/80"
      style={{ backgroundColor: color || DEFAULT_CATEGORY_COLOR }}
    />
  );
}

function getRandomCategoryColor() {
  return CATEGORY_COLOR_PALETTE[Math.floor(Math.random() * CATEGORY_COLOR_PALETTE.length)] ?? DEFAULT_CATEGORY_COLOR;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const dataMessage = (error as { data?: { message?: unknown } }).data?.message;
    if (typeof dataMessage === "string" && dataMessage.length > 0) {
      return dataMessage;
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "";
}

function isDuplicateNameError(error: unknown) {
  return /already exists/i.test(getErrorMessage(error));
}

function normalizeCategoryName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function FinancialCategoryEmptyState({ t, onCreate }: { t: (key: string) => string; onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Tags className="h-6 w-6" />
        </div>
        <CardTitle>{t("financial-categories.list.empty")}</CardTitle>
        <CardDescription>{t("financial-categories.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("financial-categories.form.create")}
        </Button>
      </CardContent>
    </Card>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  title,
  description,
  nameLabel,
  colorLabel,
  name,
  color,
  nameError,
  onNameChange,
  onColorChange,
  onSubmit,
  isPending,
  submitLabel,
  cancelLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  nameLabel: string;
  colorLabel: string;
  name: string;
  color: string;
  nameError: string | null;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  isPending?: boolean;
  submitLabel: string;
  cancelLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="space-y-2">
              <label htmlFor="financial-category-dialog-name" className="block font-medium text-sm">
                {nameLabel}
              </label>
              <Input
                id="financial-category-dialog-name"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                maxLength={200}
                autoFocus
              />
              {nameError ? <p className="text-destructive text-sm">{nameError}</p> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="financial-category-dialog-color" className="block font-medium text-sm">
                {colorLabel}
              </label>
              <Input
                id="financial-category-dialog-color"
                type="color"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                className="block h-9 w-16 cursor-pointer p-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button type="button" disabled={isPending} onClick={() => void onSubmit()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FinancialCategoriesManager({
  entityId,
  onSuccess,
  onError,
  ...i18nProps
}: FinancialCategoriesManagerProps) {
  const queryClient = useQueryClient();
  const t = createTranslation({
    ...i18nProps,
    translations,
  });
  const [filterMode, setFilterMode] = useState<CategoryFilterMode>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(() => getRandomCategoryColor());
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<ManagedCategory | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const [editingError, setEditingError] = useState<string | null>(null);
  const [archiveTargetCategory, setArchiveTargetCategory] = useState<ManagedCategory | null>(null);

  const includeArchived = filterMode !== "active";
  const { data, isLoading } = useFinancialCategories(entityId, includeArchived);
  const categories = (data?.data ?? []) as ManagedCategory[];

  const activeCategories = useMemo(() => categories.filter((category) => !category.archived_at), [categories]);
  const visibleCategories = useMemo(
    () =>
      categories.filter((category) => {
        const isArchived = !!category.archived_at;
        if (filterMode === "active") return !isArchived;
        if (filterMode === "archived") return isArchived;
        return true;
      }),
    [categories, filterMode],
  );

  const hasDuplicateActiveCategoryName = (name: string, excludeId?: string | null) => {
    const normalizedName = normalizeCategoryName(name);
    if (!normalizedName) {
      return false;
    }

    return activeCategories.some(
      (category) => category.id !== excludeId && normalizeCategoryName(category.name) === normalizedName,
    );
  };

  const activeCountLabel =
    activeCategories.length === 1
      ? t("financial-categories.list.active-count-one")
      : t("financial-categories.list.active-count-other").replace("{{count}}", String(activeCategories.length));

  const createCategory = useCreateFinancialCategory({
    entityId,
    onError: (error) => {
      if (isDuplicateNameError(error)) {
        setCreateError(t("financial-categories.form.duplicate-name"));
        return;
      }

      const nextError = error instanceof Error ? error : new Error(getErrorMessage(error) || "Unknown error");
      onError?.(t("financial-categories.form.create-error"), nextError);
    },
  });

  const updateCategory = useUpdateFinancialCategory({
    entityId,
    onError: (error) => {
      if (isDuplicateNameError(error)) {
        setEditingError(t("financial-categories.form.duplicate-name"));
        return;
      }

      const nextError = error instanceof Error ? error : new Error(getErrorMessage(error) || "Unknown error");
      onError?.(t("financial-categories.form.update-error"), nextError);
    },
  });

  const archiveCategory = useDeleteFinancialCategory({
    entityId,
    onError: (error) => {
      const nextError = error instanceof Error ? error : new Error(getErrorMessage(error) || "Unknown error");
      onError?.(t("financial-categories.form.archive-error"), nextError);
    },
  });

  useEffect(() => {
    if (createOpen) {
      setCreateError(null);
    }
  }, [createOpen]);

  useEffect(() => {
    if (editingCategory) {
      setEditingName(editingCategory.name);
      setEditingColor(editingCategory.color || DEFAULT_CATEGORY_COLOR);
      setEditingError(null);
    }
  }, [editingCategory]);

  const handleCreate = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setCreateError(t("financial-categories.form.empty-name"));
      return;
    }

    if (hasDuplicateActiveCategoryName(trimmedName)) {
      setCreateError(t("financial-categories.form.duplicate-name"));
      return;
    }

    setCreateError(null);

    try {
      await createCategory.mutateAsync({
        name: trimmedName,
        color: newColor,
      });
      queryClient.invalidateQueries({ queryKey: [REVENUE_BY_CATEGORY_CACHE_KEY], exact: false });
      setNewName("");
      setNewColor(getRandomCategoryColor());
      setCreateOpen(false);
      onSuccess?.(t("financial-categories.form.create-success"));
    } catch {
      // handled in hook callbacks
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory) {
      return;
    }

    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setEditingError(t("financial-categories.form.empty-name"));
      return;
    }

    if (hasDuplicateActiveCategoryName(trimmedName, editingCategory.id)) {
      setEditingError(t("financial-categories.form.duplicate-name"));
      return;
    }

    setEditingError(null);

    try {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        data: {
          name: trimmedName,
          color: editingColor,
        },
      });
      queryClient.invalidateQueries({ queryKey: [REVENUE_BY_CATEGORY_CACHE_KEY], exact: false });
      setEditingCategory(null);
      onSuccess?.(t("financial-categories.form.update-success"));
    } catch {
      // handled in hook callbacks
    }
  };

  const handleArchiveConfirmed = async () => {
    if (!archiveTargetCategory) {
      return;
    }

    try {
      await archiveCategory.mutateAsync({ id: archiveTargetCategory.id });
      queryClient.invalidateQueries({ queryKey: [REVENUE_BY_CATEGORY_CACHE_KEY], exact: false });
      if (editingCategory?.id === archiveTargetCategory.id) {
        setEditingCategory(null);
      }
      setArchiveTargetCategory(null);
      onSuccess?.(t("financial-categories.form.archive-success"));
    } catch {
      // handled in hook callbacks
    }
  };

  const emptyMessage =
    filterMode === "archived"
      ? t("financial-categories.list.empty-archived")
      : filterMode === "active"
        ? t("financial-categories.list.empty-active")
        : t("financial-categories.list.empty-all");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-lg">{t("settings-nav.income-categories")}</h2>
          <p className="text-muted-foreground text-sm">{t("financial-categories.description")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setCreateOpen(true);
              setNewName("");
              setNewColor(getRandomCategoryColor());
              setCreateError(null);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("financial-categories.form.create")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground text-sm">{t("financial-categories.loading")}</CardContent>
        </Card>
      ) : activeCategories.length === 0 && filterMode === "active" ? (
        <FinancialCategoryEmptyState
          t={t}
          onCreate={() => {
            setCreateOpen(true);
            setCreateError(null);
          }}
        />
      ) : (
        <SettingsResourceListCard
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base">{t("settings-nav.income-categories")}</div>
                <div className="mt-1 text-muted-foreground text-sm">{t("financial-categories.note")}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Filter className="mr-2 h-4 w-4" />
                    {t("financial-categories.filters.filter")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={filterMode}
                    onValueChange={(value) => setFilterMode(value as CategoryFilterMode)}
                  >
                    <DropdownMenuRadioItem value="active">
                      {t("financial-categories.filters.active-only")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="archived">
                      {t("financial-categories.list.archived")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="all">{t("financial-categories.filters.all")}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        >
          {visibleCategories.length === 0 ? (
            <SettingsResourceListEmptyState>{emptyMessage}</SettingsResourceListEmptyState>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">{activeCountLabel}</p>
              {visibleCategories.map((category) => (
                <SettingsResourceListItem key={category.id}>
                  <SettingsResourceListItemBody className="flex items-start gap-3 space-y-0">
                    <div className="mt-1">
                      <CategoryColorSwatch color={category.color} />
                    </div>
                    <div className="space-y-1">
                      <SettingsResourceListItemTitleRow className="flex-wrap">
                        <span className="font-medium">{category.name}</span>
                        {category.archived_at ? (
                          <Badge variant="secondary">{t("financial-categories.list.archived")}</Badge>
                        ) : null}
                      </SettingsResourceListItemTitleRow>
                      <SettingsResourceListItemDescription>
                        {category.archived_at
                          ? t("financial-categories.list.archived")
                          : t("financial-categories.list.active")}
                      </SettingsResourceListItemDescription>
                      <SettingsResourceListItemBadges>
                        <Badge variant="outline">
                          {t("financial-categories.form.color")}: {category.color || DEFAULT_CATEGORY_COLOR}
                        </Badge>
                      </SettingsResourceListItemBadges>
                    </div>
                  </SettingsResourceListItemBody>

                  <SettingsResourceListItemActions>
                    <Button type="button" variant="outline" onClick={() => setEditingCategory(category)}>
                      {t("financial-categories.actions.edit")}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" aria-label={t("Actions")}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("financial-categories.actions.edit")}
                        </DropdownMenuItem>
                        {!category.archived_at ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setArchiveTargetCategory(category)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("financial-categories.actions.archive")}
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SettingsResourceListItemActions>
                </SettingsResourceListItem>
              ))}
            </>
          )}
        </SettingsResourceListCard>
      )}

      <CategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t("financial-categories.form.create")}
        description={t("financial-categories.note")}
        nameLabel={t("financial-categories.form.name")}
        colorLabel={t("financial-categories.form.color")}
        name={newName}
        color={newColor}
        nameError={createError}
        onNameChange={setNewName}
        onColorChange={setNewColor}
        onSubmit={handleCreate}
        isPending={createCategory.isPending}
        submitLabel={t("financial-categories.form.create")}
        cancelLabel={t("financial-categories.form.cancel")}
      />

      <CategoryDialog
        open={!!editingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCategory(null);
            setEditingError(null);
          }
        }}
        title={t("financial-categories.actions.edit")}
        description={t("financial-categories.note")}
        nameLabel={t("financial-categories.form.name")}
        colorLabel={t("financial-categories.form.color")}
        name={editingName}
        color={editingColor}
        nameError={editingError}
        onNameChange={setEditingName}
        onColorChange={setEditingColor}
        onSubmit={handleUpdate}
        isPending={updateCategory.isPending}
        submitLabel={t("financial-categories.form.save")}
        cancelLabel={t("financial-categories.form.cancel")}
      />

      <AlertDialog open={!!archiveTargetCategory} onOpenChange={(open) => !open && setArchiveTargetCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("financial-categories.confirm.archive")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveTargetCategory(null)}>
              {t("financial-categories.form.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={archiveCategory.isPending}
              onClick={() => void handleArchiveConfirmed()}
            >
              {t("financial-categories.actions.archive")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
