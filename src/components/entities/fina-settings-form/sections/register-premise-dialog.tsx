import { zodResolver } from "@hookform/resolvers/zod";
import type { FC } from "react";
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
import { useCreateFinaPremise } from "../fina-settings.hooks";

const createPremiseSchema = z.object({
  premise_id: z
    .string()
    .min(1, "Premise ID is required")
    .max(20)
    .regex(/^[0-9a-zA-Z]{1,20}$/, "Must be alphanumeric, 1-20 characters"),
});

type CreatePremiseForm = z.infer<typeof createPremiseSchema>;

interface RegisterFinaPremiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: any;
  t: (key: string) => string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export const RegisterFinaPremiseDialog: FC<RegisterFinaPremiseDialogProps> = ({
  open,
  onOpenChange,
  entity,
  t,
  onSuccess,
  onError,
}) => {
  const form = useForm<CreatePremiseForm>({
    resolver: zodResolver(createPremiseSchema),
    defaultValues: {
      premise_id: "",
    },
  });

  const { mutate: createPremise, isPending } = useCreateFinaPremise({
    onSuccess: () => {
      form.reset();
      onSuccess?.();
    },
    onError,
  });

  const handleSubmit = (data: CreatePremiseForm) => {
    createPremise({
      entityId: entity.id,
      data,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Add Business Premise")}</DialogTitle>
          <DialogDescription>
            {t(
              "Enter the premise ID that you registered on ePorezna. After adding, you'll need to register at least one electronic device.",
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
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
                {isPending ? t("Adding...") : t("Add Premise")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
