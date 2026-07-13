import type { FinaFiscalizationResponse, FursFiscalizationResponse } from "@spaceinvoices/js-sdk";
import { AlertCircle, CheckCircle2, Clock, Loader2, MinusCircle, RefreshCw, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/ui/components/ui/alert";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import bg from "../../documents/view/locales/bg";
import cs from "../../documents/view/locales/cs";
import de from "../../documents/view/locales/de";
import en from "../../documents/view/locales/en";
import es from "../../documents/view/locales/es";
import et from "../../documents/view/locales/et";
import fi from "../../documents/view/locales/fi";
import fr from "../../documents/view/locales/fr";
import hr from "../../documents/view/locales/hr";
import is from "../../documents/view/locales/is";
import it from "../../documents/view/locales/it";
import nb from "../../documents/view/locales/nb";
import nl from "../../documents/view/locales/nl";
import pl from "../../documents/view/locales/pl";
import pt from "../../documents/view/locales/pt";
import sk from "../../documents/view/locales/sk";
import sl from "../../documents/view/locales/sl";
import sv from "../../documents/view/locales/sv";

const translations = { bg, cs, de, en, es, et, fi, fr, hr, is, it, nb, nl, pl, pt, sk, sl, sv } as const;

type FiscalizationStatus = "not_fiscalized" | "pending" | "success" | "failed" | "skipped";
type FiscalizationData = (Exclude<FursFiscalizationResponse, null> | Exclude<FinaFiscalizationResponse, null>) & {
  status: FiscalizationStatus;
};

interface FiscalizationStatusCardProps extends ComponentTranslationProps {
  fiscalizationType: "furs" | "fina";
  fiscalizationData: FiscalizationData | null | undefined;
  onRetry?: () => void;
  isRetrying?: boolean;
  variant?: "card" | "inline";
}

export function FiscalizationStatusCard({
  fiscalizationType,
  fiscalizationData,
  onRetry,
  isRetrying,
  variant = "card",
  t: translateFn,
  namespace,
  locale,
  translationLocale,
}: FiscalizationStatusCardProps) {
  const t = createTranslation({
    t: translateFn,
    namespace,
    locale,
    translationLocale,
    translations,
  });

  const label = fiscalizationType === "furs" ? "FURS" : "FINA";
  const status = fiscalizationData?.status ?? "not_fiscalized";

  const getStatusBadge = () => {
    switch (status) {
      case "success":
        return (
          <Badge
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            data-testid={`${fiscalizationType}-fiscalization-status-badge`}
            data-status="success"
          >
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
      case "not_fiscalized":
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
            <MinusCircle className="mr-1 h-3 w-3" />
            {t("Not fiscalized")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const bodyContent = (
    <>
      {status === "not_fiscalized" ? (
        <div className="text-muted-foreground text-sm">
          {label} &middot; {t("Not fiscalized")}
        </div>
      ) : status === "skipped" ? (
        <div className="text-muted-foreground text-sm">
          {label} &middot; {t("Skipped by user")}
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">
          {label} &middot;{" "}
          {fiscalizationData?.fiscalized_at && new Date(fiscalizationData.fiscalized_at).toLocaleString(locale)}
        </div>
      )}

      {status === "failed" && fiscalizationData?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{fiscalizationData.error}</AlertDescription>
        </Alert>
      )}

      {(status === "not_fiscalized" || status === "skipped" || status === "failed") && onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {status === "failed" ? t("Retry fiscalization") : t("Fiscalize")}
        </Button>
      )}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="space-y-3" data-testid={`${fiscalizationType}-fiscalization-status-card`}>
        <div className="flex items-center justify-between font-medium text-sm">
          <span>{t("Fiscalization")}</span>
          {getStatusBadge()}
        </div>
        {bodyContent}
      </div>
    );
  }

  return (
    <Card data-testid={`${fiscalizationType}-fiscalization-status-card`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{t("Fiscalization")}</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{bodyContent}</CardContent>
    </Card>
  );
}
