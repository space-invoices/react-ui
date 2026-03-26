/**
 * Shared document recipient section for invoices and estimates
 * Handles customer selection and inline customer form
 */
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useController } from "react-hook-form";
import { FormInput } from "@/ui/components/form";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
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
  /** Show end consumer (B2C) toggle next to tax number (Croatian entity + domestic transaction) */
  showEndConsumerToggle?: boolean;
  t: (key: string) => string;
  locale?: string;
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
  showEndConsumerToggle,
  t,
  locale = "en",
}: DocumentRecipientSectionProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  const endConsumerController = useController({
    control: control as any,
    name: "customer.is_end_consumer" as any,
  });
  const customerNameController = useController({
    control: control as any,
    name: "customer.name" as any,
  });
  const customerNameError = customerNameController.fieldState.error?.message;

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
        <Label className={cn(customerNameError && "text-destructive")}>{t("Name")}</Label>
        <CustomerAutocomplete
          entityId={entityId}
          value={selectedCustomerId}
          committedDisplayName={customerNameController.field.value ?? initialCustomerName}
          onValueChange={onCustomerSelect}
          onCommitInlineName={(nextName) => customerNameController.field.onChange(nextName)}
          onClear={onCustomerClear}
          placeholder="Search or create customer..."
          initialDisplayName={initialCustomerName}
          inputTestId="document-customer-input"
          inputDataDemo="marketing-demo-customer-input"
          inputRef={nameInputRef}
          commitOnBlurMode={showCustomerForm ? "update-inline" : "create"}
          t={t}
          locale={locale}
          ariaInvalid={!!customerNameError}
        />
        {customerNameError && <p className="font-normal text-destructive text-xs">{customerNameError}</p>}
      </div>

      {showCustomerForm && (
        <>
          <FormInput control={control} name="customer.address" placeholder={t("Address")} label="" />

          <FormInput control={control} name="customer.address_2" placeholder={t("Address 2")} label="" />

          <div className="grid grid-cols-2 gap-4">
            <FormInput control={control} name="customer.post_code" placeholder={t("Post Code")} label="" />
            <FormInput control={control} name="customer.city" placeholder={t("City")} label="" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput control={control} name="customer.state" placeholder={t("State")} label="" />
            <FormInput control={control} name="customer.country" placeholder={t("Country")} label="" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <FormInput control={control} name="customer.tax_number" placeholder={t("Tax Number")} label="" />
            </div>
            {showEndConsumerToggle && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <Checkbox
                  id="is_end_consumer"
                  checked={endConsumerController.field.value === true}
                  onCheckedChange={(checked) => endConsumerController.field.onChange(checked === true)}
                />
                <Label
                  htmlFor="is_end_consumer"
                  className="cursor-pointer whitespace-nowrap font-normal text-muted-foreground text-sm"
                >
                  {t("End consumer")}
                </Label>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
