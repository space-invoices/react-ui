import { useEffect, useState } from "react";
import type { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";

/**
 * Customer data structure used in document forms.
 * All fields are optional to support partial customer data.
 */
export type CustomerData = {
  name?: string | null;
  email?: string | null;
  address?: string | null;
  address_2?: string | null;
  post_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  country_code?: string | null;
  tax_number?: string | null;
  company_number?: string | null;
  bank_accounts?: Array<Record<string, unknown>> | null;
  is_end_consumer?: boolean | null;
  ujp?: {
    receiver_name?: string | null;
    receiver_identifier?: string | null;
    receiver_agent?: string | null;
    receiver_mailbox?: string | null;
  } | null;
  e_invoicing?: {
    buyer_reference?: string | null;
  } | null;
};

/**
 * Form schema requirements for document customer handling.
 * Documents must have customer_id and customer fields.
 */
export type DocumentFormWithCustomer = FieldValues & {
  customer_id?: string | null;
  customer?: CustomerData | null;
};

function normalizeCustomerSnapshot(customer: CustomerData | null | undefined): Record<string, unknown> | null {
  if (!customer) return null;

  const normalizeValue = (value: unknown): unknown => {
    if (value === undefined || value === null || value === "") return undefined;
    if (Array.isArray(value)) {
      const normalizedArray = value.map(normalizeValue).filter((entry) => entry !== undefined);
      return normalizedArray.length > 0 ? normalizedArray : undefined;
    }
    if (typeof value === "object") {
      const normalizedObject = Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .map(([key, nestedValue]) => [key, normalizeValue(nestedValue)] as const)
          .filter(([, nestedValue]) => nestedValue !== undefined),
      );
      return Object.keys(normalizedObject).length > 0 ? normalizedObject : undefined;
    }
    return value;
  };

  return (normalizeValue(customer) as Record<string, unknown> | undefined) ?? null;
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
  const defaultCustomerId = form.formState.defaultValues?.customer_id as string | undefined;
  const defaultCustomer = form.formState.defaultValues?.customer as CustomerData | undefined;
  const defaultCustomerSignature = JSON.stringify(normalizeCustomerSnapshot(defaultCustomer));

  const [originalCustomer, setOriginalCustomer] = useState<CustomerData | null>(
    hasInitialCustomer && initialCustomer ? initialCustomer : null,
  );
  const [showCustomerForm, setShowCustomerForm] = useState(hasInitialCustomer);
  const [shouldFocusName, setShouldFocusName] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(initialCustomerId);
  const watchedCustomer = useWatch({ control: form.control, name: "customer" as Path<TForm> }) as
    | CustomerData
    | null
    | undefined;

  useEffect(() => {
    const defaultCustomerSnapshot = JSON.parse(defaultCustomerSignature) as CustomerData | null;
    const hasDefaultCustomer = !!(defaultCustomerId || defaultCustomerSnapshot?.name);

    setOriginalCustomer(hasDefaultCustomer && defaultCustomerSnapshot ? defaultCustomerSnapshot : null);
    setSelectedCustomerId(defaultCustomerId);
    setShowCustomerForm(hasDefaultCustomer);
    setShouldFocusName(false);
  }, [defaultCustomerId, defaultCustomerSignature]);

  useEffect(() => {
    if (!selectedCustomerId || !originalCustomer || !watchedCustomer) return;
    if (watchedCustomer.name === originalCustomer.name) {
      return;
    }

    form.setValue("customer_id" as Path<TForm>, undefined as PathValue<TForm, Path<TForm>>, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setSelectedCustomerId(undefined);
    setOriginalCustomer(null);
  }, [form, originalCustomer, selectedCustomerId, watchedCustomer]);

  // Type-safe setValue that works with the generic form type
  const setValue = <K extends Path<TForm>>(name: K, value: PathValue<TForm, K>) => {
    form.setValue(name, value, { shouldDirty: true, shouldTouch: true });
  };

  const handleCustomerSelect = (customerId: string, customer: CustomerData) => {
    const isNewCustomer = !customerId || customerId === "";
    const customerFieldPaths = [
      "customer.name",
      "customer.address",
      "customer.address_2",
      "customer.post_code",
      "customer.city",
      "customer.state",
      "customer.country",
      "customer.country_code",
      "customer.tax_number",
      "customer.company_number",
      "customer.bank_accounts",
      "customer.is_end_consumer",
      "customer.ujp.receiver_name",
      "customer.ujp.receiver_identifier",
      "customer.ujp.receiver_agent",
      "customer.ujp.receiver_mailbox",
      "customer.e_invoicing.buyer_reference",
    ] as Path<TForm>[];
    const setCustomerFieldValue = <K extends Path<TForm>>(name: K, value: PathValue<TForm, K>) => {
      form.setValue(name, value, { shouldDirty: true, shouldTouch: true });
    };

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
      setCustomerFieldValue(
        "customer.name" as Path<TForm>,
        toFormValue(customer.name, true) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.address" as Path<TForm>,
        toFormValue(customer.address) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.address_2" as Path<TForm>,
        toFormValue(customer.address_2) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.post_code" as Path<TForm>,
        toFormValue(customer.post_code) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.city" as Path<TForm>,
        toFormValue(customer.city) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.state" as Path<TForm>,
        toFormValue(customer.state) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.country" as Path<TForm>,
        toFormValue(customer.country) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.country_code" as Path<TForm>,
        toFormValue(customer.country_code) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.tax_number" as Path<TForm>,
        toFormValue(customer.tax_number) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.company_number" as Path<TForm>,
        toFormValue(customer.company_number) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.bank_accounts" as Path<TForm>,
        (customer.bank_accounts ?? undefined) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.is_end_consumer" as Path<TForm>,
        (customer.is_end_consumer ?? undefined) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.ujp.receiver_name" as Path<TForm>,
        toFormValue(customer.ujp?.receiver_name) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.ujp.receiver_identifier" as Path<TForm>,
        toFormValue(customer.ujp?.receiver_identifier) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.ujp.receiver_agent" as Path<TForm>,
        toFormValue(customer.ujp?.receiver_agent) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.ujp.receiver_mailbox" as Path<TForm>,
        toFormValue(customer.ujp?.receiver_mailbox) as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.e_invoicing.buyer_reference" as Path<TForm>,
        toFormValue(customer.e_invoicing?.buyer_reference) as PathValue<TForm, Path<TForm>>,
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
        country_code: toFormValue(customer.country_code),
        tax_number: toFormValue(customer.tax_number),
        company_number: toFormValue(customer.company_number),
        bank_accounts: customer.bank_accounts ?? undefined,
        is_end_consumer: customer.is_end_consumer ?? undefined,
        ujp: {
          receiver_name: toFormValue(customer.ujp?.receiver_name),
          receiver_identifier: toFormValue(customer.ujp?.receiver_identifier),
          receiver_agent: toFormValue(customer.ujp?.receiver_agent),
          receiver_mailbox: toFormValue(customer.ujp?.receiver_mailbox),
        },
        e_invoicing: {
          buyer_reference: toFormValue(customer.e_invoicing?.buyer_reference),
        },
      };

      setCustomerFieldValue("customer.name" as Path<TForm>, customerData.name as PathValue<TForm, Path<TForm>>);
      setCustomerFieldValue("customer.address" as Path<TForm>, customerData.address as PathValue<TForm, Path<TForm>>);
      setCustomerFieldValue(
        "customer.address_2" as Path<TForm>,
        customerData.address_2 as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.post_code" as Path<TForm>,
        customerData.post_code as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue("customer.city" as Path<TForm>, customerData.city as PathValue<TForm, Path<TForm>>);
      setCustomerFieldValue("customer.state" as Path<TForm>, customerData.state as PathValue<TForm, Path<TForm>>);
      setCustomerFieldValue("customer.country" as Path<TForm>, customerData.country as PathValue<TForm, Path<TForm>>);
      setCustomerFieldValue(
        "customer.country_code" as Path<TForm>,
        customerData.country_code as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.tax_number" as Path<TForm>,
        customerData.tax_number as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.company_number" as Path<TForm>,
        customerData.company_number as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.bank_accounts" as Path<TForm>,
        customerData.bank_accounts as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.is_end_consumer" as Path<TForm>,
        customerData.is_end_consumer as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.ujp.receiver_name" as Path<TForm>,
        customerData.ujp?.receiver_name as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.ujp.receiver_identifier" as Path<TForm>,
        customerData.ujp?.receiver_identifier as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.ujp.receiver_agent" as Path<TForm>,
        customerData.ujp?.receiver_agent as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.ujp.receiver_mailbox" as Path<TForm>,
        customerData.ujp?.receiver_mailbox as PathValue<TForm, Path<TForm>>,
      );
      setCustomerFieldValue(
        "customer.e_invoicing.buyer_reference" as Path<TForm>,
        customerData.e_invoicing?.buyer_reference as PathValue<TForm, Path<TForm>>,
      );
      setOriginalCustomer(customerData);
      setSelectedCustomerId(customerId);
      setShouldFocusName(false);
    }

    form.clearErrors(["customer_id" as Path<TForm>, ...customerFieldPaths]);
    if (form.formState.isSubmitted) {
      void form.trigger();
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
        country_code: undefined,
        tax_number: undefined,
        company_number: undefined,
        bank_accounts: undefined,
        is_end_consumer: true,
        ujp: undefined,
        e_invoicing: undefined,
      } as PathValue<TForm, Path<TForm>>,
    );
    setOriginalCustomer(null);
    setSelectedCustomerId(undefined);
    setShouldFocusName(false);
    setShowCustomerForm(false);
  };

  const handleCustomerEdit = (options: { detachCustomer?: boolean } = {}) => {
    if (options.detachCustomer) {
      form.setValue("customer_id" as Path<TForm>, undefined as PathValue<TForm, Path<TForm>>, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setOriginalCustomer(null);
      setSelectedCustomerId(undefined);
    }
  };

  return {
    originalCustomer,
    showCustomerForm,
    setShowCustomerForm,
    shouldFocusName,
    selectedCustomerId,
    /** Initial customer name from form defaults (for duplication display) */
    initialCustomerName: (form.formState.defaultValues?.customer as CustomerData | undefined)?.name ?? undefined,
    handleCustomerSelect,
    handleCustomerClear,
    handleCustomerEdit,
  };
}
