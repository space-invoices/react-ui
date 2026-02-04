import { Button } from "@/ui/components/ui/button";
import ButtonLoader from "../../button-loader";

type SettingsFooterProps = {
  isPending: boolean;
  isDirty: boolean;
  label: string;
};

export function SettingsFooter({ isPending, isDirty, label }: SettingsFooterProps) {
  return (
    <Button type="submit" className="cursor-pointer px-8" disabled={isPending || !isDirty}>
      {isPending ? <ButtonLoader /> : label}
    </Button>
  );
}
