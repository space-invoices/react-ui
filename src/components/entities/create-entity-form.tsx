import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateEntityRequest, Entity } from "@spaceinvoices/js-sdk";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { FormInput } from "@/ui/components/form";
import { Button } from "@/ui/components/ui/button";
import { Form } from "@/ui/components/ui/form";
import { type CreateEntitySchema, createEntitySchema } from "@/ui/generated/schemas";

import ButtonLoader from "../button-loader";
import { useCreateEntity } from "./entities.hooks";

export type CreateEntityFormProps = {
  t?: (key: string) => string;
  namespace?: string;
  accountId?: string;
  environment?: string;
  defaultName?: string;
  defaultValues?: Partial<CreateEntitySchema>;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
};

const defaultTranslate = (text: string) => text;

export function CreateEntityForm({
  t = defaultTranslate,
  namespace = "",
  accountId,
  environment,
  defaultName,
  defaultValues: extraDefaults,
  onSuccess,
  onError,
}: CreateEntityFormProps) {
  const translate = (key: string) => t(namespace ? `${namespace}.${key}` : key);

  const form = useForm<CreateEntitySchema>({
    resolver: zodResolver(createEntitySchema) as Resolver<CreateEntitySchema>,
    defaultValues: {
      name: defaultName || "",
      address: "",
      address_2: "",
      post_code: "",
      city: "",
      state: "",
      country: "",
      tax_number: "",
      company_number: "",
      environment: environment as "live" | "sandbox" | undefined,
      ...extraDefaults,
      // defaultName takes priority over extraDefaults.name if provided
      ...(defaultName ? { name: defaultName } : {}),
    },
  });

  // Wrap onSuccess to reset form only after successful mutation
  const handleSuccess = (data: Entity) => {
    form.reset();
    onSuccess?.(data);
  };

  // Use the createEntity mutation hook
  const { mutate: createEntity, isPending } = useCreateEntity({
    entityId: null,
    accountId,
    onSuccess: handleSuccess,
    onError: (error, _variables, _context) => {
      onError?.(error);
    },
  });

  const onSubmit = async (values: CreateEntitySchema) => {
    try {
      // Zod validation ensures required fields are present before this is called
      // The type cast is safe because React Hook Form's DeepPartial doesn't reflect runtime validation
      createEntity(values as CreateEntityRequest);
    } catch (e) {
      onError?.(e);
      form.setError("root", {
        type: "submit",
        message: "Failed to create entity",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
        <FormInput control={form.control} name="name" label={translate("Name")} placeholder="Name" required />

        <FormInput control={form.control} name="country" label="Country" placeholder="Country" required />

        <FormInput control={form.control} name="address" label="Address" placeholder="Address" />

        <FormInput control={form.control} name="address_2" label="Address 2" placeholder="Address 2" />

        <div className="grid grid-cols-2 gap-4">
          <FormInput control={form.control} name="post_code" label="Post code" placeholder="Post code" />
          <FormInput control={form.control} name="city" label="City" placeholder="City" />
        </div>

        <FormInput control={form.control} name="state" label="State" placeholder="State" />

        <FormInput control={form.control} name="tax_number" label="Tax number" placeholder="Tax number" />

        <FormInput control={form.control} name="company_number" label="Company number" placeholder="Company number" />

        <Button type="submit" className="w-full cursor-pointer" disabled={isPending} aria-busy={isPending}>
          {isPending ? <ButtonLoader /> : "Create"}
        </Button>
      </form>
    </Form>
  );
}
