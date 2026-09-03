import type { Expense } from "@spaceinvoices/js-sdk";
import { Badge } from "@/ui/components/ui/badge";

export type ExpenseStatusLike = Pick<Expense, "is_draft" | "paid_in_full" | "total_paid" | "total_due" | "voided_at">;

export type ExpenseStatus = "draft" | "open" | "partially_paid" | "paid" | "voided";

export function getExpenseStatus(expense: ExpenseStatusLike): ExpenseStatus {
  if (expense.voided_at) return "voided";
  if (expense.is_draft) return "draft";
  if (expense.paid_in_full) return "paid";
  if (expense.total_paid > 0 && expense.total_due > 0) return "partially_paid";
  return "open";
}

/** Status badge for expenses (accounts payable) */
export function ExpenseStatusBadge({ expense, t }: { expense: ExpenseStatusLike; t: (key: string) => string }) {
  const status = getExpenseStatus(expense);
  if (status === "voided") {
    return (
      <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
        {t("Voided")}
      </Badge>
    );
  }
  if (status === "draft") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
      >
        {t("Draft")}
      </Badge>
    );
  }
  if (status === "paid") {
    return (
      <Badge
        variant="outline"
        className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
      >
        {t("Paid")}
      </Badge>
    );
  }
  if (status === "partially_paid") {
    return (
      <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        {t("Partially Paid")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
      {t("Open")}
    </Badge>
  );
}
