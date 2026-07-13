import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { Braces } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/ui/tooltip";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import type { BusinessUnitOption } from "../../documents/create/business-unit-utils";
import { useUpdateEntity } from "../entities.hooks";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import et from "./locales/et";
import fi from "./locales/fi";
import fr from "./locales/fr";
import hr from "./locales/hr";
import is from "./locales/is";
import it from "./locales/it";
import nb from "./locales/nb";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sk from "./locales/sk";
import sl from "./locales/sl";
import sv from "./locales/sv";

const translations = { bg, cs, de, en, es, et, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } as const;
const DOCUMENT_FORMAT_TYPES = ["invoice", "estimate", "credit_note", "advance_invoice", "delivery_note"] as const;
const DEFAULT_MAIN_FORMAT = "{yyyy}-{nnnnn}";
const DEFAULT_UNIT_FORMAT = "{yyyy}-{u}-{nnnnn}";
const MAX_DOC_NUMBER_DIGITS = 9;
const MAX_DOC_UNIT_DIGITS = 9;
const TOKEN_PATTERN = /\{[^{}]+\}/g;
const VALID_TOKEN_PATTERN = /^\{(?:yyyy|yy|n+|u+)\}$/;

const firstNumberSchema = z.union([z.number().int().positive(), z.null()]).optional();

const numberFormatSettingsSchema = z
  .object({
    invoice_format: z.union([z.string(), z.null()]).optional(),
    estimate_format: z.union([z.string(), z.null()]).optional(),
    credit_note_format: z.union([z.string(), z.null()]).optional(),
    advance_invoice_format: z.union([z.string(), z.null()]).optional(),
    delivery_note_format: z.union([z.string(), z.null()]).optional(),
    unit_invoice_format: z.union([z.string(), z.null()]).optional(),
    unit_estimate_format: z.union([z.string(), z.null()]).optional(),
    unit_credit_note_format: z.union([z.string(), z.null()]).optional(),
    unit_advance_invoice_format: z.union([z.string(), z.null()]).optional(),
    unit_delivery_note_format: z.union([z.string(), z.null()]).optional(),
    invoice_start: firstNumberSchema,
    estimate_start: firstNumberSchema,
    credit_note_start: firstNumberSchema,
    advance_invoice_start: firstNumberSchema,
    delivery_note_start: firstNumberSchema,
    unit_sequence_starts: z.record(z.string(), z.record(z.string(), firstNumberSchema)).optional(),
  })
  .superRefine((values, ctx) => {
    for (const type of DOCUMENT_FORMAT_TYPES) {
      const mainName = formatFieldName(type);
      const unitName = unitFormatFieldName(type);
      const mainError = getNumberFormatValidationError(values[mainName], false);
      const unitError = getNumberFormatValidationError(values[unitName], true);

      if (mainError) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: mainError, path: [mainName] });
      }
      if (unitError) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: unitError, path: [unitName] });
      }
    }
  });

type NumberFormatSettingsSchema = z.infer<typeof numberFormatSettingsSchema>;
type FormatType = (typeof DOCUMENT_FORMAT_TYPES)[number];
type FormatFieldName = ReturnType<typeof formatFieldName> | ReturnType<typeof unitFormatFieldName>;

const NUMBER_FORMAT_TOKENS = [
  { token: "{yyyy}", label: "Full year", description: "2026" },
  { token: "{yy}", label: "Short year", description: "26" },
  { token: "{nnnnn}", label: "Sequence number", description: "00001" },
  { token: "{u}", label: "Business unit index", description: "1" },
] as const;

export type NumberFormatSettingsFormProps = {
  entity: Entity;
  hasBusinessUnits?: boolean;
  businessUnits?: BusinessUnitOption[];
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
} & ComponentTranslationProps;

function getFormatPreview(format: string | null | undefined, start = 1): string {
  if (!format) return "";

  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);
  const exampleUnitIndex = 2;
  const exampleSequence = Math.max(1, Math.trunc(start || 1));

  let preview = format;
  preview = preview.replace("{yyyy}", year.toString());
  preview = preview.replace("{yy}", shortYear);
  preview = preview.replace(/\{u+\}/g, (match) => {
    const digits = match.length - 2;
    return String(exampleUnitIndex).padStart(digits, "0");
  });
  preview = preview.replace(/\{n+\}/g, (match) => {
    const digits = match.length - 2;
    return String(exampleSequence).padStart(digits, "0");
  });

  return preview;
}

function formatFieldName(type: FormatType) {
  return `${type}_format` as const;
}

function unitFormatFieldName(type: FormatType) {
  return `unit_${type}_format` as const;
}

function startFieldName(type: FormatType) {
  return `${type}_start` as const;
}

function unitStartFieldName(type: FormatType, businessUnitId: string) {
  return `unit_sequence_starts.${type}.${businessUnitId}` as const;
}

function normalizeFormat(value: string | null | undefined) {
  return value?.trim() || "";
}

function getNumberFormatValidationError(format: string | null | undefined, allowBusinessUnitToken: boolean) {
  const trimmed = format?.trim();
  if (!trimmed) return null;

  const tokens = trimmed.match(TOKEN_PATTERN) ?? [];
  const invalidToken = tokens.find((token) => !VALID_TOKEN_PATTERN.test(token));
  if (invalidToken) return `Unsupported numbering token ${invalidToken}.`;
  if (/[{}]/.test(trimmed.replace(TOKEN_PATTERN, ""))) {
    return "Number format contains malformed token braces.";
  }

  const sequenceTokens = tokens.filter((token) => /^\{n+\}$/.test(token));
  if (sequenceTokens.length === 0) return "Add a sequence token such as {nnnnn}.";
  if (sequenceTokens.length > 1) return "Use only one sequence token.";
  if (sequenceTokens.some((token) => token.length - 2 > MAX_DOC_NUMBER_DIGITS)) {
    return `Use at most ${MAX_DOC_NUMBER_DIGITS} digits in the sequence token.`;
  }

  const yearTokens = tokens.filter((token) => token === "{yyyy}" || token === "{yy}");
  if (yearTokens.length > 1) return "Use only one year token.";

  const unitTokens = tokens.filter((token) => /^\{u+\}$/.test(token));
  if (unitTokens.length > 1) return "Use only one business unit token.";
  if (unitTokens.length > 0 && !allowBusinessUnitToken) {
    return "Main document formats cannot use business unit tokens.";
  }
  if (unitTokens.some((token) => token.length - 2 > MAX_DOC_UNIT_DIGITS)) {
    return `Use at most ${MAX_DOC_UNIT_DIGITS} digits in the business unit token.`;
  }

  return null;
}

function getDocumentLabel(type: FormatType, t: (value: string) => string) {
  switch (type) {
    case "invoice":
      return t("Invoice");
    case "estimate":
      return t("Estimate");
    case "credit_note":
      return t("Credit Note");
    case "advance_invoice":
      return t("Advance Invoice");
    case "delivery_note":
      return t("Delivery Note");
  }
}

function NumberFormatTokenInsertButton({
  allowBusinessUnitToken,
  onInsert,
  t,
}: {
  allowBusinessUnitToken: boolean;
  onInsert: (token: string) => void;
  t: (value: string) => string;
}) {
  const tokens = NUMBER_FORMAT_TOKENS.filter((token) => allowBusinessUnitToken || token.token !== "{u}");

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon">
                <Braces className="size-4" />
                <span className="sr-only">{t("Insert token")}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t("Insert token")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-muted-foreground text-xs">{t("Number tokens")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {tokens.map((token) => (
            <DropdownMenuItem key={token.token} onClick={() => onInsert(token.token)} className="cursor-pointer">
              <code className="mr-2 shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-xs">{token.token}</code>
              <div className="min-w-0">
                <p className="text-xs">{t(token.label)}</p>
                <p className="text-muted-foreground text-xs">{t(token.description)}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NumberFormatSettingsForm({
  entity,
  hasBusinessUnits = false,
  businessUnits = [],
  t: translateProp,
  namespace,
  locale,
  translationLocale,
  onSuccess,
  onError,
}: NumberFormatSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });

  const currentSettings = (entity.settings as any) || {};
  const numberFormats = currentSettings.number_formats || {};
  const unitNumberFormats = currentSettings.unit_number_formats || {};
  const numberSequenceStarts = currentSettings.number_sequence_starts || {};
  const unitNumberSequenceStarts = currentSettings.unit_number_sequence_starts || {};
  const inputRefs = useRef<Partial<Record<FormatFieldName, HTMLInputElement | null>>>({});
  const activeBusinessUnits = useMemo(
    () => businessUnits.filter((unit) => !unit.deleted_at && unit.is_active !== false),
    [businessUnits],
  );
  const getUnitSequenceStartDefault = useCallback(
    (type: FormatType, businessUnitId: string) => unitNumberSequenceStarts?.[type]?.[businessUnitId] ?? 1,
    [unitNumberSequenceStarts],
  );

  const form = useForm<NumberFormatSettingsSchema>({
    resolver: zodResolver(numberFormatSettingsSchema),
    defaultValues: {
      invoice_format: numberFormats.invoice || DEFAULT_MAIN_FORMAT,
      estimate_format: numberFormats.estimate || DEFAULT_MAIN_FORMAT,
      credit_note_format: numberFormats.credit_note || DEFAULT_MAIN_FORMAT,
      advance_invoice_format: numberFormats.advance_invoice || DEFAULT_MAIN_FORMAT,
      delivery_note_format: numberFormats.delivery_note || DEFAULT_MAIN_FORMAT,
      unit_invoice_format: unitNumberFormats.invoice || DEFAULT_UNIT_FORMAT,
      unit_estimate_format: unitNumberFormats.estimate || DEFAULT_UNIT_FORMAT,
      unit_credit_note_format: unitNumberFormats.credit_note || DEFAULT_UNIT_FORMAT,
      unit_advance_invoice_format: unitNumberFormats.advance_invoice || DEFAULT_UNIT_FORMAT,
      unit_delivery_note_format: unitNumberFormats.delivery_note || DEFAULT_UNIT_FORMAT,
      invoice_start: numberSequenceStarts.invoice || 1,
      estimate_start: numberSequenceStarts.estimate || 1,
      credit_note_start: numberSequenceStarts.credit_note || 1,
      advance_invoice_start: numberSequenceStarts.advance_invoice || 1,
      delivery_note_start: numberSequenceStarts.delivery_note || 1,
      unit_sequence_starts: Object.fromEntries(
        DOCUMENT_FORMAT_TYPES.map((type) => [
          type,
          Object.fromEntries(activeBusinessUnits.map((unit) => [unit.id, getUnitSequenceStartDefault(type, unit.id)])),
        ]),
      ),
    },
  });

  const { mutate: updateEntity, isPending } = useUpdateEntity({
    entityId: entity.id,
    onSuccess: (data) => {
      form.reset(form.getValues());
      onSuccess?.(data);
    },
    onError,
  });

  useFormFooterRegistration({
    formId: "number-format-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save Settings"),
  });

  const watchedValues = form.watch();

  useEffect(() => {
    for (const type of DOCUMENT_FORMAT_TYPES) {
      for (const unit of activeBusinessUnits) {
        const name = unitStartFieldName(type, unit.id) as any;
        const currentValue = form.getValues(name);
        if (currentValue == null) {
          form.setValue(name, getUnitSequenceStartDefault(type, unit.id), {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          });
        }
      }
    }
  }, [activeBusinessUnits, form, getUnitSequenceStartDefault]);

  const insertFormatToken = (fieldName: FormatFieldName, token: string) => {
    const input = inputRefs.current[fieldName];
    const value = form.getValues(fieldName) || "";
    const cursor = input?.selectionStart ?? value.length;
    const nextValue = value.slice(0, cursor) + token + value.slice(cursor);

    form.setValue(fieldName, nextValue, { shouldDirty: true, shouldTouch: true, shouldValidate: true });

    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(cursor + token.length, cursor + token.length);
    });
  };

  const overlapConflicts = useMemo(() => {
    if (!hasBusinessUnits) return [] as FormatType[];

    return DOCUMENT_FORMAT_TYPES.filter((type) => {
      const main = normalizeFormat(watchedValues[formatFieldName(type)]);
      const unit = normalizeFormat(watchedValues[unitFormatFieldName(type)]);
      return !!main && !!unit && main === unit;
    });
  }, [hasBusinessUnits, watchedValues]);

  const onSubmit = (values: NumberFormatSettingsSchema) => {
    form.clearErrors();

    if (hasBusinessUnits) {
      let hasConflict = false;

      for (const type of DOCUMENT_FORMAT_TYPES) {
        const main = normalizeFormat(values[formatFieldName(type)]);
        const unit = normalizeFormat(values[unitFormatFieldName(type)]);

        if (main && unit && main === unit) {
          hasConflict = true;
          form.setError(unitFormatFieldName(type), {
            type: "validate",
            message: t("Business-unit numbering must differ from the main document format."),
          });
        }
      }

      if (hasConflict) {
        return;
      }
    }

    const updatePayload: any = {
      // Send only keys this surface owns — see useUpdateEntity's settings contract
      settings: {
        number_formats: {
          invoice: values.invoice_format || null,
          estimate: values.estimate_format || null,
          credit_note: values.credit_note_format || null,
          advance_invoice: values.advance_invoice_format || null,
          delivery_note: values.delivery_note_format || null,
        },
        number_sequence_starts: {
          invoice: values.invoice_start || null,
          estimate: values.estimate_start || null,
          credit_note: values.credit_note_start || null,
          advance_invoice: values.advance_invoice_start || null,
          delivery_note: values.delivery_note_start || null,
        },
        // Only the active units' starts; the server merges this key per
        // document type and business unit, preserving other units' entries
        unit_number_sequence_starts: Object.fromEntries(
          DOCUMENT_FORMAT_TYPES.map((type) => [
            type,
            Object.fromEntries(
              activeBusinessUnits.map((unit) => [
                unit.id,
                values.unit_sequence_starts?.[type]?.[unit.id] ?? getUnitSequenceStartDefault(type, unit.id),
              ]),
            ),
          ]),
        ),
        ...(hasBusinessUnits
          ? {
              unit_number_formats: {
                invoice: values.unit_invoice_format || null,
                estimate: values.unit_estimate_format || null,
                credit_note: values.unit_credit_note_format || null,
                advance_invoice: values.unit_advance_invoice_format || null,
                delivery_note: values.unit_delivery_note_format || null,
              },
            }
          : {}),
      },
    };

    updateEntity({ id: entity.id, data: updatePayload });
  };

  return (
    <Form {...form}>
      <form id="number-format-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="invoice" className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            {DOCUMENT_FORMAT_TYPES.map((type) => (
              <TabsTrigger key={type} value={type} className="cursor-pointer">
                {getDocumentLabel(type, t)}
              </TabsTrigger>
            ))}
          </TabsList>

          {DOCUMENT_FORMAT_TYPES.map((type) => {
            const mainName = formatFieldName(type);
            const unitName = unitFormatFieldName(type);
            const startName = startFieldName(type);
            const mainValue = watchedValues[mainName];
            const unitValue = watchedValues[unitName];
            const mainStartValue = watchedValues[startName] ?? 1;
            const unitPreviewStartValue =
              activeBusinessUnits.length > 0
                ? (watchedValues.unit_sequence_starts?.[type]?.[activeBusinessUnits[0]!.id] ?? 1)
                : 1;
            const hasConflict = overlapConflicts.includes(type);

            return (
              <TabsContent key={type} value={type} className="mt-4 space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm">{t("Main documents")}</h3>
                    <p className="text-muted-foreground text-xs">{t("Used when no business unit is selected.")}</p>
                  </div>

                  <FormField
                    control={form.control}
                    name={mainName}
                    render={({ field }) => (
                      <FormItem className="max-w-sm">
                        <FormLabel className="font-medium text-sm">{t("Number Format")}</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              {...field}
                              ref={(node) => {
                                field.ref(node);
                                inputRefs.current[mainName] = node;
                              }}
                              value={field.value || ""}
                              aria-label={t("Number Format")}
                              placeholder={DEFAULT_MAIN_FORMAT}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                            <NumberFormatTokenInsertButton
                              allowBusinessUnitToken={false}
                              onInsert={(token) => insertFormatToken(mainName, token)}
                              t={t}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          {t("Preview")}:{" "}
                          <span className="font-mono">{getFormatPreview(mainValue, mainStartValue)}</span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={startName}
                    render={({ field }) => (
                      <FormItem className="max-w-sm">
                        <FormLabel className="font-medium text-sm">{t("First number to use")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          {t("Can only move future numbering forward. Existing documents are not renumbered.")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {hasBusinessUnits && (
                  <div className="space-y-4 border-t pt-6">
                    <div>
                      <h3 className="font-medium text-sm">{t("Business-unit documents")}</h3>
                      <p className="text-muted-foreground text-xs">
                        {t(
                          "Used when a business unit is selected. Default formats should include {u} to stay distinct.",
                        )}
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name={unitName}
                      render={({ field }) => (
                        <FormItem className="max-w-sm">
                          <FormLabel className="font-medium text-sm">{t("Number Format")}</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                {...field}
                                ref={(node) => {
                                  field.ref(node);
                                  inputRefs.current[unitName] = node;
                                }}
                                value={field.value || ""}
                                aria-label={t("Number Format")}
                                placeholder={DEFAULT_UNIT_FORMAT}
                                onChange={(e) => field.onChange(e.target.value || null)}
                              />
                              <NumberFormatTokenInsertButton
                                allowBusinessUnitToken
                                onInsert={(token) => insertFormatToken(unitName, token)}
                                t={t}
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            {t("Preview")}:{" "}
                            <span className="font-mono">{getFormatPreview(unitValue, unitPreviewStartValue)}</span>
                            <br />
                            {t("If this format matches the main document format, saving is blocked.")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {hasConflict && (
                      <p className="text-destructive text-xs">
                        {t("Business-unit numbering must differ from the main document format.")}
                      </p>
                    )}

                    {activeBusinessUnits.length > 0 && (
                      <div className="grid gap-3 pt-1">
                        {activeBusinessUnits.map((unit) => (
                          <FormField
                            key={unit.id}
                            control={form.control}
                            name={unitStartFieldName(type, unit.id) as any}
                            render={({ field }) => (
                              <FormItem className="max-w-sm space-y-2">
                                <div>
                                  <p className="font-medium text-sm">{unit.name}</p>
                                  <FormLabel className="text-muted-foreground text-xs">
                                    {t("First number to use for this unit")}
                                  </FormLabel>
                                </div>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={field.value ?? ""}
                                    aria-label={`${unit.name} ${t("first number to use")}`}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  {t(
                                    "Only affects this business unit for the selected document type. Existing documents are not renumbered.",
                                  )}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </form>
    </Form>
  );
}
