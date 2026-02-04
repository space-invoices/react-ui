import type { CreateInvoiceRequest } from "@spaceinvoices/js-sdk";

type DocumentPreviewProps = {
  data: Partial<CreateInvoiceRequest>;
};

export default function DocumentPreview({ data }: DocumentPreviewProps) {
  return (
    <div className="rounded-lg border p-4">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
