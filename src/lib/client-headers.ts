export const CLIENT_HEADER_NAME = "x-spaceinvoices-client";

export function getClientHeaders(clientName: string): Record<string, string> {
  return { [CLIENT_HEADER_NAME]: clientName };
}
