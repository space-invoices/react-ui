import { useState } from "react";
import type { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";

/**
 * Customer data structure used in document forms.
 * All fields are optional to support partial customer data.
 */
export type CustomerData = {
  name?: string | null;
  address?: string | null;
  address_2?: string | null;
  post_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  tax_number?: string | null;
};

/**
 * Form schema requirements for document customer handling.
 * Documents must have customer_id and customer fields.
 */
export type DocumentFormWithCustomer = FieldValues & {
  customer_id?: string | null;
  customer?: CustomerData | null;
};

/**
 * Type-safe setValue wrapper for document forms.
 */
function _setFormValue<TForm extends FieldValues>(
  form: UseFormReturn<TForm>,
  name: Path<TForm>,
  value: PathValue<TForm, Path<TForm>>,
) {
  form.setValue(name, value);
}

/**
 * Shared hook for managing customer selection and form state in document forms.
 * Used by invoices, estimates, credit notes, and advance invoices.
 *
 * @example
 * ```tsx
 * const {
 *   originalCustomer,
 *   showCustomerForm,
 *   shouldFocusName,
 *   selectedCustomerId,
 *   handleCustomerSelect,
 *   handleCustomerClear,
 * } = useDocumentCustomerForm(form);
 * ```
 */
export function useDocumentCustomerForm<TForm extends DocumentFormWithCustomer>(form: UseFormReturn<TForm>) {
  // Initialize states based on form's default values (for duplication scenarios)
  const formDefaults = form.formState.defaultValues;
  const initialCustomerId = formDefaults?.customer_id as string | undefined;
  const initialCustomer = formDefaults?.customer as CustomerData | undefined;
  const hasInitialCustomer = !!(initialCustomerId || initialCustomer?.name);

  const [originalCustomer, setOriginalCustomer] = useState<CustomerData | null>(
    hasInitialCustomer && initialCustomer ? initialCustomer : null,
  );
  const [showCustomerForm, setShowCustomerForm] = useState(hasInitialCustomer);
  const [shouldFocusName, setShouldFocusName] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(initialCustomerId);

  // Type-safe setValue that works with the generic form type
  const setValue = <K extends Path<TForm>>(name: K, value: PathValue<TForm, K>) => {
    form.setValue(name, value);
  };

  const handleCustomerSelect = (customerId: string, customer: CustomerData) => {
    const isNewCustomer = !customerId || customerId === "";

    // Helper to convert empty/null to undefined for optional fields,
    // but keep empty string for required fields (name) so form shows them
    const toFormValue = (value: string | null | undefined, isRequired = false): string | undefined => {
      if (value === null || value === undefined || value === "") {
        return isRequired ? "" : undefined;
      }
      return value;
    };

    if (isNewCustomer) {
      // New customer - clear customer_id and set customer data
      setValue("customer_id" as Path<TForm>, undefined as PathValue<TForm, Path<TForm>>);
      setValue(
        "customer" as Path<TForm>,
        {
          name: toFormValue(customer.name, true),
          address: toFormValue(customer.address),
          address_2: toFormValue(customer.address_2),
          post_code: toFormValue(customer.post_code),
          city: toFormValue(customer.city),
          state: toFormValue(customer.state),
          country: toFormValue(customer.country),
          tax_number: toFormValue(customer.tax_number),
        } as PathValue<TForm, Path<TForm>>,
      );
      setOriginalCustomer(null);
      setSelectedCustomerId(undefined);
      setShouldFocusName(!customer.name);
    } else {
      // Existing customer - set customer_id and populate fields
      setValue("customer_id" as Path<TForm>, customerId as PathValue<TForm, Path<TForm>>);

      const customerData: CustomerData = {
        name: toFormValue(customer.name, true),
        address: toFormValue(customer.address),
        address_2: toFormValue(customer.address_2),
        post_code: toFormValue(customer.post_code),
        city: toFormValue(customer.city),
        state: toFormValue(customer.state),
        country: toFormValue(customer.country),
        tax_number: toFormValue(customer.tax_number),
      };

      setValue("customer" as Path<TForm>, customerData as PathValue<TForm, Path<TForm>>);
      setOriginalCustomer(customerData);
      setSelectedCustomerId(customerId);
      setShouldFocusName(false);
    }

    setShowCustomerForm(true);
  };

  const handleCustomerClear = () => {
    setValue("customer_id" as Path<TForm>, undefined as PathValue<TForm, Path<TForm>>);
    // Clear customer object entirely - use undefined for optional fields
    setValue(
      "customer" as Path<TForm>,
      {
        name: "",
        address: undefined,
        address_2: undefined,
        post_code: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
        tax_number: undefined,
      } as PathValue<TForm, Path<TForm>>,
    );
    setOriginalCustomer(null);
    setSelectedCustomerId(undefined);
    setShouldFocusName(false);
    setShowCustomerForm(false);
  };

  return {
    originalCustomer,
    showCustomerForm,
    shouldFocusName,
    selectedCustomerId,
    /** Initial customer name from form defaults (for duplication display) */
    initialCustomerName: initialCustomer?.name ?? undefined,
    handleCustomerSelect,
    handleCustomerClear,
  };
}
