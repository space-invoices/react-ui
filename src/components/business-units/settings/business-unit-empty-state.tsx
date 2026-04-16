import { Building2, Plus } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";

type BusinessUnitEmptyStateProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  onCreate: () => void;
};

export function BusinessUnitEmptyState({ t, onCreate }: BusinessUnitEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <CardTitle>{t("Create your first unit / brand")}</CardTitle>
        <CardDescription>
          {t(
            "Use units / brands for alternate branding, addresses, defaults, and integration-specific document behavior.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("Create first unit / brand")}
        </Button>
      </CardContent>
    </Card>
  );
}
