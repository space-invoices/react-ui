import type { ComponentTranslationProps } from "@/ui/lib/translation";
import TaxSelectField from "../../taxes/tax-select-field";

type DocumentAddItemTaxRateFieldProps = {
  index: number;
  taxIndex: number;
  control: any;
  entityId: string;
  onRemove: () => void;
  onAddNewTax?: () => void;
  showLabel?: boolean;
} & ComponentTranslationProps;

export default function DocumentAddItemTaxRateField({
  index,
  taxIndex,
  control,
  entityId,
  onRemove,
  onAddNewTax,
  showLabel = true,
  t: translateFn,
  namespace,
  locale,
  translationLocale,
}: DocumentAddItemTaxRateFieldProps) {
  return (
    <TaxSelectField
      name={`items.${index}.taxes.${taxIndex}.tax_id`}
      control={control}
      entityId={entityId}
      onRemove={onRemove}
      onAddNewTax={onAddNewTax}
      showLabel={showLabel}
      t={translateFn}
      namespace={namespace}
      locale={locale}
      translationLocale={translationLocale}
    />
  );
}
