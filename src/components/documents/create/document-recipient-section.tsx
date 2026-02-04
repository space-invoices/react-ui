/**
 * Shared document recipient section for invoices and estimates
 * Handles customer selection and inline customer form
 */
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { FormInput } from "@/ui/components/form";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";
import { cn } from "@/ui/lib/utils";
import { CustomerAutocomplete } from "../../customers/customer-autocomplete";
import type { AnyControl } from "./form-types";

type DocumentRecipientSectionProps = {
  control: AnyControl;
  entityId: string;

  onCustomerSelect: (customerId: string, customer: any) => void;
  onCustomerClear: () => void;
  showCustomerForm: boolean;
  shouldFocusName: boolean;
  selectedCustomerId?: string;
  /** Initial customer name for display (used when duplicating documents) */
  initialCustomerName?: string;
  t: (key: string) => string;
};

export function DocumentRecipientSection({
  control,
  entityId,
  onCustomerSelect,
  onCustomerClear,
  showCustomerForm,
  shouldFocusName,
  selectedCustomerId,
  initialCustomerName,
  t,
}: DocumentRecipientSectionProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCustomerForm && shouldFocusName) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
    }
  }, [showCustomerForm, shouldFocusName]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-xl">{t("Recipient")}</h2>
        {showCustomerForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCustomerClear}
            className={cn("h-7 cursor-pointer px-2 text-xs")}
          >
            <X className="size-3" />
            {t("Clear")}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("Name")}</Label>
        <CustomerAutocomplete
          entityId={entityId}
          value={selectedCustomerId}
          onValueChange={onCustomerSelect}
          onClear={onCustomerClear}
          placeholder={t("Search or create customer...")}
          initialDisplayName={initialCustomerName}
        />
      </div>

      {showCustomerForm && (
        <>
          <FormInput control={control} name="customer.address" placeholder={t("Address")} label="" ref={nameInputRef} />

          <FormInput control={control} name="customer.address_2" placeholder={t("Address 2")} label="" />

          <div className="grid grid-cols-2 gap-4">
            <FormInput control={control} name="customer.post_code" placeholder={t("Post Code")} label="" />
            <FormInput control={control} name="customer.city" placeholder={t("City")} label="" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput control={control} name="customer.state" placeholder={t("State")} label="" />
            <FormInput control={control} name="customer.country" placeholder={t("Country")} label="" />
          </div>

          <FormInput control={control} name="customer.tax_number" placeholder={t("Tax Number")} label="" />
        </>
      )}
    </div>
  );
}
