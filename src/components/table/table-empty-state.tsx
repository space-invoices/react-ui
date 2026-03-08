import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CreditCard,
  FileCheck,
  FileMinus,
  FileOutput,
  FilePlus,
  FileText,
  Landmark,
  Link2,
  Package,
  RefreshCw,
  ShoppingCart,
  Sprout,
  Users,
} from "lucide-react";

import { Button } from "@/ui/components/ui/button";

// Generic subtitle key — each list component's locale files override this
// with a resource-specific translation (e.g. "Get started by creating your first invoice")
const GENERIC_SUBTITLE = "Get started by creating your first entry";

const RESOURCE_ICONS: Record<string, LucideIcon> = {
  invoice: FileText,
  estimate: FileCheck,
  credit_note: FileMinus,
  advance_invoice: FilePlus,
  "delivery note": FileOutput,
  delivery_note: FileOutput,
  customer: Users,
  item: Package,
  tax: Landmark,
  payment: CreditCard,
  "recurring-invoice": RefreshCw,
  order: ShoppingCart,
  "order-integration": Link2,
  entity: Building2,
};

type TableEmptyStateProps = {
  resource: string;
  createNewLink?: string;
  createNewTrigger?: React.ReactNode;
  /** Callback for "Create new" click — enables client-side navigation instead of full page reload */
  onCreateNew?: () => void;
  /** Number of rows to calculate height (default: 10) */
  rows?: number;
  /** Translation function */
  t?: (key: string) => string;
};

// Approximate row height in pixels (including padding/border)
const ROW_HEIGHT = 53;

/**
 * Empty state shown when table has no data
 */
export function TableEmptyState({
  resource,
  createNewLink,
  createNewTrigger,
  onCreateNew,
  rows = 10,
  t = (key) => key,
}: TableEmptyStateProps) {
  // Calculate height based on row count (min 200px)
  const height = Math.max(rows * ROW_HEIGHT, 200);

  const Icon = RESOURCE_ICONS[resource] ?? Sprout;

  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ height }}>
      <Icon size={70} strokeWidth={0.35} className="text-muted-foreground" />
      <div className="space-y-1 text-center">
        <p className="font-light text-lg text-muted-foreground">{t("Your list is empty")}</p>
        {(createNewLink || createNewTrigger || onCreateNew) && (
          <p className="text-muted-foreground text-sm">{t(GENERIC_SUBTITLE)}</p>
        )}
      </div>
      {createNewLink && (
        <Button variant="default" size="sm" {...(onCreateNew ? { onClick: onCreateNew } : { asChild: true })}>
          {onCreateNew ? t("Create new") : <a href={createNewLink}>{t("Create new")}</a>}
        </Button>
      )}
      {createNewTrigger && !createNewLink && <div>{createNewTrigger}</div>}
    </div>
  );
}
