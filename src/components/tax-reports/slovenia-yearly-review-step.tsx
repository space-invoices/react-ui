import { AlertCircle, TriangleAlert } from "lucide-react";
import type { ChangeEvent } from "react";
import { getDisplayDocumentNumber } from "@/ui/lib/document-display";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SloveniaYearlySummary } from "./slovenia-yearly-summary";

type Warning = {
  code: string;
  message: string;
  severity: "info" | "warning";
};

type IssueDetail = {
  code: string;
  title: string;
  summary: string;
  explanation: string;
  action: string | null;
  severity: "info" | "warning";
  official_sources: Array<{
    label: string;
    url: string;
    issuer: "FURS" | "PISRS";
  }>;
  affected_documents: Array<{
    id: string;
    type: "invoice" | "credit_note";
    number: string;
    date: string;
    customer_name: string | null;
    customer_country_code: string | null;
    customer_tax_number: string | null;
    currency_code: string;
    total: number;
    total_converted: number | null;
    reason: string;
    document_path: string;
  }>;
};

type Draft = {
  auto_values: {
    total_invoice_revenue: number;
    total_credit_note_reduction: number;
    adjusted_revenue: number;
    normative_expenses: number;
    tax_base: number;
    income_tax_amount: number;
    advance_tax_amount: number;
    monthly_installment_amount: number;
    quarterly_installment_amount: number;
  };
  warnings: Warning[];
  issue_details: IssueDetail[];
  rule_summary: {
    normative_expense_rule: string;
    income_tax_rule: string;
    advance_rule: string;
  };
};

type ManualValues = {
  withholding_tax_amount: number;
  foreign_tax_credit_amount: number;
  prior_advance_income_tax_amount: number;
  revenue_adjustment_decrease: number;
  revenue_adjustment_increase: number;
};

type SloveniaYearlyReviewStepProps = {
  draft: Draft;
  manualValues: ManualValues;
  t: (key: string) => string;
  onManualValueChange: (field: keyof ManualValues, value: number) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("sl-SI", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function SloveniaYearlyReviewStep({
  draft,
  manualValues,
  t,
  onManualValueChange,
}: SloveniaYearlyReviewStepProps) {
  return (
    <div className="space-y-4">
      <SloveniaYearlySummary
        items={[
          {
            label: t("slovenia-yearly.review.summary.adjusted-revenue"),
            value: formatCurrency(draft.auto_values.adjusted_revenue),
          },
          {
            label: t("slovenia-yearly.review.summary.normative-expenses"),
            value: formatCurrency(draft.auto_values.normative_expenses),
          },
          {
            label: t("slovenia-yearly.review.summary.income-tax"),
            value: formatCurrency(draft.auto_values.income_tax_amount),
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border p-4">
          <h4 className="font-medium">{t("slovenia-yearly.review.rules.title")}</h4>
          <div className="mt-3 space-y-3 text-sm">
            <p>{draft.rule_summary.normative_expense_rule}</p>
            <p>{draft.rule_summary.income_tax_rule}</p>
            <p>{draft.rule_summary.advance_rule}</p>
          </div>
        </div>

        <div className="rounded-md border p-4">
          <h4 className="font-medium">{t("slovenia-yearly.review.installments.title")}</h4>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              {t("slovenia-yearly.review.installments.advance-tax")}:{" "}
              {formatCurrency(draft.auto_values.advance_tax_amount)}
            </p>
            <p>
              {t("slovenia-yearly.review.installments.monthly")}:{" "}
              {formatCurrency(draft.auto_values.monthly_installment_amount)}
            </p>
            <p>
              {t("slovenia-yearly.review.installments.quarterly")}:{" "}
              {formatCurrency(draft.auto_values.quarterly_installment_amount)}
            </p>
          </div>
        </div>
      </div>

      {draft.warnings.length > 0 && (
        <div className="space-y-3">
          {draft.warnings.map((warning) => (
            <Alert key={warning.code} variant={warning.severity === "warning" ? "destructive" : "default"}>
              {warning.severity === "warning" ? (
                <TriangleAlert className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {warning.severity === "warning"
                  ? t("slovenia-yearly.review.warnings.review-required")
                  : t("slovenia-yearly.review.warnings.check-before-export")}
              </AlertTitle>
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {draft.issue_details.length > 0 && (
        <div className="space-y-4">
          {draft.issue_details.map((issue) => (
            <div key={issue.code} className="rounded-md border p-4">
              <div className="space-y-2">
                <h4 className="font-medium">{issue.title}</h4>
                <p className="text-sm">{issue.explanation}</p>
                {issue.action && <p className="text-muted-foreground text-sm">{issue.action}</p>}
              </div>

              {issue.official_sources.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-sm">{t("slovenia-yearly.review.issues.official-guidance")}</p>
                  <div className="space-y-1 text-sm">
                    {issue.official_sources.map((source) => (
                      <a
                        key={source.url}
                        className="block text-primary-readable underline underline-offset-4"
                        href={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {source.issuer}: {source.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {issue.affected_documents.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="font-medium text-sm">{t("slovenia-yearly.review.issues.affected-documents")}</p>
                  <div className="space-y-2">
                    {issue.affected_documents.map((document) => (
                      <div
                        key={`${issue.code}-${document.id}`}
                        className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">
                            {getDisplayDocumentNumber(document, t)} ·{" "}
                            {document.type === "invoice"
                              ? t("slovenia-yearly.review.issues.document-type.invoice")
                              : t("slovenia-yearly.review.issues.document-type.credit-note")}
                          </div>
                          <a
                            className="text-primary-readable underline underline-offset-4"
                            href={document.document_path}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {t("slovenia-yearly.review.issues.open-document")}
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                          <span>
                            {t("slovenia-yearly.review.issues.fields.date")}: {document.date}
                          </span>
                          {document.customer_name && (
                            <span>
                              {t("slovenia-yearly.review.issues.fields.customer")}: {document.customer_name}
                            </span>
                          )}
                          {document.customer_country_code && (
                            <span>
                              {t("slovenia-yearly.review.issues.fields.country")}: {document.customer_country_code}
                            </span>
                          )}
                          {document.customer_tax_number && (
                            <span>
                              {t("slovenia-yearly.review.issues.fields.tax-number")}: {document.customer_tax_number}
                            </span>
                          )}
                          <span>
                            {t("slovenia-yearly.review.issues.fields.currency")}: {document.currency_code}
                          </span>
                        </div>
                        <p>{document.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            ["withholding_tax_amount", t("slovenia-yearly.review.manual.withholding-tax")],
            ["foreign_tax_credit_amount", t("slovenia-yearly.review.manual.foreign-tax-credit")],
            ["prior_advance_income_tax_amount", t("slovenia-yearly.review.manual.prior-advance-income-tax")],
            ["revenue_adjustment_decrease", t("slovenia-yearly.review.manual.revenue-adjustment-decrease")],
            ["revenue_adjustment_increase", t("slovenia-yearly.review.manual.revenue-adjustment-increase")],
          ] as Array<[keyof ManualValues, string]>
        ).map(([field, label]) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={`si-yearly-${field}`}>{label}</Label>
            <Input
              id={`si-yearly-${field}`}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              value={String(manualValues[field])}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onManualValueChange(field, Number(event.target.value) || 0)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
