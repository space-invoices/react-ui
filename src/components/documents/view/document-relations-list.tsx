import type { DocumentRelation } from "@spaceinvoices/js-sdk";
import { Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
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

interface DocumentRelationsListProps extends ComponentTranslationProps {
  documentId: string;
  documentRelations?: DocumentRelation[];
  locale?: string;
  onNavigate?: (documentId: string) => void;
  variant?: "card" | "inline";
}

function getDocumentTypeLabel(type: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    invoice: t("Invoice"),
    estimate: t("Estimate"),
    credit_note: t("Credit note"),
    advance_invoice: t("Advance invoice"),
    delivery_note: t("Delivery note"),
  };
  return labels[type] || type;
}

function getRelationLabel(relationType: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    credit_for: t("Credit for"),
    converted_from: t("Converted from"),
    converted_to: t("Converted to"),
    has_credit: t("Has credit"),
    advance_applied: t("Advance applied"),
    applied_to: t("Applied to"),
    delivered_for: t("Delivered for"),
    has_delivery: t("Has delivery"),
    fulfills: t("Fulfills"),
    fulfilled_by: t("Fulfilled by"),
    references: t("References"),
  };
  return labels[relationType] || relationType;
}

export function DocumentRelationsList({
  documentId,
  documentRelations,
  locale = "en",
  onNavigate,
  variant = "card",
  ...i18nProps
}: DocumentRelationsListProps) {
  const t = createTranslation({ translations, locale, ...i18nProps });

  const relations = documentRelations || [];

  if (relations.length === 0) {
    return null;
  }

  const bodyContent = (
    <div className="space-y-2">
      {relations.map((relation) => {
        const isSource = relation.source_id === documentId;
        const otherType = isSource ? relation.target_type : relation.source_type;
        const otherId = isSource ? relation.target_id : relation.source_id;

        return (
          <div key={relation.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{getDocumentTypeLabel(otherType, t)}</span>
              <span className="text-muted-foreground text-xs">{getRelationLabel(relation.relation_type, t)}</span>
            </div>
            {onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate(otherId)}
                className="flex items-center gap-1 text-primary text-sm hover:underline"
              >
                <Link2 className="h-3.5 w-3.5" />
                {t("View")}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  if (variant === "inline") {
    return (
      <div>
        <h3 className="mb-3 font-medium text-sm">
          {t("Linked documents")} ({relations.length})
        </h3>
        {bodyContent}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {t("Linked documents")} ({relations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>{bodyContent}</CardContent>
    </Card>
  );
}
