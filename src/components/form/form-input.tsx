import { forwardRef } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { FormattedInput } from "@/ui/lib/formatted-input";

type FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  control: any;
  name: TName;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "email" | "password" | "tel" | "url";
  disabled?: boolean;
  autoComplete?: string;
  disableAutofill?: boolean;
  onChange?: (value: any) => void;
  className?: string;
  required?: boolean;
  /** Short helper text under the field, for formats the label cannot explain. */
  description?: string;
  /** Keyboard hint for touch devices; the field stays a text input, so pasting keeps working. */
  inputMode?: React.ComponentProps<"input">["inputMode"];
  /**
   * Spell the entered text the way the form will submit it, as the user types it.
   * Rejected and half-typed input must come back unchanged: this is presentation,
   * and the field's own validation still decides whether the value is acceptable.
   */
  formatter?: (value: string) => string;
};

const FormInputComponent = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  {
    control,
    name,
    label,
    placeholder,
    type = "text",
    disabled,
    autoComplete,
    disableAutofill,
    onChange,
    className,
    required = false,
    description,
    inputMode,
    formatter,
  }: FormInputProps<TFieldValues, TName>,
  ref: React.Ref<HTMLInputElement>,
) => {
  const autofillSuppressionProps = disableAutofill
    ? {
        autoComplete: autoComplete ?? "off",
        "data-1p-ignore": "true",
        "data-bwignore": "true",
        "data-form-type": "other",
        "data-lpignore": "true",
      }
    : { autoComplete };

  const applyFieldValue = (field: any, rawValue: string) => {
    if (type === "number") {
      const value = Number(rawValue);
      field.onChange(value);
      onChange?.(value);
    } else {
      // Keep the controlled input clearable while preserving existing external empty-value semantics.
      const value = rawValue === "" ? undefined : rawValue;
      field.onChange(rawValue);
      onChange?.(value);
    }
  };

  const handleKeyDown = (field: any, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type === "number") return;
    if (e.key !== "Backspace" || (!e.metaKey && !e.ctrlKey)) return;

    e.preventDefault();
    applyFieldValue(field, "");
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <FormattedInput
              type={type}
              placeholder={placeholder}
              disabled={field.disabled ?? disabled}
              {...autofillSuppressionProps}
              name={field.name}
              onBlur={field.onBlur}
              ref={ref}
              value={field.value ?? ""}
              inputMode={inputMode}
              formatter={formatter}
              onValueChange={(value) => applyFieldValue(field, value)}
              onKeyDown={(e) => handleKeyDown(field, e)}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export const FormInput = forwardRef(FormInputComponent) as <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  props: FormInputProps<TFieldValues, TName> & { ref?: React.Ref<HTMLInputElement> },
) => ReturnType<typeof FormInputComponent>;
