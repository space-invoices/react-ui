import { forwardRef } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";

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
  onChange?: (value: any) => void;
  className?: string;
  required?: boolean;
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
    onChange,
    className,
    required = false,
  }: FormInputProps<TFieldValues, TName>,
  ref: React.Ref<HTMLInputElement>,
) => {
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

  const handleFieldChange = (field: any, e: React.ChangeEvent<HTMLInputElement>) => {
    applyFieldValue(field, e.target.value);
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
            <Input
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete={autoComplete}
              {...field}
              ref={ref}
              value={field.value ?? ""}
              onChange={(e) => handleFieldChange(field, e)}
              onKeyDown={(e) => handleKeyDown(field, e)}
            />
          </FormControl>
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
