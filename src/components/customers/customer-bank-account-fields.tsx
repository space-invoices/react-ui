import { useController } from "react-hook-form";
import { z } from "zod";
import { FormInput } from "@/ui/components/form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { customerBankAccountSchema } from "@/ui/lib/schemas/shared";
import { createTranslation } from "@/ui/lib/translation";

type CustomerBankAccountFieldsProps = {
  control: any;
  t: (key: string) => string;
  locale?: string;
  translationLocale?: string;
  namePrefix?: string;
  compact?: boolean;
};

export const customerBankAccountsFormSchema = z.array(customerBankAccountSchema).optional();

const customerBankAccountFieldTranslations = {
  bg: {
    "Bank Account": "Банкова сметка",
    "Account Type": "Тип сметка",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Американска вътрешна",
    "UK domestic": "Британска вътрешна",
    "Account Number": "Номер на сметка",
    "Routing Number": "Маршрутен номер",
    "Sort Code": "Sort code",
    Other: "Друго",
  },
  cs: {
    "Bank Account": "Bankovní účet",
    "Account Type": "Typ účtu",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Domácí USA",
    "UK domestic": "Domácí UK",
    "Account Number": "Číslo účtu",
    "Routing Number": "Směrovací číslo",
    "Sort Code": "Sort code",
    Other: "Jiné",
  },
  de: {
    "Bank Account": "Bankkonto",
    "Account Type": "Kontotyp",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "US-Inland",
    "UK domestic": "UK-Inland",
    "Account Number": "Kontonummer",
    "Routing Number": "Routing-Nummer",
    "Sort Code": "Bankleitzahl",
    Other: "Andere",
  },
  en: {
    "Bank Account": "Bank Account",
    "Account Type": "Account Type",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "US domestic",
    "UK domestic": "UK domestic",
    "Account Number": "Account Number",
    "Routing Number": "Routing Number",
    "Sort Code": "Sort Code",
    Other: "Other",
  },
  es: {
    "Bank Account": "Cuenta bancaria",
    "Account Type": "Tipo de cuenta",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Doméstica de EE. UU.",
    "UK domestic": "Doméstica del Reino Unido",
    "Account Number": "Número de cuenta",
    "Routing Number": "Número de ruta",
    "Sort Code": "Sort code",
    Other: "Otro",
  },
  et: {
    "Bank Account": "Pangakonto",
    "Account Type": "Konto tüüp",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "USA riigisisene",
    "UK domestic": "UK riigisisene",
    "Account Number": "Konto number",
    "Routing Number": "Routing number",
    "Sort Code": "Sort code",
    Other: "Muu",
  },
  fi: {
    "Bank Account": "Pankkitili",
    "Account Type": "Tilin tyyppi",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Yhdysvaltain kotimainen",
    "UK domestic": "Yhdistyneen kuningaskunnan kotimainen",
    "Account Number": "Tilinumero",
    "Routing Number": "Reititysnumero",
    "Sort Code": "Sort code",
    Other: "Muu",
  },
  fr: {
    "Bank Account": "Compte bancaire",
    "Account Type": "Type de compte",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "National États-Unis",
    "UK domestic": "National Royaume-Uni",
    "Account Number": "Numéro de compte",
    "Routing Number": "Numéro d'acheminement",
    "Sort Code": "Sort code",
    Other: "Autre",
  },
  hr: {
    "Bank Account": "Bankovni račun",
    "Account Type": "Vrsta računa",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Domaći SAD",
    "UK domestic": "Domaći UK",
    "Account Number": "Broj računa",
    "Routing Number": "Routing broj",
    "Sort Code": "Sort code",
    Other: "Ostalo",
  },
  is: {
    "Bank Account": "Bankareikningur",
    "Account Type": "Tegund reiknings",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Innanlands í Bandaríkjunum",
    "UK domestic": "Innanlands í Bretlandi",
    "Account Number": "Reikningsnúmer",
    "Routing Number": "Leiðarnúmer",
    "Sort Code": "Flokkunarkóði",
    Other: "Annað",
  },
  it: {
    "Bank Account": "Conto bancario",
    "Account Type": "Tipo di conto",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Domestico USA",
    "UK domestic": "Domestico Regno Unito",
    "Account Number": "Numero di conto",
    "Routing Number": "Routing number",
    "Sort Code": "Sort code",
    Other: "Altro",
  },
  nb: {
    "Bank Account": "Bankkonto",
    "Account Type": "Kontotype",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Innenlands USA",
    "UK domestic": "Innenlands UK",
    "Account Number": "Kontonummer",
    "Routing Number": "Routingnummer",
    "Sort Code": "Sort code",
    Other: "Annet",
  },
  nl: {
    "Bank Account": "Bankrekening",
    "Account Type": "Rekeningtype",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Binnenlands VS",
    "UK domestic": "Binnenlands VK",
    "Account Number": "Rekeningnummer",
    "Routing Number": "Routingnummer",
    "Sort Code": "Sort code",
    Other: "Overig",
  },
  pl: {
    "Bank Account": "Konto bankowe",
    "Account Type": "Typ konta",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Krajowy USA",
    "UK domestic": "Krajowy UK",
    "Account Number": "Numer konta",
    "Routing Number": "Numer rozliczeniowy",
    "Sort Code": "Sort code",
    Other: "Inne",
  },
  pt: {
    "Bank Account": "Conta bancária",
    "Account Type": "Tipo de conta",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Doméstica dos EUA",
    "UK domestic": "Doméstica do Reino Unido",
    "Account Number": "Número da conta",
    "Routing Number": "Número de routing",
    "Sort Code": "Sort code",
    Other: "Outro",
  },
  sk: {
    "Bank Account": "Bankový účet",
    "Account Type": "Typ účtu",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Domáci USA",
    "UK domestic": "Domáci UK",
    "Account Number": "Číslo účtu",
    "Routing Number": "Smerovacie číslo",
    "Sort Code": "Sort code",
    Other: "Iné",
  },
  sl: {
    "Bank Account": "Bančni račun",
    "Account Type": "Vrsta računa",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Ameriški domači",
    "UK domestic": "Britanski domači",
    "Account Number": "Številka računa",
    "Routing Number": "Routing številka",
    "Sort Code": "Sort code",
    Other: "Drugo",
  },
  sv: {
    "Bank Account": "Bankkonto",
    "Account Type": "Kontotyp",
    BIC: "BIC",
    IBAN: "IBAN",
    "US domestic": "Inrikes USA",
    "UK domestic": "Inrikes Storbritannien",
    "Account Number": "Kontonummer",
    "Routing Number": "Clearingnummer",
    "Sort Code": "Sort code",
    Other: "Annat",
  },
} as const;

export function normalizeCustomerBankAccounts<T extends { bank_accounts?: unknown }>(values: T): T {
  const bankAccounts = Array.isArray(values.bank_accounts) ? values.bank_accounts : [];
  const cleanedBankAccounts = bankAccounts
    .filter((account): account is Record<string, unknown> => !!account && typeof account === "object")
    .map(
      (account): Record<string, unknown> => ({
        ...account,
        type: account.type || "iban",
      }),
    )
    .filter((account) =>
      [
        account.name,
        account.bank_name,
        account.iban,
        account.account_number,
        account.bic,
        account.routing_number,
        account.sort_code,
      ].some((value) => typeof value === "string" && value.trim().length > 0),
    );

  return {
    ...values,
    ...(cleanedBankAccounts.length > 0 ? { bank_accounts: cleanedBankAccounts } : { bank_accounts: undefined }),
  };
}

export function CustomerBankAccountFields({
  control,
  t,
  locale = "en",
  translationLocale,
  namePrefix = "bank_accounts",
  compact,
}: CustomerBankAccountFieldsProps) {
  const translate = createTranslation({
    t,
    locale,
    translationLocale,
    translations: customerBankAccountFieldTranslations,
  });
  const fieldName = (name: string) => `${namePrefix}.0.${name}`;
  const bankAccountTypeController = useController({
    control,
    name: fieldName("type"),
  });
  const bankAccountType = bankAccountTypeController.field.value ?? "iban";

  return (
    <div className={compact ? "space-y-3" : "space-y-3 pt-1"}>
      <FormField
        control={control}
        name={fieldName("type")}
        render={({ field }) => (
          <FormItem>
            {!compact && <FormLabel>{translate("Bank Account")}</FormLabel>}
            <Select value={field.value ?? "iban"} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder={translate("Account Type")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="iban">{translate("IBAN")}</SelectItem>
                <SelectItem value="us_domestic">{translate("US domestic")}</SelectItem>
                <SelectItem value="uk_domestic">{translate("UK domestic")}</SelectItem>
                <SelectItem value="other">{translate("Other")}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {bankAccountType === "iban" ? (
        <>
          <FormInput control={control} name={fieldName("bic")} placeholder={translate("BIC")} label="" />
          <FormInput control={control} name={fieldName("iban")} placeholder={translate("IBAN")} label="" />
        </>
      ) : (
        <>
          <FormInput
            control={control}
            name={fieldName("account_number")}
            placeholder={translate("Account Number")}
            label=""
          />
          {bankAccountType === "us_domestic" && (
            <FormInput
              control={control}
              name={fieldName("routing_number")}
              placeholder={translate("Routing Number")}
              label=""
            />
          )}
          {bankAccountType === "uk_domestic" && (
            <FormInput control={control} name={fieldName("sort_code")} placeholder={translate("Sort Code")} label="" />
          )}
          {bankAccountType === "other" && (
            <FormInput control={control} name={fieldName("bic")} placeholder={translate("BIC")} label="" />
          )}
        </>
      )}
    </div>
  );
}
