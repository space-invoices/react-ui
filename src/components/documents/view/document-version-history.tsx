import type { DocumentVersion } from "@spaceinvoices/js-sdk";
import { advanceInvoices, creditNotes, deliveryNotes, estimates, invoices } from "@spaceinvoices/js-sdk";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Skeleton } from "@/ui/components/ui/skeleton";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import de from "./locales/de";
import es from "./locales/es";
import fr from "./locales/fr";
import hr from "./locales/hr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sl from "./locales/sl";

const translations = { sl, de, it, fr, es, pt, nl, pl, hr } as const;
type DocumentViewDocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

interface DocumentVersionHistoryProps extends ComponentTranslationProps {
  documentId: string;
  documentType: DocumentViewDocumentType;
  entityId: string;
  locale?: string;
  variant?: "card" | "inline";
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getActorLabel(version: DocumentVersion, t: (key: string) => string) {
  if (version.user?.name) return version.user.name;
  if (version.user?.email) return version.user.email;
  return t("System");
}

export function DocumentVersionHistory({
  documentId,
  documentType,
  entityId,
  locale = "en",
  variant = "card",
  ...i18nProps
}: DocumentVersionHistoryProps) {
  const t = createTranslation({ translations, locale, ...i18nProps });

  const { data, isLoading } = useQuery({
    queryKey: ["document-versions", documentType, documentId, entityId],
    queryFn: async () => {
      if (documentType === "invoice") {
        return invoices.getVersions(documentId, { entity_id: entityId });
      }
      if (documentType === "estimate") {
        return estimates.getVersions(documentId, { entity_id: entityId });
      }
      if (documentType === "credit_note") {
        return creditNotes.getVersions(documentId, { entity_id: entityId });
      }
      if (documentType === "advance_invoice") {
        return advanceInvoices.getVersions(documentId, { entity_id: entityId });
      }
      return deliveryNotes.getVersions(documentId, { entity_id: entityId });
    },
    enabled: !!documentId && !!entityId,
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const versions = data?.versions ?? [];

  const body = isLoading ? (
    <div className="space-y-2">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  ) : versions.length === 0 ? (
    <p className="py-2 text-muted-foreground text-sm">{t("No version history")}</p>
  ) : (
    <div className="space-y-2">
      {versions.map((version: DocumentVersion) => (
        <div key={version.id} className="rounded-md border p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-sm">
                {t("Version")} {version.version}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("by")} {getActorLabel(version, t)}
              </div>
            </div>
            <div className="text-right text-muted-foreground text-xs">{formatDate(version.created_at, locale)}</div>
          </div>
          {version.changed_fields.length > 0 ? (
            <p className="mt-2 text-muted-foreground text-xs">{version.changed_fields.join(", ")}</p>
          ) : null}
          {version.reason ? <p className="mt-1 text-xs">{version.reason}</p> : null}
        </div>
      ))}
    </div>
  );

  if (variant === "inline") {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2 font-medium text-sm">
          <History className="h-4 w-4" />
          <span>
            {t("Version history")} {versions.length > 0 ? `(${versions.length})` : ""}
          </span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-4 w-4" />
          {t("Version history")}
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
