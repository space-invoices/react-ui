import type {
  AdvanceInvoice,
  CreditNote,
  DeliveryNote,
  DocumentRelation,
  Estimate,
  Invoice,
  Payment,
} from "@spaceinvoices/js-sdk";
import { Card, CardContent } from "@/ui/components/ui/card";
import { Separator } from "@/ui/components/ui/separator";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { FiscalizationStatusCard } from "../../invoices/view/fiscalization-status-card";
import { DocumentActivitiesList } from "./document-activities-list";
import { DocumentDetailsCard } from "./document-details-card";
import { DocumentPaymentsList } from "./document-payments-list";
import { DocumentRelationsList } from "./document-relations-list";
import { DocumentVersionHistory } from "./document-version-history";

type Document = Invoice | Estimate | CreditNote | AdvanceInvoice | DeliveryNote;
type DocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

interface DocumentSidebarProps extends ComponentTranslationProps {
  document: Document;
  documentType: DocumentType;
  entityId: string;
  locale?: string;
  currentUserId?: string;
  showPayments?: boolean;
  payments?: Payment[];
  onAddPayment?: () => void;
  onEditPayment?: (payment: Payment) => void;
  onPaymentDeleteSuccess?: () => void;
  onPaymentDeleteError?: (error: string) => void;
  addPaymentDisabledReason?: string;
  editPaymentDisabledReason?: string;
  deletePaymentDisabledReason?: string;
  /** Navigate to a related document */
  onNavigateRelation?: (documentId: string) => void;
  showFurs?: boolean;
  fursFiscalizationData?: any;
  showFina?: boolean;
  finaFiscalizationData?: any;
  onRetryFiscalization?: () => void;
  isRetryingFiscalization?: boolean;
}

export function DocumentSidebar({
  document,
  documentType,
  entityId,
  locale = "en",
  currentUserId,
  showPayments,
  payments,
  onAddPayment,
  onEditPayment,
  onPaymentDeleteSuccess,
  onPaymentDeleteError,
  addPaymentDisabledReason,
  editPaymentDisabledReason,
  deletePaymentDisabledReason,
  onNavigateRelation,
  showFurs,
  fursFiscalizationData,
  showFina,
  finaFiscalizationData,
  onRetryFiscalization,
  isRetryingFiscalization,
  ...i18nProps
}: DocumentSidebarProps) {
  const documentRelations = (document as unknown as { document_relations?: DocumentRelation[] }).document_relations;
  const hasRelations = documentRelations && documentRelations.length > 0;

  return (
    <Card size="sm">
      <CardContent className="space-y-5">
        <DocumentDetailsCard
          variant="inline"
          document={document}
          documentType={documentType}
          locale={locale}
          {...i18nProps}
        />

        {showPayments && (
          <>
            <Separator />
            <DocumentPaymentsList
              variant="inline"
              documentId={document.id}
              documentType={documentType as "invoice" | "credit_note" | "advance_invoice"}
              entityId={entityId}
              currencyCode={document.currency_code}
              payments={payments}
              locale={locale}
              onAddPayment={onAddPayment}
              onEditPayment={onEditPayment}
              onDeleteSuccess={onPaymentDeleteSuccess}
              onDeleteError={onPaymentDeleteError}
              addDisabledReason={addPaymentDisabledReason}
              editDisabledReason={editPaymentDisabledReason}
              deleteDisabledReason={deletePaymentDisabledReason}
              {...i18nProps}
            />
          </>
        )}

        {hasRelations && (
          <>
            <Separator />
            <DocumentRelationsList
              variant="inline"
              documentId={document.id}
              documentRelations={documentRelations}
              locale={locale}
              onNavigate={onNavigateRelation}
              {...i18nProps}
            />
          </>
        )}

        <Separator />
        <DocumentActivitiesList
          variant="inline"
          documentId={document.id}
          entityId={entityId}
          currentUserId={currentUserId}
          locale={locale}
          {...i18nProps}
        />

        <Separator />
        <DocumentVersionHistory
          variant="inline"
          documentId={document.id}
          documentType={documentType}
          entityId={entityId}
          locale={locale}
          {...i18nProps}
        />

        {(showFurs || showFina) && (
          <>
            <Separator />
            {showFurs && (
              <FiscalizationStatusCard
                variant="inline"
                fiscalizationType="furs"
                fiscalizationData={fursFiscalizationData}
                onRetry={onRetryFiscalization}
                isRetrying={isRetryingFiscalization}
                locale={locale}
                {...i18nProps}
              />
            )}
            {showFina && (
              <FiscalizationStatusCard
                variant="inline"
                fiscalizationType="fina"
                fiscalizationData={finaFiscalizationData}
                onRetry={onRetryFiscalization}
                isRetrying={isRetryingFiscalization}
                locale={locale}
                {...i18nProps}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
