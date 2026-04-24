import { taxReports } from "@spaceinvoices/js-sdk";
import { Download, Loader2, RefreshCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { Button } from "../ui/button";
import { type SloveniaTaxProfileFormState, SloveniaTaxProfileStep } from "./slovenia-tax-profile-step";
import { SloveniaYearlyReviewStep } from "./slovenia-yearly-review-step";

type SloveniaYearlyExportFormProps = {
  entityId: string;
  onSuccess?: (fileName: string) => void;
  onError?: (error: Error) => void;
} & ComponentTranslationProps;

type ProfileResponse = Awaited<ReturnType<typeof taxReports.getSloveniaTaxProfile>>;
type DraftResponse = Awaited<ReturnType<typeof taxReports.reviewSloveniaYearlyNormiraniReport>>;
type ManualValues = DraftResponse["manual_values"];
type UpdateProfileBody = Parameters<typeof taxReports.updateSloveniaTaxProfile>[0];

const translations = {
  en: {
    "slovenia-yearly.title": "Yearly eDavki Report",
    "slovenia-yearly.save-profile": "Save profile",
    "slovenia-yearly.review": "Review yearly report",
    "slovenia-yearly.refresh": "Refresh review",
    "slovenia-yearly.export": "Download DDD-DDD XML",
    "slovenia-yearly.loading": "Loading profile...",
    "slovenia-yearly.saving": "Saving profile...",
    "slovenia-yearly.reviewing": "Building review...",
    "slovenia-yearly.exporting": "Generating XML...",
    "slovenia-yearly.errors.load-profile": "Failed to load Slovenia tax profile",
    "slovenia-yearly.errors.save-profile": "Failed to save Slovenia tax profile",
    "slovenia-yearly.errors.review": "Failed to build yearly review",
    "slovenia-yearly.errors.export": "Failed to export yearly XML",
    "slovenia-yearly.unsupported.business-form-required": "Business form is required before export is available.",
    "slovenia-yearly.unsupported.regime-required": "Income tax regime is required before export is available.",
    "slovenia-yearly.unsupported.tax-residency-required": "Tax residency is required before export is available.",
    "slovenia-yearly.unsupported.insurance-basis-required": "Insurance basis is required before export is available.",
    "slovenia-yearly.unsupported.non-resident": "Only resident yearly export is supported in v1.",
    "slovenia-yearly.unsupported.business-form":
      "This profile is stored for future use, but only s.p. yearly export is supported in v1.",
    "slovenia-yearly.unsupported.regime": "Only normirani yearly export is supported in v1.",
    "slovenia-yearly.profile.year.label": "Tax year",
    "slovenia-yearly.profile.business-form.label": "Business form",
    "slovenia-yearly.profile.business-form.placeholder": "Select business form",
    "slovenia-yearly.profile.business-form.options.sp": "s.p.",
    "slovenia-yearly.profile.business-form.options.doo": "d.o.o.",
    "slovenia-yearly.profile.business-form.options.dno": "d.n.o.",
    "slovenia-yearly.profile.business-form.options.club": "Društvo / club",
    "slovenia-yearly.profile.regime.label": "Income tax regime",
    "slovenia-yearly.profile.regime.placeholder": "Select tax regime",
    "slovenia-yearly.profile.regime.options.normirani": "Normirani",
    "slovenia-yearly.profile.regime.options.dejanski": "Dejanski",
    "slovenia-yearly.profile.residency.label": "Tax residency",
    "slovenia-yearly.profile.residency.placeholder": "Select residency",
    "slovenia-yearly.profile.residency.options.resident": "Resident",
    "slovenia-yearly.profile.residency.options.non_resident": "Non-resident",
    "slovenia-yearly.profile.vat-profile.label": "VAT profile",
    "slovenia-yearly.profile.vat-profile.placeholder": "Optional",
    "slovenia-yearly.profile.vat-profile.options.standard": "Standard VAT subject",
    "slovenia-yearly.profile.vat-profile.options.special_vat_identified": "Special VAT subject",
    "slovenia-yearly.profile.vat-profile.options.non_vat_subject": "Non-VAT subject",
    "slovenia-yearly.profile.insurance-basis.label": "Insurance basis",
    "slovenia-yearly.profile.insurance-basis.placeholder": "Select insurance basis",
    "slovenia-yearly.profile.insurance-basis.options.full_time_self_employed": "Full-time self-employed",
    "slovenia-yearly.profile.insurance-basis.options.other": "Other",
    "slovenia-yearly.profile.activity-code.label": "Activity codes",
    "slovenia-yearly.profile.activity-code.placeholder": "62.010",
    "slovenia-yearly.profile.activity-code.add": "Add activity code",
    "slovenia-yearly.profile.activity-code.remove": "Remove",
    "slovenia-yearly.profile.registration-number.label": "Registration number",
    "slovenia-yearly.profile.registration-number.placeholder": "Optional",
    "slovenia-yearly.profile.unsupported.title": "Stored, but not exportable yet",
    "slovenia-yearly.review.summary.adjusted-revenue": "Adjusted revenue",
    "slovenia-yearly.review.summary.normative-expenses": "Normative expenses",
    "slovenia-yearly.review.summary.income-tax": "Income tax",
    "slovenia-yearly.review.rules.title": "Applied rules",
    "slovenia-yearly.review.installments.title": "Installments",
    "slovenia-yearly.review.installments.advance-tax": "Advance tax amount",
    "slovenia-yearly.review.installments.monthly": "Monthly installment",
    "slovenia-yearly.review.installments.quarterly": "Quarterly installment",
    "slovenia-yearly.review.warnings.review-required": "Review required",
    "slovenia-yearly.review.warnings.check-before-export": "Check before export",
    "slovenia-yearly.review.issues.official-guidance": "Official guidance",
    "slovenia-yearly.review.issues.affected-documents": "Affected documents",
    "slovenia-yearly.review.issues.document-type.invoice": "Invoice",
    "slovenia-yearly.review.issues.document-type.credit-note": "Credit note",
    "slovenia-yearly.review.issues.open-document": "Open document",
    "slovenia-yearly.review.issues.fields.date": "Date",
    "slovenia-yearly.review.issues.fields.customer": "Customer",
    "slovenia-yearly.review.issues.fields.country": "Country",
    "slovenia-yearly.review.issues.fields.tax-number": "Tax number",
    "slovenia-yearly.review.issues.fields.currency": "Currency",
    "slovenia-yearly.review.manual.withholding-tax": "Withholding tax amount",
    "slovenia-yearly.review.manual.foreign-tax-credit": "Foreign tax credit amount",
    "slovenia-yearly.review.manual.prior-advance-income-tax": "Prior advance income tax amount",
    "slovenia-yearly.review.manual.revenue-adjustment-decrease": "Revenue adjustment decrease",
    "slovenia-yearly.review.manual.revenue-adjustment-increase": "Revenue adjustment increase",
  },
  sl: {
    "slovenia-yearly.title": "Letno poročilo za eDavke",
    "slovenia-yearly.save-profile": "Shrani profil",
    "slovenia-yearly.review": "Preglej letno poročilo",
    "slovenia-yearly.refresh": "Osveži pregled",
    "slovenia-yearly.export": "Prenesi DDD-DDD XML",
    "slovenia-yearly.loading": "Nalaganje profila...",
    "slovenia-yearly.saving": "Shranjevanje profila...",
    "slovenia-yearly.reviewing": "Priprava pregleda...",
    "slovenia-yearly.exporting": "Generiranje XML ...",
    "slovenia-yearly.errors.load-profile": "Nalaganje slovenskega davčnega profila ni uspelo",
    "slovenia-yearly.errors.save-profile": "Shranjevanje slovenskega davčnega profila ni uspelo",
    "slovenia-yearly.errors.review": "Priprava letnega pregleda ni uspela",
    "slovenia-yearly.errors.export": "Izvoz letnega XML ni uspel",
    "slovenia-yearly.unsupported.business-form-required": "Pred izvozom je treba določiti pravno obliko.",
    "slovenia-yearly.unsupported.regime-required": "Pred izvozom je treba določiti dohodninski režim.",
    "slovenia-yearly.unsupported.tax-residency-required": "Pred izvozom je treba določiti davčno rezidentstvo.",
    "slovenia-yearly.unsupported.insurance-basis-required": "Pred izvozom je treba določiti zavarovalno podlago.",
    "slovenia-yearly.unsupported.non-resident": "V prvi različici je podprt samo letni izvoz za rezidente.",
    "slovenia-yearly.unsupported.business-form":
      "Ta profil se shrani za prihodnjo uporabo, vendar je v prvi različici podprt samo letni izvoz za s.p.",
    "slovenia-yearly.unsupported.regime": "V prvi različici je podprt samo letni izvoz za normirance.",
    "slovenia-yearly.profile.year.label": "Davčno leto",
    "slovenia-yearly.profile.business-form.label": "Pravna oblika",
    "slovenia-yearly.profile.business-form.placeholder": "Izberi pravno obliko",
    "slovenia-yearly.profile.business-form.options.sp": "s.p.",
    "slovenia-yearly.profile.business-form.options.doo": "d.o.o.",
    "slovenia-yearly.profile.business-form.options.dno": "d.n.o.",
    "slovenia-yearly.profile.business-form.options.club": "Društvo",
    "slovenia-yearly.profile.regime.label": "Dohodninski režim",
    "slovenia-yearly.profile.regime.placeholder": "Izberi režim",
    "slovenia-yearly.profile.regime.options.normirani": "Normirani",
    "slovenia-yearly.profile.regime.options.dejanski": "Dejanski",
    "slovenia-yearly.profile.residency.label": "Davčno rezidentstvo",
    "slovenia-yearly.profile.residency.placeholder": "Izberi rezidentstvo",
    "slovenia-yearly.profile.residency.options.resident": "Rezident",
    "slovenia-yearly.profile.residency.options.non_resident": "Nerezident",
    "slovenia-yearly.profile.vat-profile.label": "DDV profil",
    "slovenia-yearly.profile.vat-profile.placeholder": "Neobvezno",
    "slovenia-yearly.profile.vat-profile.options.standard": "Običajni DDV zavezanec",
    "slovenia-yearly.profile.vat-profile.options.special_vat_identified": "Posebni DDV zavezanec",
    "slovenia-yearly.profile.vat-profile.options.non_vat_subject": "Ne-DDV zavezanec",
    "slovenia-yearly.profile.insurance-basis.label": "Zavarovalna podlaga",
    "slovenia-yearly.profile.insurance-basis.placeholder": "Izberi zavarovalno podlago",
    "slovenia-yearly.profile.insurance-basis.options.full_time_self_employed": "Polni s.p.",
    "slovenia-yearly.profile.insurance-basis.options.other": "Drugo",
    "slovenia-yearly.profile.activity-code.label": "Šifre dejavnosti",
    "slovenia-yearly.profile.activity-code.placeholder": "62.010",
    "slovenia-yearly.profile.activity-code.add": "Dodaj šifro dejavnosti",
    "slovenia-yearly.profile.activity-code.remove": "Odstrani",
    "slovenia-yearly.profile.registration-number.label": "Matična številka",
    "slovenia-yearly.profile.registration-number.placeholder": "Neobvezno",
    "slovenia-yearly.profile.unsupported.title": "Shranjeno, vendar še ni mogoče izvoziti",
    "slovenia-yearly.review.summary.adjusted-revenue": "Prilagojeni prihodki",
    "slovenia-yearly.review.summary.normative-expenses": "Normirani odhodki",
    "slovenia-yearly.review.summary.income-tax": "Dohodnina",
    "slovenia-yearly.review.rules.title": "Uporabljena pravila",
    "slovenia-yearly.review.installments.title": "Akontacije",
    "slovenia-yearly.review.installments.advance-tax": "Znesek akontacije",
    "slovenia-yearly.review.installments.monthly": "Mesečni obrok",
    "slovenia-yearly.review.installments.quarterly": "Četrtletni obrok",
    "slovenia-yearly.review.warnings.review-required": "Potreben pregled",
    "slovenia-yearly.review.warnings.check-before-export": "Preveri pred izvozom",
    "slovenia-yearly.review.issues.official-guidance": "Uradna navodila",
    "slovenia-yearly.review.issues.affected-documents": "Zadevni dokumenti",
    "slovenia-yearly.review.issues.document-type.invoice": "Račun",
    "slovenia-yearly.review.issues.document-type.credit-note": "Dobropis",
    "slovenia-yearly.review.issues.open-document": "Odpri dokument",
    "slovenia-yearly.review.issues.fields.date": "Datum",
    "slovenia-yearly.review.issues.fields.customer": "Kupec",
    "slovenia-yearly.review.issues.fields.country": "Država",
    "slovenia-yearly.review.issues.fields.tax-number": "Davčna številka",
    "slovenia-yearly.review.issues.fields.currency": "Valuta",
    "slovenia-yearly.review.manual.withholding-tax": "Znesek davčnega odtegljaja",
    "slovenia-yearly.review.manual.foreign-tax-credit": "Znesek tujega davčnega dobropisa",
    "slovenia-yearly.review.manual.prior-advance-income-tax": "Predhodno plačana akontacija dohodnine",
    "slovenia-yearly.review.manual.revenue-adjustment-decrease": "Znižanje prihodkov",
    "slovenia-yearly.review.manual.revenue-adjustment-increase": "Povečanje prihodkov",
  },
  hr: {
    "slovenia-yearly.title": "Godišnje eDavki izvješće",
    "slovenia-yearly.save-profile": "Spremi profil",
    "slovenia-yearly.review": "Pregledaj godišnje izvješće",
    "slovenia-yearly.refresh": "Osvježi pregled",
    "slovenia-yearly.export": "Preuzmi DDD-DDD XML",
    "slovenia-yearly.loading": "Učitavanje profila...",
    "slovenia-yearly.saving": "Spremanje profila...",
    "slovenia-yearly.reviewing": "Priprema pregleda...",
    "slovenia-yearly.exporting": "Generiranje XML-a...",
    "slovenia-yearly.errors.load-profile": "Učitavanje slovenskog poreznog profila nije uspjelo",
    "slovenia-yearly.errors.save-profile": "Spremanje slovenskog poreznog profila nije uspjelo",
    "slovenia-yearly.errors.review": "Priprema godišnjeg pregleda nije uspjela",
    "slovenia-yearly.errors.export": "Izvoz godišnjeg XML-a nije uspio",
    "slovenia-yearly.unsupported.business-form-required": "Prije izvoza potrebno je odabrati pravni oblik.",
    "slovenia-yearly.unsupported.regime-required": "Prije izvoza potrebno je odabrati porezni režim.",
    "slovenia-yearly.unsupported.tax-residency-required": "Prije izvoza potrebno je odabrati poreznu rezidentnost.",
    "slovenia-yearly.unsupported.insurance-basis-required": "Prije izvoza potrebno je odabrati osnovu osiguranja.",
    "slovenia-yearly.unsupported.non-resident": "U prvoj verziji podržan je samo godišnji izvoz za rezidente.",
    "slovenia-yearly.unsupported.business-form":
      "Ovaj profil se sprema za buduću upotrebu, ali je u prvoj verziji podržan samo godišnji izvoz za s.p.",
    "slovenia-yearly.unsupported.regime": "U prvoj verziji podržan je samo godišnji izvoz za normirance.",
    "slovenia-yearly.profile.year.label": "Porezna godina",
    "slovenia-yearly.profile.business-form.label": "Pravni oblik",
    "slovenia-yearly.profile.business-form.placeholder": "Odaberi pravni oblik",
    "slovenia-yearly.profile.business-form.options.sp": "s.p.",
    "slovenia-yearly.profile.business-form.options.doo": "d.o.o.",
    "slovenia-yearly.profile.business-form.options.dno": "d.n.o.",
    "slovenia-yearly.profile.business-form.options.club": "Udruga",
    "slovenia-yearly.profile.regime.label": "Porezni režim",
    "slovenia-yearly.profile.regime.placeholder": "Odaberi režim",
    "slovenia-yearly.profile.regime.options.normirani": "Normirani",
    "slovenia-yearly.profile.regime.options.dejanski": "Dejanski",
    "slovenia-yearly.profile.residency.label": "Porezna rezidentnost",
    "slovenia-yearly.profile.residency.placeholder": "Odaberi rezidentnost",
    "slovenia-yearly.profile.residency.options.resident": "Rezident",
    "slovenia-yearly.profile.residency.options.non_resident": "Nerezident",
    "slovenia-yearly.profile.vat-profile.label": "PDV profil",
    "slovenia-yearly.profile.vat-profile.placeholder": "Opcionalno",
    "slovenia-yearly.profile.vat-profile.options.standard": "Standardni PDV obveznik",
    "slovenia-yearly.profile.vat-profile.options.special_vat_identified": "Posebni PDV obveznik",
    "slovenia-yearly.profile.vat-profile.options.non_vat_subject": "Nije PDV obveznik",
    "slovenia-yearly.profile.insurance-basis.label": "Osnova osiguranja",
    "slovenia-yearly.profile.insurance-basis.placeholder": "Odaberi osnovu osiguranja",
    "slovenia-yearly.profile.insurance-basis.options.full_time_self_employed": "Puni samostalni obrt",
    "slovenia-yearly.profile.insurance-basis.options.other": "Drugo",
    "slovenia-yearly.profile.activity-code.label": "Šifre djelatnosti",
    "slovenia-yearly.profile.activity-code.placeholder": "62.010",
    "slovenia-yearly.profile.activity-code.add": "Dodaj šifru djelatnosti",
    "slovenia-yearly.profile.activity-code.remove": "Ukloni",
    "slovenia-yearly.profile.registration-number.label": "Matični broj",
    "slovenia-yearly.profile.registration-number.placeholder": "Opcionalno",
    "slovenia-yearly.profile.unsupported.title": "Spremljeno, ali još nije moguće izvesti",
    "slovenia-yearly.review.summary.adjusted-revenue": "Prilagođeni prihodi",
    "slovenia-yearly.review.summary.normative-expenses": "Normirani troškovi",
    "slovenia-yearly.review.summary.income-tax": "Porez na dohodak",
    "slovenia-yearly.review.rules.title": "Primijenjena pravila",
    "slovenia-yearly.review.installments.title": "Akontacije",
    "slovenia-yearly.review.installments.advance-tax": "Iznos akontacije",
    "slovenia-yearly.review.installments.monthly": "Mjesečni obrok",
    "slovenia-yearly.review.installments.quarterly": "Tromjesečni obrok",
    "slovenia-yearly.review.warnings.review-required": "Potreban pregled",
    "slovenia-yearly.review.warnings.check-before-export": "Provjeri prije izvoza",
    "slovenia-yearly.review.issues.official-guidance": "Službene upute",
    "slovenia-yearly.review.issues.affected-documents": "Povezani dokumenti",
    "slovenia-yearly.review.issues.document-type.invoice": "Račun",
    "slovenia-yearly.review.issues.document-type.credit-note": "Odobrenje",
    "slovenia-yearly.review.issues.open-document": "Otvori dokument",
    "slovenia-yearly.review.issues.fields.date": "Datum",
    "slovenia-yearly.review.issues.fields.customer": "Kupac",
    "slovenia-yearly.review.issues.fields.country": "Država",
    "slovenia-yearly.review.issues.fields.tax-number": "Porezni broj",
    "slovenia-yearly.review.issues.fields.currency": "Valuta",
    "slovenia-yearly.review.manual.withholding-tax": "Iznos poreza po odbitku",
    "slovenia-yearly.review.manual.foreign-tax-credit": "Iznos inozemnog poreznog kredita",
    "slovenia-yearly.review.manual.prior-advance-income-tax": "Prethodno plaćena akontacija poreza na dohodak",
    "slovenia-yearly.review.manual.revenue-adjustment-decrease": "Smanjenje prihoda",
    "slovenia-yearly.review.manual.revenue-adjustment-increase": "Povećanje prihoda",
  },
} as const;

function getDefaultYear(): number {
  return new Date().getFullYear() - 1;
}

function normalizeActivityCodes(activityCodes: string[]): string[] {
  const seen = new Set<string>();

  return activityCodes.reduce<string[]>((codes, activityCode) => {
    const trimmed = activityCode.trim();

    if (!trimmed || seen.has(trimmed)) {
      return codes;
    }

    seen.add(trimmed);
    codes.push(trimmed);
    return codes;
  }, []);
}

function createDefaultProfileForm(): SloveniaTaxProfileFormState {
  return {
    business_form: "sp",
    income_tax_regime: "normirani",
    vat_profile: "",
    tax_residency: "resident",
    activity_codes: [],
    registration_number: "",
    normiranec_insurance_basis: "full_time_self_employed",
  };
}

function getUnsupportedReasonKey(form: SloveniaTaxProfileFormState): string | null {
  if (!form.business_form) return "slovenia-yearly.unsupported.business-form-required";
  if (!form.income_tax_regime) return "slovenia-yearly.unsupported.regime-required";
  if (!form.tax_residency) return "slovenia-yearly.unsupported.tax-residency-required";
  if (!form.normiranec_insurance_basis) return "slovenia-yearly.unsupported.insurance-basis-required";
  if (form.tax_residency !== "resident") return "slovenia-yearly.unsupported.non-resident";
  if (form.business_form !== "sp") return "slovenia-yearly.unsupported.business-form";
  if (form.income_tax_regime !== "normirani") return "slovenia-yearly.unsupported.regime";
  return null;
}

function profileToForm(profile: ProfileResponse): SloveniaTaxProfileFormState {
  return {
    business_form: profile.business_form ?? "sp",
    income_tax_regime: profile.income_tax_regime ?? "normirani",
    vat_profile: profile.vat_profile ?? "",
    tax_residency: profile.tax_residency ?? "resident",
    activity_codes: normalizeActivityCodes(profile.yearly_reporting.activity_codes ?? []),
    registration_number: profile.yearly_reporting.registration_number ?? "",
    normiranec_insurance_basis: profile.yearly_reporting.normiranec_insurance_basis ?? "full_time_self_employed",
  };
}

export function SloveniaYearlyExportForm({
  entityId,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
  onSuccess,
  onError,
}: SloveniaYearlyExportFormProps) {
  const t = useMemo(
    () => createTranslation({ t: translateFn, namespace, locale, translationLocale, translations }),
    [locale, namespace, translateFn, translationLocale],
  );
  const [year, setYear] = useState(getDefaultYear);
  const [profileForm, setProfileForm] = useState<SloveniaTaxProfileFormState>(createDefaultProfileForm);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [manualValues, setManualValues] = useState<ManualValues>({
    withholding_tax_amount: 0,
    foreign_tax_credit_amount: 0,
    prior_advance_income_tax_amount: 0,
    revenue_adjustment_decrease: 0,
    revenue_adjustment_increase: 0,
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);

      try {
        const profile = await taxReports.getSloveniaTaxProfile({
          entity_id: entityId,
        });

        if (!isMounted) return;
        setProfileForm(profileToForm(profile));
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(t("slovenia-yearly.errors.load-profile")));
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [entityId, onError, t]);

  const unsupportedReasonKey = getUnsupportedReasonKey(profileForm);
  const unsupportedReason = unsupportedReasonKey ? t(unsupportedReasonKey) : null;
  const yearOptions = Array.from({ length: 4 }, (_, index) => getDefaultYear() + 1 - index);

  const saveProfile = async (): Promise<ProfileResponse> => {
    setIsSavingProfile(true);

    try {
      const payload: UpdateProfileBody = {
        business_form: profileForm.business_form || undefined,
        income_tax_regime: profileForm.income_tax_regime || undefined,
        vat_profile: profileForm.vat_profile || undefined,
        tax_residency: profileForm.tax_residency || undefined,
        yearly_reporting: {
          activity_codes: normalizeActivityCodes(profileForm.activity_codes),
          registration_number: profileForm.registration_number || null,
          normiranec_insurance_basis: profileForm.normiranec_insurance_basis || null,
        },
      };

      const profile = await taxReports.updateSloveniaTaxProfile(payload, {
        entity_id: entityId,
      });

      setProfileForm(profileToForm(profile));
      return profile;
    } catch (error) {
      throw error instanceof Error ? error : new Error(t("slovenia-yearly.errors.save-profile"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleReview = async () => {
    try {
      const profile = await saveProfile();

      if (!profile.supported_exports.yearly_normirani) {
        setDraft(null);
        return;
      }

      setIsReviewing(true);
      const response = await taxReports.reviewSloveniaYearlyNormiraniReport(
        {
          year,
        },
        { entity_id: entityId },
      );

      setDraft(response);
      setManualValues(response.manual_values);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(t("slovenia-yearly.errors.review")));
    } finally {
      setIsReviewing(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const blob = await taxReports.exportSloveniaYearlyNormiraniReport(
        {
          year,
          manual_values: manualValues,
        },
        { entity_id: entityId },
      );

      const fileName = `DDD-DDD_${year}.xml`;
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      onSuccess?.(fileName);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(t("slovenia-yearly.errors.export")));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {isLoadingProfile ? (
        <div className="text-muted-foreground text-sm">{t("slovenia-yearly.loading")}</div>
      ) : (
        <>
          <SloveniaTaxProfileStep
            form={profileForm}
            t={t}
            onFieldChange={(field, value) => {
              setProfileForm((current) => ({ ...current, [field]: value }));
            }}
            onActivityCodesChange={(activityCodes) => {
              setProfileForm((current) => ({ ...current, activity_codes: activityCodes }));
            }}
            unsupportedReason={unsupportedReason}
            year={year}
            onYearChange={setYear}
            yearOptions={yearOptions}
          />

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleReview} disabled={isSavingProfile || isReviewing}>
              {isSavingProfile || isReviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSavingProfile ? t("slovenia-yearly.saving") : t("slovenia-yearly.reviewing")}
                </>
              ) : unsupportedReason ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("slovenia-yearly.save-profile")}
                </>
              ) : draft ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t("slovenia-yearly.refresh")}
                </>
              ) : (
                t("slovenia-yearly.review")
              )}
            </Button>

            {draft && !unsupportedReason && (
              <Button onClick={handleExport} disabled={isExporting} variant="outline">
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("slovenia-yearly.exporting")}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {t("slovenia-yearly.export")}
                  </>
                )}
              </Button>
            )}
          </div>

          {draft && !unsupportedReason && (
            <SloveniaYearlyReviewStep
              draft={draft}
              manualValues={manualValues}
              t={t}
              onManualValueChange={(field, value) => {
                setManualValues((current: ManualValues) => ({ ...current, [field]: value }));
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
