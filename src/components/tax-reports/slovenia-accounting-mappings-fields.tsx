import { Separator } from "@/ui/components/ui/separator";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export type SloveniaAccountingExportFormat = "vod_xml" | "vasco_xml" | "minimax_xml";

export type SloveniaAccountingKontoMappings = {
  receivables: string;
  payables: string;
  sales_vat_22: string;
  sales_vat_95: string;
  sales_vat_5: string;
  purchase_vat_recoverable_22: string;
  purchase_vat_recoverable_95: string;
  purchase_vat_recoverable_5: string;
  sales_revenue_22: string;
  sales_revenue_95: string;
  sales_revenue_5: string;
  sales_revenue_exempt: string;
  sales_revenue_eu_goods: string;
  sales_revenue_eu_services: string;
  sales_revenue_reverse_charge: string;
  sales_revenue_third_country_goods: string;
  sales_revenue_third_country_services: string;
  purchase_expense_22: string;
  purchase_expense_95: string;
  purchase_expense_5: string;
  purchase_expense_exempt: string;
  purchase_expense_eu_goods: string;
  purchase_expense_eu_services: string;
  purchase_expense_reverse_charge: string;
  purchase_expense_third_country_goods: string;
  purchase_expense_third_country_services: string;
};

type FieldConfig = {
  key: keyof SloveniaAccountingKontoMappings;
  label: string;
};

type SectionConfig = {
  key: "sales" | "purchase";
  title: string;
  description: string;
  fields: FieldConfig[];
};

type SloveniaAccountingMappingsFieldsProps = {
  value: SloveniaAccountingKontoMappings;
  onChange: (next: SloveniaAccountingKontoMappings) => void;
  disabled?: boolean;
};

export const DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS: SloveniaAccountingKontoMappings = {
  receivables: "1200",
  payables: "2200",
  sales_vat_22: "26000",
  sales_vat_95: "26001",
  sales_vat_5: "26002",
  purchase_vat_recoverable_22: "16000",
  purchase_vat_recoverable_95: "16001",
  purchase_vat_recoverable_5: "16002",
  sales_revenue_22: "7600",
  sales_revenue_95: "7601",
  sales_revenue_5: "7602",
  sales_revenue_exempt: "7680",
  sales_revenue_eu_goods: "7600",
  sales_revenue_eu_services: "7601",
  sales_revenue_reverse_charge: "7600",
  sales_revenue_third_country_goods: "7600",
  sales_revenue_third_country_services: "7680",
  purchase_expense_22: "4000",
  purchase_expense_95: "4001",
  purchase_expense_5: "4002",
  purchase_expense_exempt: "4680",
  purchase_expense_eu_goods: "4000",
  purchase_expense_eu_services: "4680",
  purchase_expense_reverse_charge: "4000",
  purchase_expense_third_country_goods: "4000",
  purchase_expense_third_country_services: "4680",
};

const MAPPING_SECTIONS: SectionConfig[] = [
  {
    key: "sales",
    title: "Sales mappings",
    description: "Outgoing invoice, VAT, and revenue kontos used for issued-document exports.",
    fields: [
      { key: "receivables", label: "Receivables" },
      { key: "sales_vat_22", label: "Sales VAT 22%" },
      { key: "sales_vat_95", label: "Sales VAT 9.5%" },
      { key: "sales_vat_5", label: "Sales VAT 5%" },
      { key: "sales_revenue_22", label: "Sales revenue 22%" },
      { key: "sales_revenue_95", label: "Sales revenue 9.5%" },
      { key: "sales_revenue_5", label: "Sales revenue 5%" },
      { key: "sales_revenue_exempt", label: "Sales revenue exempt" },
      { key: "sales_revenue_eu_goods", label: "Sales revenue EU goods" },
      { key: "sales_revenue_eu_services", label: "Sales revenue EU services" },
      { key: "sales_revenue_reverse_charge", label: "Sales revenue reverse charge" },
      { key: "sales_revenue_third_country_goods", label: "Sales revenue third-country goods" },
      { key: "sales_revenue_third_country_services", label: "Sales revenue third-country services" },
    ],
  },
  {
    key: "purchase",
    title: "Purchase mappings",
    description: "Stored now for future received-document exports and other Slovenia accounting formats.",
    fields: [
      { key: "payables", label: "Payables" },
      { key: "purchase_vat_recoverable_22", label: "Purchase VAT recoverable 22%" },
      { key: "purchase_vat_recoverable_95", label: "Purchase VAT recoverable 9.5%" },
      { key: "purchase_vat_recoverable_5", label: "Purchase VAT recoverable 5%" },
      { key: "purchase_expense_22", label: "Purchase expense 22%" },
      { key: "purchase_expense_95", label: "Purchase expense 9.5%" },
      { key: "purchase_expense_5", label: "Purchase expense 5%" },
      { key: "purchase_expense_exempt", label: "Purchase expense exempt" },
      { key: "purchase_expense_eu_goods", label: "Purchase expense EU goods" },
      { key: "purchase_expense_eu_services", label: "Purchase expense EU services" },
      { key: "purchase_expense_reverse_charge", label: "Purchase expense reverse charge" },
      { key: "purchase_expense_third_country_goods", label: "Purchase expense third-country goods" },
      { key: "purchase_expense_third_country_services", label: "Purchase expense third-country services" },
    ],
  },
];

export function normalizeSloveniaAccountingKontoMappings(
  input?: Partial<Record<keyof SloveniaAccountingKontoMappings, string | null>> | null,
): SloveniaAccountingKontoMappings {
  return {
    receivables: normalizeKontoValue(input?.receivables, DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.receivables),
    payables: normalizeKontoValue(input?.payables, DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.payables),
    sales_vat_22: normalizeKontoValue(input?.sales_vat_22, DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_vat_22),
    sales_vat_95: normalizeKontoValue(input?.sales_vat_95, DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_vat_95),
    sales_vat_5: normalizeKontoValue(input?.sales_vat_5, DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_vat_5),
    purchase_vat_recoverable_22: normalizeKontoValue(
      input?.purchase_vat_recoverable_22,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_vat_recoverable_22,
    ),
    purchase_vat_recoverable_95: normalizeKontoValue(
      input?.purchase_vat_recoverable_95,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_vat_recoverable_95,
    ),
    purchase_vat_recoverable_5: normalizeKontoValue(
      input?.purchase_vat_recoverable_5,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_vat_recoverable_5,
    ),
    sales_revenue_22: normalizeKontoValue(
      input?.sales_revenue_22,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_revenue_22,
    ),
    sales_revenue_95: normalizeKontoValue(
      input?.sales_revenue_95,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_revenue_95,
    ),
    sales_revenue_5: normalizeKontoValue(
      input?.sales_revenue_5,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_revenue_5,
    ),
    sales_revenue_exempt: normalizeKontoValue(
      input?.sales_revenue_exempt,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_revenue_exempt,
    ),
    sales_revenue_eu_goods: normalizeKontoValue(
      input?.sales_revenue_eu_goods,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_revenue_eu_goods,
    ),
    sales_revenue_eu_services: normalizeKontoValue(
      input?.sales_revenue_eu_services,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_revenue_eu_services,
    ),
    sales_revenue_reverse_charge: normalizeKontoValue(
      input?.sales_revenue_reverse_charge,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_revenue_reverse_charge,
    ),
    sales_revenue_third_country_goods: normalizeKontoValue(
      input?.sales_revenue_third_country_goods,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_revenue_third_country_goods,
    ),
    sales_revenue_third_country_services: normalizeKontoValue(
      input?.sales_revenue_third_country_services,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.sales_revenue_third_country_services,
    ),
    purchase_expense_22: normalizeKontoValue(
      input?.purchase_expense_22,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_expense_22,
    ),
    purchase_expense_95: normalizeKontoValue(
      input?.purchase_expense_95,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_expense_95,
    ),
    purchase_expense_5: normalizeKontoValue(
      input?.purchase_expense_5,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_expense_5,
    ),
    purchase_expense_exempt: normalizeKontoValue(
      input?.purchase_expense_exempt,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_expense_exempt,
    ),
    purchase_expense_eu_goods: normalizeKontoValue(
      input?.purchase_expense_eu_goods,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_expense_eu_goods,
    ),
    purchase_expense_eu_services: normalizeKontoValue(
      input?.purchase_expense_eu_services,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_expense_eu_services,
    ),
    purchase_expense_reverse_charge: normalizeKontoValue(
      input?.purchase_expense_reverse_charge,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_expense_reverse_charge,
    ),
    purchase_expense_third_country_goods: normalizeKontoValue(
      input?.purchase_expense_third_country_goods,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_expense_third_country_goods,
    ),
    purchase_expense_third_country_services: normalizeKontoValue(
      input?.purchase_expense_third_country_services,
      DEFAULT_SLOVENIA_ACCOUNTING_KONTO_MAPPINGS.purchase_expense_third_country_services,
    ),
  };
}

function normalizeKontoValue(value: string | null | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return (trimmed || fallback).slice(0, 8);
}

export function SloveniaAccountingMappingsFields({
  value,
  onChange,
  disabled = false,
}: SloveniaAccountingMappingsFieldsProps) {
  const handleFieldChange = (key: keyof SloveniaAccountingKontoMappings, nextValue: string) => {
    onChange({
      ...value,
      [key]: nextValue.trim().slice(0, 8),
    });
  };

  return (
    <div className="space-y-6">
      {MAPPING_SECTIONS.map((section, sectionIndex) => (
        <div key={section.key} className="space-y-4">
          {sectionIndex > 0 ? <Separator /> : null}
          <div className="space-y-1">
            <h3 className="font-medium text-sm">{section.title}</h3>
            <p className="text-muted-foreground text-sm">{section.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.fields.map((field) => {
              const inputId = `slovenia-konto-${field.key}`;

              return (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={inputId}>{field.label}</Label>
                  <Input
                    id={inputId}
                    value={value[field.key]}
                    maxLength={8}
                    disabled={disabled}
                    onChange={(event) => handleFieldChange(field.key, event.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
