import type { Estimate } from "@spaceinvoices/js-sdk";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import bg from "../view/locales/bg";
import cs from "../view/locales/cs";
import de from "../view/locales/de";
import en from "../view/locales/en";
import es from "../view/locales/es";
import et from "../view/locales/et";
import fi from "../view/locales/fi";
import fr from "../view/locales/fr";
import hr from "../view/locales/hr";
import is from "../view/locales/is";
import it from "../view/locales/it";
import nb from "../view/locales/nb";
import nl from "../view/locales/nl";
import pl from "../view/locales/pl";
import pt from "../view/locales/pt";
import sk from "../view/locales/sk";
import sl from "../view/locales/sl";
import sv from "../view/locales/sv";

export type DownloadDocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";

type EstimateTitleType = Estimate["title_type"];

type DocumentFilenameI18nProps = Pick<ComponentTranslationProps, "locale" | "translationLocale" | "t" | "namespace">;

const baseTranslations = { en, sl, de, it, fr, es, pt, nl, pl, hr, sv, fi, et, bg, cs, sk, nb, is } as const;
const translations = Object.fromEntries(
  Object.entries(baseTranslations).map(([locale, labels]) => [
    locale,
    {
      ...labels,
      "Credit Note":
        locale === "en"
          ? "Credit Note"
          : (labels["Credit Note" as keyof typeof labels] ?? labels["Credit note" as keyof typeof labels]),
      "Advance Invoice":
        locale === "en"
          ? "Advance Invoice"
          : (labels["Advance Invoice" as keyof typeof labels] ?? labels["Advance invoice" as keyof typeof labels]),
      "Delivery Note":
        locale === "en"
          ? "Delivery Note"
          : (labels["Delivery Note" as keyof typeof labels] ?? labels["Delivery note" as keyof typeof labels]),
    },
  ]),
) as Record<string, Record<string, string>>;

const DOCUMENT_TYPE_LABELS: Record<DownloadDocumentType, string> = {
  invoice: "Invoice",
  estimate: "Estimate",
  credit_note: "Credit Note",
  advance_invoice: "Advance Invoice",
  delivery_note: "Delivery Note",
};

const MAX_FILENAME_BYTES = 240;
const UTF8_ENCODER = new TextEncoder();

function sanitizeFilename(filename: string): string {
  const controlCharacterRanges = "\\x00-\\x1F";
  const unsafeCharacters = new RegExp(`[<>:"/\\\\|?*${controlCharacterRanges}]`, "g");
  const cleaned = filename
    .replace(unsafeCharacters, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+(\.[^.]+)$/u, "$1")
    .trim();
  if (cleaned.length === 0) {
    return "document.pdf";
  }

  const extensionIndex = cleaned.lastIndexOf(".");
  const extension = extensionIndex > 0 ? cleaned.slice(extensionIndex) : "";
  const baseName = extensionIndex > 0 ? cleaned.slice(0, extensionIndex) : cleaned;
  const byteBudget = MAX_FILENAME_BYTES - UTF8_ENCODER.encode(extension).byteLength;
  let byteLength = 0;
  let truncatedBaseName = "";

  for (const character of baseName) {
    const characterByteLength = UTF8_ENCODER.encode(character).byteLength;
    if (byteLength + characterByteLength > byteBudget) {
      break;
    }
    truncatedBaseName += character;
    byteLength += characterByteLength;
  }

  return `${truncatedBaseName.trimEnd()}${extension}`;
}

export function getLocalizedDocumentLabel(
  documentType: DownloadDocumentType,
  titleType: EstimateTitleType | undefined,
  i18nProps: DocumentFilenameI18nProps,
): string {
  const t = createTranslation({ ...i18nProps, translations });

  if (documentType === "estimate" && titleType === "proforma_invoice") {
    return t("Proforma invoice");
  }

  return t(DOCUMENT_TYPE_LABELS[documentType]);
}

export function getDocumentPdfFileName(
  documentType: DownloadDocumentType,
  number: string,
  titleType: EstimateTitleType | undefined,
  i18nProps: DocumentFilenameI18nProps,
  customerName?: string | null,
  pdfVariant?: string,
): string {
  const customerSuffix = customerName?.trim() ? ` - ${customerName.trim()}` : "";
  const variantSuffix = pdfVariant?.trim() ? ` ${pdfVariant.trim()}` : "";
  return sanitizeFilename(
    `${getLocalizedDocumentLabel(documentType, titleType, i18nProps)} ${number}${customerSuffix}${variantSuffix}.pdf`,
  );
}
