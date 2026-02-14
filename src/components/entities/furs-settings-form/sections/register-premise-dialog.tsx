import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import type { FC } from "react";
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

interface RegisterPremiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Entity;
  type: "real-estate" | "movable";
  t: (key: string) => string;
  existingPremiseNames?: string[];
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export const RegisterPremiseDialog: FC<RegisterPremiseDialogProps> = ({
  open,
  onOpenChange,
  entity,
  type,
  t,
  existingPremiseNames = [],
  onSuccess,
  onError,
}) => {
  const isRealEstate = type === "real-estate";

  // Real Estate Form
  const realEstateForm = useForm<RealEstatePremiseForm>({
    resolver: zodResolver(realEstatePremiseSchema) as Resolver<RealEstatePremiseForm>,
    defaultValues: {
      business_premise_name: "",
      real_estate: {
        cadastral_number: "",
        building_number: "0",
        building_section: "0",
        community: "",
        city: "",
        street: "",
        house_number: "",
        house_number_additional: "",
        postal_code: "",
      },
    },
  });

  // Movable Form
  const movableForm = useForm<MovablePremiseForm>({
    resolver: zodResolver(movablePremiseSchema) as Resolver<MovablePremiseForm>,
    defaultValues: {
      business_premise_name: "",
      movable_premise: {
        premise_type: "A",
      },
    },
  });

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
      realEstateForm.reset();
      onSuccess?.();
    },
    onError: (error) => handleMutationError(error, realEstateForm),
  });

  const { mutate: registerMovable, isPending: isMovablePending } = useRegisterMovablePremise({
    onSuccess: () => {
      movableForm.reset();
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
                    <FormLabel>{t("Premise Name")}</FormLabel>
                    <FormControl>
                      <Input placeholder="P1" {...field} />
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
                      <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="123" {...field} />
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
                        <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="456" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">{t("Numeric, use 0 if not applicable")}</FormDescription>
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
                        <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="1" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">{t("Numeric, use 0 if not applicable")}</FormDescription>
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
                      <Input placeholder="Ljubljana" {...field} />
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
                      <Input placeholder="Dunajska cesta" {...field} />
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
                        <Input placeholder="22" {...field} />
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
                        <Input placeholder="A" {...field} value={field.value || ""} />
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
                        <Input placeholder="Ljubljana" {...field} />
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
                        <Input placeholder="1000" {...field} />
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
                <Button type="submit" disabled={isPending}>
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
                    <FormLabel>{t("Premise Name")}</FormLabel>
                    <FormControl>
                      <Input placeholder="P1" {...field} />
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
                    <FormLabel>{t("Premise Type")}</FormLabel>
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
                <Button type="submit" disabled={isPending}>
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
