/**
 * `entity.settings.legal_details` as the API defines it
 * (`apps/api/src/modules/entities/legal-details.schema.ts`).
 *
 * The legal form drives which company registration and capital details a country
 * asks for. The generic entity fields keep their existing meaning: `company_number`
 * is the registration number, `tax_number` is the tax/VAT identifier, and
 * `starting_capital` is share capital. Nothing here duplicates them.
 */

import { z } from "zod";

export const LEGAL_FORMS = [
  "sole_trader",
  "limited_liability_company",
  "public_limited_company",
  "partnership_limited_by_shares",
  "other_company",
] as const;

export type LegalForm = (typeof LEGAL_FORMS)[number];

export const legalDetailsSchema = z.object({
  legal_form: z.enum(LEGAL_FORMS).nullish(),
  registration_office: z.string().trim().min(1).max(100).nullish(),
  paid_up_capital: z.number().min(0).nullish(),
  equity: z.number().nullish(),
  in_liquidation: z.boolean().nullish(),
});

export type LegalDetails = z.infer<typeof legalDetailsSchema>;

/**
 * Only the shape this module reads. `passthrough` keeps every other settings key
 * intact so a caller can safely hand the whole settings object over.
 */
const settingsWithLegalDetailsSchema = z
  .object({ legal_details: legalDetailsSchema.nullish() })
  .partial()
  .passthrough();

/**
 * Read legal details out of an entity settings blob.
 *
 * Settings arrive as loosely typed JSON, and a legacy entity has no `legal_details`
 * at all — an absent block is not an error, it means the entity predates the field
 * and still uses the plain company-number/share-capital representation.
 */
export function readLegalDetails(settings: unknown): LegalDetails | null {
  const parsed = settingsWithLegalDetailsSchema.safeParse(settings);
  if (!parsed.success) return null;

  return parsed.data.legal_details ?? null;
}

/** True once the entity has an explicitly chosen legal form. */
export function hasLegalForm(details: LegalDetails | null | undefined): boolean {
  return details?.legal_form != null;
}

/** Everything except a sole trader is a company for disclosure purposes. */
export function isCompanyLegalForm(legalForm: LegalForm | null | undefined): boolean {
  return legalForm != null && legalForm !== "sole_trader";
}

/**
 * Legal forms whose registered share capital is a universally published figure.
 * `other_company` covers forms without one, so it is deliberately excluded.
 */
export function requiresShareCapital(legalForm: LegalForm | null | undefined): boolean {
  return (
    legalForm === "limited_liability_company" ||
    legalForm === "public_limited_company" ||
    legalForm === "partnership_limited_by_shares"
  );
}

/** Paid-up capital only has to be published when it differs from the share capital. */
export function shouldDisclosePaidUpCapital(
  paidUpCapital: number | null | undefined,
  shareCapital: number | null | undefined,
): boolean {
  if (paidUpCapital == null) return false;
  if (shareCapital == null) return true;

  return paidUpCapital !== shareCapital;
}

/**
 * Equity is only a disclosure once it has fallen to half the share capital or less.
 * Above that threshold there is nothing to declare, so the form must never make the
 * user enter a figure just to prove it.
 */
export function shouldDiscloseEquity(equity: number | null | undefined, shareCapital: number | null | undefined) {
  if (equity == null || shareCapital == null || shareCapital <= 0) return false;

  return equity <= shareCapital / 2;
}

/**
 * Whether the advanced disclosures already carry data. The advanced block stays
 * collapsed by default and opens only when there is something in it, so an existing
 * value can never be hidden from the person editing the profile.
 */
export function hasAdvancedCompanyDisclosures(details: LegalDetails | null | undefined): boolean {
  if (!details) return false;

  return details.paid_up_capital != null || details.equity != null || details.in_liquidation === true;
}
