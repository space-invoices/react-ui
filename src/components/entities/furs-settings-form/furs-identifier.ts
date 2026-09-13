/**
 * FURS BusinessPremiseID and ElectronicDeviceID: 1-20 ASCII letters or digits.
 * Mirrors the API registration DTOs, which reject anything else before calling FURS.
 */
export const FURS_IDENTIFIER_PATTERN = /^[0-9a-zA-Z]{1,20}$/;
