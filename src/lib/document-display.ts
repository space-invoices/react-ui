type TranslateFn = (key: string) => string;

type DraftDocumentLike = {
  number?: string | null;
  is_draft?: boolean | null;
};

export function isBackendDraftNumber(number: string | null | undefined): boolean {
  return typeof number === "string" && number.trim().toLowerCase().startsWith("draft-");
}

export function getDisplayDocumentNumber(document: DraftDocumentLike, t: TranslateFn, fallback = "-"): string {
  if (document.is_draft || isBackendDraftNumber(document.number)) {
    return t("Draft");
  }

  return document.number?.trim() || fallback;
}
