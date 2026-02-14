import type { FinaFiscalizationResponse, FursFiscalizationResponse } from "@spaceinvoices/js-sdk";
import { AlertCircle, CheckCircle2, Clock, Loader2, MinusCircle, RefreshCw, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/ui/components/ui/alert";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import de from "../../documents/view/locales/de";
import es from "../../documents/view/locales/es";
import fr from "../../documents/view/locales/fr";
import hr from "../../documents/view/locales/hr";
import it from "../../documents/view/locales/it";
import nl from "../../documents/view/locales/nl";
import pl from "../../documents/view/locales/pl";
import pt from "../../documents/view/locales/pt";
import sl from "../../documents/view/locales/sl";

const translations = { de, es, fr, hr, it, nl, pl, pt, sl } as const;

type FiscalizationStatus = "pending" | "success" | "failed" | "skipped";
type FiscalizationData = (Exclude<FursFiscalizationResponse, null> | Exclude<FinaFiscalizationResponse, null>) & {
  status: FiscalizationStatus;
};

interface FiscalizationStatusCardProps extends ComponentTranslationProps {
  fiscalizationType: "furs" | "fina";
  fiscalizationData: FiscalizationData | null | undefined;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function FiscalizationStatusCard({
  fiscalizationType,
  fiscalizationData,
  onRetry,
  isRetrying,
  t: translateFn,
  namespace,
  locale,
}: FiscalizationStatusCardProps) {
  const t = createTranslation({
    t: translateFn,
    namespace,
    locale,
    translations,
  });

  if (!fiscalizationData) {
    return null;
  }

  const label = fiscalizationType === "furs" ? "FURS" : "FINA";

  const getStatusBadge = () => {
    switch (fiscalizationData.status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("Fiscalized")}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <Clock className="mr-1 h-3 w-3" />
            {t("Pending")}
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            {t("Failed")}
          </Badge>
        );
      case "skipped":
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
            <MinusCircle className="mr-1 h-3 w-3" />
            {t("Skipped")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{t("Fiscalization")}</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-muted-foreground text-sm">
          {label} &middot;{" "}
          {fiscalizationData.fiscalized_at && new Date(fiscalizationData.fiscalized_at).toLocaleString(locale)}
        </div>

        {fiscalizationData.status === "failed" && fiscalizationData.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{fiscalizationData.error}</AlertDescription>
          </Alert>
        )}

        {fiscalizationData.status === "skipped" && (fiscalizationData as any).data?.reason && (
          <div className="text-muted-foreground text-sm">{(fiscalizationData as any).data.reason}</div>
        )}

        {fiscalizationData.status === "failed" && onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {t("Retry fiscalization")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
