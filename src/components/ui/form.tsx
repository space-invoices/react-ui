"use client"

import * as React from "react"
import type * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  type ControllerProps,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  FormProvider,
  type UseFormReturn,
  useFormContext,
} from "react-hook-form"

import { cn } from "@/ui/lib/utils"
import { Label } from "@/ui/components/ui/label"
import { getValidationLocale, translateZodValidationMessage } from "@/ui/lib/zod-validation-message"

const ValidationLocaleContext = React.createContext<string | undefined>(undefined)

type FormProps = UseFormReturn<any> & {
  children: React.ReactNode
  locale?: string
}

function Form({ locale, ...props }: FormProps) {
  const { watch, getFieldState, clearErrors, trigger } = props

  React.useEffect(() => {
    const subscription = watch((_value, { name, type }) => {
      if (!name || type !== "change") return

      const fieldState = getFieldState(name)
      if (!fieldState.error) return

      // Manual/setError flows should clear immediately once the user edits the field again.
      if (fieldState.error.type === "manual" || fieldState.error.type === "submit" || fieldState.error.type === "eslog") {
        clearErrors(name)
        return
      }

      void trigger(name)
    })

    return () => subscription.unsubscribe()
  }, [watch, getFieldState, clearErrors, trigger])

  return (
    <ValidationLocaleContext.Provider value={locale}>
      <FormProvider {...props} />
    </ValidationLocaleContext.Provider>
  )
}

function scrollFormToFirstError(form: HTMLFormElement | null) {
  if (!form) return

  const scrollToInvalidField = () => {
    const errorTarget = form.querySelector<HTMLElement>('[data-form-error-summary="true"], [aria-invalid="true"]')
    if (!errorTarget) return

    errorTarget.scrollIntoView({ behavior: "smooth", block: "center" })

    if (errorTarget.matches('[aria-invalid="true"]') && typeof errorTarget.focus === "function") {
      errorTarget.focus({ preventScroll: true })
    }
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(scrollToInvalidField)
  })
}

function collectFormErrorPaths(errors: FieldErrors<FieldValues>, prefix = ""): string[] {
  const paths: string[] = []

  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue

    const nextPrefix = prefix ? `${prefix}.${key}` : key
    if (key === "root") {
      paths.push(nextPrefix)
      continue
    }

    if (typeof value === "object") {
      if ("message" in value || "type" in value || "ref" in value) {
        paths.push(nextPrefix)
      }

      paths.push(...collectFormErrorPaths(value as FieldErrors<FieldValues>, nextPrefix))
    }
  }

  return [...new Set(paths)]
}

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("gap-2 flex flex-col", className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive text-sm font-medium", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-xs", className)}
      {...props}
    />
  )
}

function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const validationLocale = React.useContext(ValidationLocaleContext)
  const { error, formMessageId } = useFormField()
  const body = error
    ? translateZodValidationMessage(String(error?.message ?? ""), getValidationLocale(validationLocale))
    : children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-xs font-normal", className)}
      {...props}
    >
      {body}
    </p>
  )
}

function FormRoot({ className, ...props }: React.ComponentProps<"form">) {
  const { formState } = useFormContext()
  const formRef = React.useRef<HTMLFormElement>(null)
  const lastSubmitCountRef = React.useRef(0)
  const hasScrolledForSubmitRef = React.useRef(false)
  const errorPaths = React.useMemo(() => collectFormErrorPaths(formState.errors), [formState.errors])

  React.useEffect(() => {
    if (formState.submitCount !== lastSubmitCountRef.current) {
      lastSubmitCountRef.current = formState.submitCount
      hasScrolledForSubmitRef.current = false
    }

    if (!formState.isSubmitted || errorPaths.length === 0 || hasScrolledForSubmitRef.current) {
      return
    }

    hasScrolledForSubmitRef.current = true
    scrollFormToFirstError(formRef.current)
  }, [errorPaths.length, formState.isSubmitted, formState.submitCount])

  return (
    <form
      ref={formRef}
      data-slot="form-root"
      className={className}
      {...props}
    />
  )
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormRoot,
  scrollFormToFirstError,
}
