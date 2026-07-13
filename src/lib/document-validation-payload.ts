export type DocumentValidationOptions = {
  validation_enabled?: boolean;
  validation_required?: boolean;
};

export function buildDocumentValidationPayload(validation: null): null;
export function buildDocumentValidationPayload(validation: DocumentValidationOptions): {
  validation_enabled: boolean | undefined;
  validation_required?: boolean;
};
export function buildDocumentValidationPayload(
  validation: DocumentValidationOptions | null,
): { validation_enabled: boolean | undefined; validation_required?: boolean } | null;
export function buildDocumentValidationPayload(validation: DocumentValidationOptions | null) {
  if (validation === null) {
    return null;
  }

  return {
    validation_enabled: validation.validation_enabled,
    ...(validation.validation_required !== undefined ? { validation_required: validation.validation_required } : {}),
  };
}

export function assignDocumentValidationPayload(
  payload: object,
  key: string,
  validation: DocumentValidationOptions | null | undefined,
) {
  if (validation !== undefined) {
    (payload as Record<string, unknown>)[key] = buildDocumentValidationPayload(validation);
  }
}
