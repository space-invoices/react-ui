import { getFullLocale } from "@/ui/lib/locale";

type EmailBodyKey =
  | "invoice_body"
  | "estimate_body"
  | "credit_note_body"
  | "advance_invoice_body"
  | "delivery_note_body";

// These are the first lines of the API's canonical entity email defaults. Keep
// them aligned with apps/api/src/modules/entities/l10n when those defaults change.
const legacyAttachmentLines: Record<string, Record<EmailBodyKey, string>> = {
  "en-US": {
    invoice_body: "Please find invoice {document_number} attached.",
    estimate_body: "Please find {document_label} {document_number} attached.",
    credit_note_body: "Please find credit note {document_number} attached.",
    advance_invoice_body: "Please find advance invoice {document_number} attached.",
    delivery_note_body: "Please find delivery note {document_number} attached.",
  },
  "de-DE": {
    invoice_body: "Anbei finden Sie die Rechnung {document_number}.",
    estimate_body: "Anbei finden Sie das Angebot {document_number}.",
    credit_note_body: "Anbei finden Sie die Gutschrift {document_number}.",
    advance_invoice_body: "Anbei finden Sie die Vorausrechnung {document_number}.",
    delivery_note_body: "Anbei finden Sie den Lieferschein {document_number}.",
  },
  "sl-SI": {
    invoice_body: "V priponki vam pošiljamo račun {document_number}.",
    estimate_body: "V priponki vam pošiljamo {document_label} {document_number}.",
    credit_note_body: "V priponki vam pošiljamo dobropis {document_number}.",
    advance_invoice_body: "V priponki vam pošiljamo avansni račun {document_number}.",
    delivery_note_body: "V priponki vam pošiljamo dobavnico {document_number}.",
  },
  "it-IT": {
    invoice_body: "In allegato trova la fattura {document_number}.",
    estimate_body: "In allegato trova il preventivo {document_number}.",
    credit_note_body: "In allegato trova la nota di credito {document_number}.",
    advance_invoice_body: "In allegato trova la fattura proforma {document_number}.",
    delivery_note_body: "In allegato trova la bolla di consegna {document_number}.",
  },
  "fr-FR": {
    invoice_body: "Veuillez trouver la facture {document_number} en pièce jointe.",
    estimate_body: "Veuillez trouver le devis {document_number} en pièce jointe.",
    credit_note_body: "Veuillez trouver l'avoir {document_number} en pièce jointe.",
    advance_invoice_body: "Veuillez trouver la facture d'acompte {document_number} en pièce jointe.",
    delivery_note_body: "Veuillez trouver le bon de livraison {document_number} en pièce jointe.",
  },
  "es-ES": {
    invoice_body: "Adjunto encontrará la factura {document_number}.",
    estimate_body: "Adjunto encontrará el presupuesto {document_number}.",
    credit_note_body: "Adjunto encontrará la nota de crédito {document_number}.",
    advance_invoice_body: "Adjunto encontrará la factura anticipada {document_number}.",
    delivery_note_body: "Adjunto encontrará el albarán {document_number}.",
  },
  "pt-PT": {
    invoice_body: "Encontra em anexo a fatura {document_number}.",
    estimate_body: "Encontra em anexo o orçamento {document_number}.",
    credit_note_body: "Encontra em anexo a nota de crédito {document_number}.",
    advance_invoice_body: "Encontra em anexo a fatura proforma {document_number}.",
    delivery_note_body: "Encontra em anexo a guia de remessa {document_number}.",
  },
  "nl-NL": {
    invoice_body: "Bijgevoegd vindt u factuur {document_number}.",
    estimate_body: "Bijgevoegd vindt u offerte {document_number}.",
    credit_note_body: "Bijgevoegd vindt u creditnota {document_number}.",
    advance_invoice_body: "Bijgevoegd vindt u voorschotfactuur {document_number}.",
    delivery_note_body: "Bijgevoegd vindt u leveringsbon {document_number}.",
  },
  "pl-PL": {
    invoice_body: "W załączeniu przesyłamy fakturę {document_number}.",
    estimate_body: "W załączeniu przesyłamy kosztorys {document_number}.",
    credit_note_body: "W załączeniu przesyłamy notę kredytową {document_number}.",
    advance_invoice_body: "W załączeniu przesyłamy fakturę zaliczkową {document_number}.",
    delivery_note_body: "W załączeniu przesyłamy list przewozowy {document_number}.",
  },
  "hr-HR": {
    invoice_body: "U prilogu se nalazi račun {document_number}.",
    estimate_body: "U prilogu se nalazi {document_label} {document_number}.",
    credit_note_body: "U prilogu se nalazi odobrenje {document_number}.",
    advance_invoice_body: "U prilogu se nalazi avansni račun {document_number}.",
    delivery_note_body: "U prilogu se nalazi otpremnica {document_number}.",
  },
  "sv-SE": {
    invoice_body: "Se bifogad faktura {document_number}.",
    estimate_body: "Se bifogad offert {document_number}.",
    credit_note_body: "Se bifogad kreditnota {document_number}.",
    advance_invoice_body: "Se bifogad förskottsfaktura {document_number}.",
    delivery_note_body: "Se bifogad följesedel {document_number}.",
  },
  "fi-FI": {
    invoice_body: "Liitteenä lasku {document_number}.",
    estimate_body: "Liitteenä tarjous {document_number}.",
    credit_note_body: "Liitteenä hyvityslasku {document_number}.",
    advance_invoice_body: "Liitteenä ennakkolasku {document_number}.",
    delivery_note_body: "Liitteenä lähetysluettelo {document_number}.",
  },
  "et-EE": {
    invoice_body: "Palun leidke manusest arve {document_number}.",
    estimate_body: "Palun leidke manusest hinnapakkumine {document_number}.",
    credit_note_body: "Palun leidke manusest kreeditarve {document_number}.",
    advance_invoice_body: "Palun leidke manusest ettemaksuarve {document_number}.",
    delivery_note_body: "Palun leidke manusest saateleht {document_number}.",
  },
  "bg-BG": {
    invoice_body: "Моля, вижте приложената фактура {document_number}.",
    estimate_body: "Моля, вижте приложената оферта {document_number}.",
    credit_note_body: "Моля, вижте приложеното кредитно известие {document_number}.",
    advance_invoice_body: "Моля, вижте приложената авансова фактура {document_number}.",
    delivery_note_body: "Моля, вижте приложената стокова разписка {document_number}.",
  },
  "cs-CZ": {
    invoice_body: "V příloze naleznete fakturu {document_number}.",
    estimate_body: "V příloze naleznete nabídku {document_number}.",
    credit_note_body: "V příloze naleznete dobropis {document_number}.",
    advance_invoice_body: "V příloze naleznete zálohovou fakturu {document_number}.",
    delivery_note_body: "V příloze naleznete dodací list {document_number}.",
  },
  "sk-SK": {
    invoice_body: "V prílohe nájdete faktúru {document_number}.",
    estimate_body: "V prílohe nájdete ponuku {document_number}.",
    credit_note_body: "V prílohe nájdete dobropis {document_number}.",
    advance_invoice_body: "V prílohe nájdete zálohovú faktúru {document_number}.",
    delivery_note_body: "V prílohe nájdete dodací list {document_number}.",
  },
  "nb-NO": {
    invoice_body: "Vedlagt finner du faktura {document_number}.",
    estimate_body: "Vedlagt finner du tilbud {document_number}.",
    credit_note_body: "Vedlagt finner du kreditnota {document_number}.",
    advance_invoice_body: "Vedlagt finner du forskuddsfaktura {document_number}.",
    delivery_note_body: "Vedlagt finner du følgeseddel {document_number}.",
  },
  "is-IS": {
    invoice_body: "Meðfylgjandi er reikningur {document_number}.",
    estimate_body: "Meðfylgjandi er tilboð {document_number}.",
    credit_note_body: "Meðfylgjandi er kreditreikningur {document_number}.",
    advance_invoice_body: "Meðfylgjandi er fyrirframreikningur {document_number}.",
    delivery_note_body: "Meðfylgjandi er fylgiseðill {document_number}.",
  },
};

const linkOnlyFallbackLines: Record<string, string> = {
  "en-US": "View the document using the PDF link below.",
  "de-DE": "Öffnen Sie das Dokument über den unten stehenden PDF-Link.",
  "sl-SI": "Dokument si oglejte prek spodnje povezave do PDF-ja.",
  "it-IT": "Visualizzi il documento tramite il link PDF qui sotto.",
  "fr-FR": "Consultez le document à l’aide du lien PDF ci-dessous.",
  "es-ES": "Consulte el documento mediante el enlace al PDF que aparece a continuación.",
  "pt-PT": "Consulte o documento através da ligação para o PDF abaixo.",
  "nl-NL": "Bekijk het document via de onderstaande PDF-link.",
  "pl-PL": "Wyświetl dokument, korzystając z poniższego linku do pliku PDF.",
  "hr-HR": "Dokument otvorite putem poveznice na PDF u nastavku.",
  "sv-SE": "Visa dokumentet via PDF-länken nedan.",
  "fi-FI": "Avaa asiakirja alla olevasta PDF-linkistä.",
  "et-EE": "Vaadake dokumenti alloleva PDF-lingi kaudu.",
  "bg-BG": "Прегледайте документа чрез връзката към PDF по-долу.",
  "cs-CZ": "Dokument zobrazíte pomocí odkazu na PDF níže.",
  "sk-SK": "Dokument zobrazíte pomocou odkazu na PDF nižšie.",
  "nb-NO": "Vis dokumentet via PDF-lenken nedenfor.",
  "is-IS": "Skoðaðu skjalið með PDF-tenglinum hér að neðan.",
};

export function normalizeLegacyAttachmentBody(body: string, bodyKey: string, locale?: string): string {
  const resolvedLocale = getFullLocale(locale);
  const attachmentLine = legacyAttachmentLines[resolvedLocale]?.[bodyKey as EmailBodyKey];
  if (!attachmentLine) return body;

  const [firstLine, ...remainingLines] = body.split("\n");
  if (firstLine !== attachmentLine) return body;

  return remainingLines.join("\n").trim() || linkOnlyFallbackLines[resolvedLocale] || linkOnlyFallbackLines["en-US"]!;
}
