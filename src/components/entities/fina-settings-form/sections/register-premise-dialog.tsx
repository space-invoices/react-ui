import { zodResolver } from "@hookform/resolvers/zod";
import type { FC } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useRegisterFinaMovablePremise, useRegisterFinaRealEstatePremise } from "../fina-settings.hooks";

// Manual Zod schemas (SDK not regenerated for FINA yet)
const realEstatePremiseSchema = z.object({
  premise_id: z.string().min(1, "Premise ID is required").max(20),
  real_estate: z.object({
    cadastral_municipality: z.string().min(1, "Cadastral municipality is required"),
    land_registry_number: z.string().min(1, "Land registry number is required"),
    building_number: z.string().optional().default(""),
    sub_building_number: z.string().optional().default(""),
    street: z.string().optional().default(""),
    house_number: z.string().optional().default(""),
    house_number_additional: z.string().optional().default(""),
    settlement: z.string().optional().default(""),
    city: z.string().optional().default(""),
    postal_code: z.string().optional().default(""),
  }),
});

const movablePremiseSchema = z.object({
  premise_id: z.string().min(1, "Premise ID is required").max(20),
  movable_premise: z.object({
    type: z.enum(["vehicle", "market_stall", "other"]),
  }),
});

type RealEstatePremiseForm = z.infer<typeof realEstatePremiseSchema>;
type MovablePremiseForm = z.infer<typeof movablePremiseSchema>;

interface RegisterFinaPremiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: any;
  type: "real-estate" | "movable";
  t: (key: string) => string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export const RegisterFinaPremiseDialog: FC<RegisterFinaPremiseDialogProps> = ({
  open,
  onOpenChange,
  entity,
  type,
  t,
  onSuccess,
  onError,
}) => {
  const isRealEstate = type === "real-estate";

  const realEstateForm = useForm<RealEstatePremiseForm>({
    resolver: zodResolver(realEstatePremiseSchema) as Resolver<RealEstatePremiseForm>,
    defaultValues: {
      premise_id: "",
      real_estate: {
        cadastral_municipality: "",
        land_registry_number: "",
        building_number: "",
        sub_building_number: "",
        street: "",
        house_number: "",
        house_number_additional: "",
        settlement: "",
        city: "",
        postal_code: "",
      },
    },
  });

  const movableForm = useForm<MovablePremiseForm>({
    resolver: zodResolver(movablePremiseSchema),
    defaultValues: {
      premise_id: "",
      movable_premise: {
        type: "vehicle",
      },
    },
  });

  const { mutate: registerRealEstate, isPending: isRealEstatePending } = useRegisterFinaRealEstatePremise({
    onSuccess: () => {
      realEstateForm.reset();
      onSuccess?.();
    },
    onError,
  });

  const { mutate: registerMovable, isPending: isMovablePending } = useRegisterFinaMovablePremise({
    onSuccess: () => {
      movableForm.reset();
      onSuccess?.();
    },
    onError,
  });

  const handleRealEstateSubmit = (data: RealEstatePremiseForm) => {
    registerRealEstate({
      entityId: entity.id,
      data,
    });
  };

  const handleMovableSubmit = (data: MovablePremiseForm) => {
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
              "Register a new business premise with FINA. After registration, you'll need to add at least one electronic device.",
            )}
          </DialogDescription>
        </DialogHeader>

        {isRealEstate ? (
          <Form {...realEstateForm}>
            <form onSubmit={realEstateForm.handleSubmit(handleRealEstateSubmit as any)} className="space-y-4">
              {/* Premise ID */}
              <FormField
                control={realEstateForm.control as any}
                name="premise_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Premise ID")}</FormLabel>
                    <FormControl>
                      <Input placeholder="PP1" {...field} />
                    </FormControl>
                    <FormDescription>{t("Unique identifier for this premise (e.g., PP1, OFFICE1)")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cadastral Municipality */}
              <FormField
                control={realEstateForm.control as any}
                name="real_estate.cadastral_municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Cadastral Municipality")} *</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Land Registry Number */}
              <FormField
                control={realEstateForm.control as any}
                name="real_estate.land_registry_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Land Registry Number")} *</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
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
                      <FormLabel>{t("Building Number")}</FormLabel>
                      <FormControl>
                        <Input placeholder="1" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={realEstateForm.control as any}
                  name="real_estate.sub_building_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Sub-Building Number")}</FormLabel>
                      <FormControl>
                        <Input placeholder="A" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address */}
              <FormField
                control={realEstateForm.control as any}
                name="real_estate.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Street")}</FormLabel>
                    <FormControl>
                      <Input placeholder="Ilica" {...field} value={field.value || ""} />
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
                      <FormLabel>{t("House Number")}</FormLabel>
                      <FormControl>
                        <Input placeholder="22" {...field} value={field.value || ""} />
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
                      <FormLabel>{t("House Number Additional")}</FormLabel>
                      <FormControl>
                        <Input placeholder="A" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={realEstateForm.control as any}
                name="real_estate.settlement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Settlement")}</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={realEstateForm.control as any}
                  name="real_estate.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("City")}</FormLabel>
                      <FormControl>
                        <Input placeholder="Zagreb" {...field} value={field.value || ""} />
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
                      <FormLabel>{t("Postal Code")}</FormLabel>
                      <FormControl>
                        <Input placeholder="10000" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={isPending} className="cursor-pointer">
                  {isPending ? t("Registering...") : t("Register Premise")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...movableForm}>
            <form onSubmit={movableForm.handleSubmit(handleMovableSubmit)} className="space-y-4">
              {/* Premise ID */}
              <FormField
                control={movableForm.control}
                name="premise_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Premise ID")}</FormLabel>
                    <FormControl>
                      <Input placeholder="PP1" {...field} />
                    </FormControl>
                    <FormDescription>{t("Unique identifier for this premise (e.g., PP1, OFFICE1)")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Premise Type */}
              <FormField
                control={movableForm.control}
                name="movable_premise.type"
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
                        <SelectItem value="vehicle">{t("Vehicle")}</SelectItem>
                        <SelectItem value="market_stall">{t("Market Stall")}</SelectItem>
                        <SelectItem value="other">{t("Other Movable")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("Type of movable business premise")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={isPending} className="cursor-pointer">
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
