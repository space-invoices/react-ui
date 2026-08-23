/**
 * Customer directory roles.
 *
 * Kept free of SDK and query imports so modules that only need the role rules do not pull the
 * customer resource hooks into their import graph.
 */
export type CustomerDirectoryRole = "buyer" | "supplier";

export function canUseCustomerAsBuyer(customer: { contact_type?: string | null } | null | undefined) {
  return customer?.contact_type !== "supplier";
}
