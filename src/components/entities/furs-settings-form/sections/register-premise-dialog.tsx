import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { type FC, useCallback, useEffect } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { registerFursMovablePremiseSchema, registerFursRealEstatePremiseSchema } from "@/ui/generated/schemas";
import { useRegisterMovablePremise, useRegisterRealEstatePremise } from "../furs-settings.hooks";

// Use auto-generated schemas from OpenAPI spec
// These are automatically kept in sync with the API
const realEstatePremiseSchema = registerFursRealEstatePremiseSchema;
const movablePremiseSchema = registerFursMovablePremiseSchema;

type RealEstatePremiseForm = z.infer<typeof realEstatePremiseSchema>;
type MovablePremiseForm = z.infer<typeof movablePremiseSchema>;

type ExistingPremiseSummary = {
  business_premise_name: string;
  type?: string;
};

function getNextSuggestedName(prefix: string, count: number) {
  return `${prefix}${count + 1}`;
}

function parseEntityAddress(address?: string | null) {
  const value = address?.trim();
  if (!value) {
    return {
      street: "",
      house_number: "",
      house_number_additional: "",
    };
  }

  const match = value.match(/^(.*?)(?:\s+(\d+)([A-Za-z]*))$/);
  if (!match) {
    return {
      street: value,
      house_number: "",
      house_number_additional: "",
    };
  }

  return {
    street: match[1]?.trim() || value,
    house_number: match[2] || "",
    house_number_additional: match[3] || "",
  };
}

interface RegisterPremiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Entity;
  type: "real-estate" | "movable";
  t: (key: string) => string;
  premises?: ExistingPremiseSummary[];
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export const RegisterPremiseDialog: FC<RegisterPremiseDialogProps> = ({
  open,
  onOpenChange,
  entity,
  type,
  t,
  premises = [],
  onSuccess,
  onError,
}) => {
  const isRealEstate = type === "real-estate";
  const existingPremiseNames = premises.map((premise) => premise.business_premise_name);
  const hasRealEstatePremise = premises.some((premise) => premise.type === "real_estate");

  const buildRealEstateDefaults = useCallback((): RealEstatePremiseForm => {
    const shouldPrefillEntityAddress = !hasRealEstatePremise;
    const parsedAddress = shouldPrefillEntityAddress ? parseEntityAddress(entity.address) : parseEntityAddress();

    return {
      business_premise_name: getNextSuggestedName("P", premises.length),
      real_estate: {
        cadastral_number: "",
        building_number: "",
        building_section: "",
        community: shouldPrefillEntityAddress ? entity.city || "" : "",
        city: shouldPrefillEntityAddress ? entity.city || "" : "",
        street: parsedAddress.street,
        house_number: parsedAddress.house_number,
        house_number_additional: parsedAddress.house_number_additional,
        postal_code: shouldPrefillEntityAddress ? entity.post_code || "" : "",
      },
    };
  }, [entity.address, entity.city, entity.post_code, hasRealEstatePremise, premises.length]);

  const buildMovableDefaults = useCallback(
    (): MovablePremiseForm => ({
      business_premise_name: getNextSuggestedName("P", premises.length),
      movable_premise: {
        premise_type: "A",
      },
    }),
    [premises.length],
  );

  // Real Estate Form
  const realEstateForm = useForm<RealEstatePremiseForm>({
    resolver: zodResolver(realEstatePremiseSchema) as Resolver<RealEstatePremiseForm>,
    defaultValues: buildRealEstateDefaults(),
  });

  // Movable Form
  const movableForm = useForm<MovablePremiseForm>({
    resolver: zodResolver(movablePremiseSchema) as Resolver<MovablePremiseForm>,
    defaultValues: buildMovableDefaults(),
  });

  useEffect(() => {
    if (!open) return;

    if (isRealEstate) {
      realEstateForm.reset(buildRealEstateDefaults());
      return;
    }

    movableForm.reset(buildMovableDefaults());
  }, [buildMovableDefaults, buildRealEstateDefaults, isRealEstate, open, realEstateForm, movableForm]);

  const handleMutationError = (error: unknown, form: typeof realEstateForm | typeof movableForm) => {
    const err = error as { status?: number; data?: { message?: string } };
    if (err?.status === 409 && err?.data?.message) {
      form.setError("business_premise_name", { message: err.data.message });
    } else {
      onError?.(error);
    }
  };

  const { mutate: registerRealEstate, isPending: isRealEstatePending } = useRegisterRealEstatePremise({
    onSuccess: () => {
      realEstateForm.reset(buildRealEstateDefaults());
      onSuccess?.();
    },
    onError: (error) => handleMutationError(error, realEstateForm),
  });

  const { mutate: registerMovable, isPending: isMovablePending } = useRegisterMovablePremise({
    onSuccess: () => {
      movableForm.reset(buildMovableDefaults());
      onSuccess?.();
    },
    onError: (error) => handleMutationError(error, movableForm),
  });

  const isDuplicateName = (name: string) => existingPremiseNames.some((n) => n.toUpperCase() === name.toUpperCase());

  const handleRealEstateSubmit = (data: RealEstatePremiseForm) => {
    if (isDuplicateName(data.business_premise_name)) {
      realEstateForm.setError("business_premise_name", {
        message: t("A premise with this name already exists"),
      });
      return;
    }
    registerRealEstate({
      entityId: entity.id,
      data,
    });
  };

  const handleMovableSubmit = (data: MovablePremiseForm) => {
    if (isDuplicateName(data.business_premise_name)) {
      movableForm.setError("business_premise_name", {
        message: t("A premise with this name already exists"),
      });
      return;
    }
    registerMovable({
      entityId: entity.id,
      data,
    });
  };

  const isPending = isRealEstatePending || isMovablePending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isRealEstate ? t("Register Real Estate Premise") : t("Register Movable Premise")}</DialogTitle>
          <DialogDescription>
            {t(
              "Register a new business premise with FURS. After registration, you'll need to manually add at least one electronic device for this premise.",
            )}
          </DialogDescription>
        </DialogHeader>

        {isRealEstate ? (
          <Form {...realEstateForm}>
            <form
              onSubmit={(e) => {
                e.stopPropagation();
                realEstateForm.handleSubmit(handleRealEstateSubmit as any)(e);
              }}
              className="space-y-4"
            >
              {/* Premise Name */}
              <FormField
                control={realEstateForm.control as any}
                name="business_premise_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Premise Name")} *</FormLabel>
                    <FormControl>
                      <Input placeholder="P1" {...field} data-testid="furs-real-estate-premise-name" />
                    </FormControl>
                    <FormDescription>{t("Unique identifier for this premise (e.g., P1, P2)")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Property Information */}
              <FormField
                control={realEstateForm.control as any}
                name="real_estate.cadastral_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Cadastral Number")} *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="123"
                        {...field}
                        data-testid="furs-real-estate-cadastral-number"
                      />
                    </FormControl>
                    <FormDescription>{t("Required by FURS (must be numeric)")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Building Information */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={realEstateForm.control as any}
                  name="real_estate.building_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Building Number")} *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="456"
                          {...field}
                          data-testid="furs-real-estate-building-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={realEstateForm.control as any}
                  name="real_estate.building_section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Building Section")} *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="1"
                          {...field}
                          data-testid="furs-real-estate-building-section"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Community */}
              <FormField
                control={realEstateForm.control as any}
                name="real_estate.community"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Community")} *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ljubljana" {...field} data-testid="furs-real-estate-community" />
                    </FormControl>
                    <FormDescription>{t("Slovenian administrative community (občina) name")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={realEstateForm.control as any}
                name="real_estate.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Street")} *</FormLabel>
                    <FormControl>
                      <Input placeholder="Dunajska cesta" {...field} data-testid="furs-real-estate-street" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={realEstateForm.control as any}
                  name="real_estate.house_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("House Number")} *</FormLabel>
                      <FormControl>
                        <Input placeholder="22" {...field} data-testid="furs-real-estate-house-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={realEstateForm.control as any}
                  name="real_estate.house_number_additional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Additional")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="A"
                          {...field}
                          value={field.value || ""}
                          data-testid="furs-real-estate-house-number-additional"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={realEstateForm.control as any}
                  name="real_estate.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("City")} *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ljubljana" {...field} data-testid="furs-real-estate-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={realEstateForm.control as any}
                  name="real_estate.postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Postal Code")} *</FormLabel>
                      <FormControl>
                        <Input placeholder="1000" {...field} data-testid="furs-real-estate-postal-code" />
                      </FormControl>
                      <FormDescription className="text-xs">{t("Exactly 4 digits")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={isPending} data-testid="furs-register-premise-submit">
                  {isPending ? t("Registering...") : t("Register Premise")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...movableForm}>
            <form
              onSubmit={(e) => {
                e.stopPropagation();
                movableForm.handleSubmit(handleMovableSubmit as any)(e);
              }}
              className="space-y-4"
            >
              {/* Premise Name */}
              <FormField
                control={movableForm.control as any}
                name="business_premise_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Premise Name")} *</FormLabel>
                    <FormControl>
                      <Input placeholder="P1" {...field} data-testid="furs-movable-premise-name" />
                    </FormControl>
                    <FormDescription>{t("Unique identifier for this premise (e.g., P1, P2)")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Premise Type */}
              <FormField
                control={movableForm.control as any}
                name="movable_premise.premise_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Premise Type")} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">{t("A - Vehicle")}</SelectItem>
                        <SelectItem value="B">{t("B - Object at Market/Fair")}</SelectItem>
                        <SelectItem value="C">{t("C - Other Movable")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("Type of movable business premise")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={isPending} data-testid="furs-register-premise-submit">
                  {isPending ? t("Registering...") : t("Register Premise")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
