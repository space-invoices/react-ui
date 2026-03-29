import { AlertCircle } from "lucide-react";
import type { ChangeEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export type SloveniaTaxProfileFormState = {
  business_form: "sp" | "doo" | "dno" | "club" | "";
  income_tax_regime: "normirani" | "dejanski" | "";
  vat_profile: "standard" | "special_vat_identified" | "non_vat_subject" | "";
  tax_residency: "resident" | "non_resident" | "";
  activity_code: string;
  registration_number: string;
  normiranec_insurance_basis: "full_time_self_employed" | "other" | "";
};

type SloveniaTaxProfileStepProps = {
  form: SloveniaTaxProfileFormState;
  t: (key: string) => string;
  onFieldChange: (field: keyof SloveniaTaxProfileFormState, value: string) => void;
  unsupportedReason: string | null;
  year: number;
  onYearChange: (year: number) => void;
  yearOptions: number[];
};

export function SloveniaTaxProfileStep({
  form,
  t,
  onFieldChange,
  unsupportedReason,
  year,
  onYearChange,
  yearOptions,
}: SloveniaTaxProfileStepProps) {
  const businessFormLabel = form.business_form
    ? t(`slovenia-yearly.profile.business-form.options.${form.business_form}`)
    : undefined;
  const regimeLabel = form.income_tax_regime
    ? t(`slovenia-yearly.profile.regime.options.${form.income_tax_regime}`)
    : undefined;
  const residencyLabel = form.tax_residency
    ? t(`slovenia-yearly.profile.residency.options.${form.tax_residency}`)
    : undefined;
  const vatProfileLabel = form.vat_profile
    ? t(`slovenia-yearly.profile.vat-profile.options.${form.vat_profile}`)
    : undefined;
  const insuranceBasisLabel = form.normiranec_insurance_basis
    ? t(`slovenia-yearly.profile.insurance-basis.options.${form.normiranec_insurance_basis}`)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="si-yearly-year">{t("slovenia-yearly.profile.year.label")}</Label>
          <Select value={String(year)} onValueChange={(value) => onYearChange(Number(value))}>
            <SelectTrigger id="si-yearly-year">
              <SelectValue>{year}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="si-yearly-business-form">{t("slovenia-yearly.profile.business-form.label")}</Label>
          <Select
            value={form.business_form || undefined}
            onValueChange={(value) => onFieldChange("business_form", value ?? "")}
          >
            <SelectTrigger id="si-yearly-business-form">
              <SelectValue placeholder={t("slovenia-yearly.profile.business-form.placeholder")}>
                {businessFormLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sp">{t("slovenia-yearly.profile.business-form.options.sp")}</SelectItem>
              <SelectItem value="doo">{t("slovenia-yearly.profile.business-form.options.doo")}</SelectItem>
              <SelectItem value="dno">{t("slovenia-yearly.profile.business-form.options.dno")}</SelectItem>
              <SelectItem value="club">{t("slovenia-yearly.profile.business-form.options.club")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="si-yearly-regime">{t("slovenia-yearly.profile.regime.label")}</Label>
          <Select
            value={form.income_tax_regime || undefined}
            onValueChange={(value) => onFieldChange("income_tax_regime", value ?? "")}
          >
            <SelectTrigger id="si-yearly-regime">
              <SelectValue placeholder={t("slovenia-yearly.profile.regime.placeholder")}>{regimeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normirani">{t("slovenia-yearly.profile.regime.options.normirani")}</SelectItem>
              <SelectItem value="dejanski">{t("slovenia-yearly.profile.regime.options.dejanski")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="si-yearly-residency">{t("slovenia-yearly.profile.residency.label")}</Label>
          <Select
            value={form.tax_residency || undefined}
            onValueChange={(value) => onFieldChange("tax_residency", value ?? "")}
          >
            <SelectTrigger id="si-yearly-residency">
              <SelectValue placeholder={t("slovenia-yearly.profile.residency.placeholder")}>
                {residencyLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resident">{t("slovenia-yearly.profile.residency.options.resident")}</SelectItem>
              <SelectItem value="non_resident">
                {t("slovenia-yearly.profile.residency.options.non_resident")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="si-yearly-vat-profile">{t("slovenia-yearly.profile.vat-profile.label")}</Label>
          <Select
            value={form.vat_profile || undefined}
            onValueChange={(value) => onFieldChange("vat_profile", value ?? "")}
          >
            <SelectTrigger id="si-yearly-vat-profile">
              <SelectValue placeholder={t("slovenia-yearly.profile.vat-profile.placeholder")}>
                {vatProfileLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">{t("slovenia-yearly.profile.vat-profile.options.standard")}</SelectItem>
              <SelectItem value="special_vat_identified">
                {t("slovenia-yearly.profile.vat-profile.options.special_vat_identified")}
              </SelectItem>
              <SelectItem value="non_vat_subject">
                {t("slovenia-yearly.profile.vat-profile.options.non_vat_subject")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="si-yearly-insurance-basis">{t("slovenia-yearly.profile.insurance-basis.label")}</Label>
          <Select
            value={form.normiranec_insurance_basis || undefined}
            onValueChange={(value) => onFieldChange("normiranec_insurance_basis", value ?? "")}
          >
            <SelectTrigger id="si-yearly-insurance-basis">
              <SelectValue placeholder={t("slovenia-yearly.profile.insurance-basis.placeholder")}>
                {insuranceBasisLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time_self_employed">
                {t("slovenia-yearly.profile.insurance-basis.options.full_time_self_employed")}
              </SelectItem>
              <SelectItem value="other">{t("slovenia-yearly.profile.insurance-basis.options.other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="si-yearly-activity-code">{t("slovenia-yearly.profile.activity-code.label")}</Label>
          <Input
            id="si-yearly-activity-code"
            value={form.activity_code}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onFieldChange("activity_code", event.target.value)}
            placeholder={t("slovenia-yearly.profile.activity-code.placeholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="si-yearly-registration-number">
            {t("slovenia-yearly.profile.registration-number.label")}
          </Label>
          <Input
            id="si-yearly-registration-number"
            value={form.registration_number}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onFieldChange("registration_number", event.target.value)
            }
            placeholder={t("slovenia-yearly.profile.registration-number.placeholder")}
          />
        </div>
      </div>

      {unsupportedReason && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("slovenia-yearly.profile.unsupported.title")}</AlertTitle>
          <AlertDescription>{unsupportedReason}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
