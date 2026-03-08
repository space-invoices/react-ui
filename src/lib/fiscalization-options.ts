/**
 * Pure functions for building FURS/FINA/eSLOG submission options.
 *
 * Extracted from the submit callbacks of invoice, credit note,
 * and advance invoice forms where this logic was duplicated.
 */

export type FursSubmitOptions = { skip: true } | { business_premise_name: string; electronic_device_name: string };

export type FinaSubmitOptions = {
  business_premise_name: string;
  electronic_device_name: string;
  payment_type: string;
};

export type EslogSubmitOptions = {
  validation_enabled: boolean;
};

/**
 * Build FURS fiscalization options for document submission.
 *
 * Returns undefined when FURS should not be included (drafts, disabled, edit mode).
 */
export function buildFursOptions(opts: {
  isDraft: boolean;
  isEnabled: boolean;
  isEditMode?: boolean;
  skipFiscalization?: boolean;
  premiseName?: string;
  deviceName?: string;
}): FursSubmitOptions | undefined {
  if (opts.isDraft || opts.isEditMode || !opts.isEnabled) return undefined;
  if (opts.skipFiscalization) return { skip: true };
  if (opts.premiseName && opts.deviceName) {
    return {
      business_premise_name: opts.premiseName,
      electronic_device_name: opts.deviceName,
    };
  }
  return undefined;
}

/**
 * Build FINA fiscalization options for document submission.
 *
 * Returns undefined when FINA should not be included (drafts, numbering disabled).
 */
export function buildFinaOptions(opts: {
  isDraft: boolean;
  useFinaNumbering: boolean;
  isEditMode?: boolean;
  premiseName?: string;
  deviceName?: string;
  paymentType?: string;
}): FinaSubmitOptions | undefined {
  if (opts.isDraft || opts.isEditMode || !opts.useFinaNumbering) return undefined;
  if (opts.premiseName && opts.deviceName) {
    return {
      business_premise_name: opts.premiseName,
      electronic_device_name: opts.deviceName,
      payment_type: opts.paymentType || "bank_transfer",
    };
  }
  return undefined;
}

/**
 * Build eSLOG validation options for document submission.
 *
 * Returns undefined when eSLOG should not be included (drafts, edit mode, unavailable).
 */
export function buildEslogOptions(opts: {
  isDraft: boolean;
  isEditMode?: boolean;
  isAvailable: boolean;
  isEnabled: boolean | undefined;
}): EslogSubmitOptions | undefined {
  if (opts.isDraft || opts.isEditMode || !opts.isAvailable) return undefined;
  return { validation_enabled: opts.isEnabled === true };
}
