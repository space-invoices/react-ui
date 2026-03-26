import type { Entity } from "@/ui/providers/entities-context";

export type WhiteLabelCapabilityGroup = "workspace" | "documents" | "compliance";
export type WhiteLabelControlKind = "capability" | "action";

export type WhiteLabelCapabilityId =
  | "developer_tools"
  | "multi_entity"
  | "documents.estimates"
  | "documents.credit_notes"
  | "documents.advance_invoices"
  | "documents.delivery_notes"
  | "documents.recurring_invoices"
  | "compliance.furs"
  | "compliance.fina"
  | "compliance.eslog"
  | "compliance.e_invoicing";

export type WhiteLabelActionControlId =
  | "actions.multi_entity.add_entity_entry_points"
  | "actions.documents.invoice.create"
  | "actions.documents.invoice.save_draft"
  | "actions.documents.estimate.create"
  | "actions.documents.estimate.save_draft"
  | "actions.documents.credit_note.create"
  | "actions.documents.credit_note.save_draft"
  | "actions.documents.advance_invoice.create"
  | "actions.documents.advance_invoice.save_draft"
  | "actions.documents.delivery_note.create"
  | "actions.documents.delivery_note.save_draft"
  | "actions.documents.recurring_invoices.create"
  | "actions.documents.invoice.void"
  | "actions.documents.credit_note.void"
  | "actions.documents.advance_invoice.void"
  | "actions.documents.delivery_note.void"
  | "actions.documents.invoice.payments.manage"
  | "actions.documents.credit_note.payments.manage"
  | "actions.documents.advance_invoice.payments.manage"
  | "actions.documents.credit_notes.create_from_invoice"
  | "actions.documents.invoices.create_from_estimate"
  | "actions.documents.invoices.create_from_advance_invoice"
  | "actions.documents.invoices.create_from_delivery_note"
  | "actions.documents.recurring_invoices.create_from_invoice";

export type WhiteLabelHiddenFeatureId = WhiteLabelCapabilityId | WhiteLabelActionControlId;

export type WhiteLabelDocumentType = "invoice" | "estimate" | "credit_note" | "advance_invoice" | "delivery_note";
export type WhiteLabelCreatableResourceType = WhiteLabelDocumentType | "recurring_invoice";
export type WhiteLabelVoidableDocumentType = Extract<
  WhiteLabelDocumentType,
  "invoice" | "credit_note" | "advance_invoice" | "delivery_note"
>;
export type WhiteLabelPayableDocumentType = Extract<
  WhiteLabelDocumentType,
  "invoice" | "credit_note" | "advance_invoice"
>;

type CountryFeatureDependency = "furs" | "fina" | "eslog" | "e_invoicing";

export type WhiteLabelCapabilityDefinition = {
  kind: "capability";
  id: WhiteLabelCapabilityId;
  label: string;
  description: string;
  group: WhiteLabelCapabilityGroup;
  affectedSurfaces: string[];
  countryFeatureDependency?: CountryFeatureDependency;
  subscriptionFeatureDependency?: string;
};

export type WhiteLabelActionControlDefinition = {
  kind: "action";
  id: WhiteLabelActionControlId;
  label: string;
  description: string;
  group: WhiteLabelCapabilityGroup;
  affectedSurfaces: string[];
  parentCapability?: WhiteLabelCapabilityId;
  countryFeatureDependency?: CountryFeatureDependency;
  subscriptionFeatureDependency?: string;
};

export type WhiteLabelControlDefinition = WhiteLabelCapabilityDefinition | WhiteLabelActionControlDefinition;

export const ALWAYS_HIDDEN_WHITE_LABEL_CAPABILITIES = ["developer_tools"] as const;

export const WHITE_LABEL_CAPABILITIES: WhiteLabelCapabilityDefinition[] = [
  {
    kind: "capability",
    id: "developer_tools",
    label: "Developer tools",
    description: "Hide account-level developer surfaces such as request logs and webhook logs.",
    group: "workspace",
    affectedSurfaces: ["account pages", "developer routes", "sidebar developer section"],
  },
  {
    kind: "capability",
    id: "multi_entity",
    label: "Multi-entity",
    description: "Hide add-entity entry points after the first entity exists.",
    group: "workspace",
    affectedSurfaces: ["entity switcher", "entities/add route"],
  },
  {
    kind: "capability",
    id: "documents.estimates",
    label: "Estimates",
    description: "Hide estimate list, create, view, and conversion entry points.",
    group: "documents",
    affectedSurfaces: ["sidebar", "documents routes", "document duplicate menu"],
  },
  {
    kind: "capability",
    id: "documents.credit_notes",
    label: "Credit notes",
    description: "Hide credit note list, create, view, and conversion entry points.",
    group: "documents",
    affectedSurfaces: ["sidebar", "documents routes", "document duplicate menu"],
  },
  {
    kind: "capability",
    id: "documents.advance_invoices",
    label: "Advance invoices",
    description: "Hide advance invoice list, create, view, and conversion entry points.",
    group: "documents",
    affectedSurfaces: ["sidebar", "documents routes", "document duplicate menu"],
  },
  {
    kind: "capability",
    id: "documents.delivery_notes",
    label: "Delivery notes",
    description: "Hide delivery note list, create, view, and conversion entry points.",
    group: "documents",
    affectedSurfaces: ["sidebar", "documents routes", "document duplicate menu"],
  },
  {
    kind: "capability",
    id: "documents.recurring_invoices",
    label: "Recurring invoices",
    description: "Hide recurring invoice pages and create-recurring actions.",
    group: "documents",
    affectedSurfaces: ["sidebar", "recurring routes", "document actions"],
    subscriptionFeatureDependency: "recurring",
  },
  {
    kind: "capability",
    id: "compliance.furs",
    label: "FURS",
    description: "Hide Slovenian fiscalization settings surfaces. Only affects entities that support FURS.",
    group: "compliance",
    affectedSurfaces: ["sidebar settings", "settings routes"],
    countryFeatureDependency: "furs",
  },
  {
    kind: "capability",
    id: "compliance.fina",
    label: "FINA",
    description: "Hide Croatian fiscalization settings surfaces. Only affects entities that support FINA.",
    group: "compliance",
    affectedSurfaces: ["sidebar settings", "settings routes"],
    countryFeatureDependency: "fina",
  },
  {
    kind: "capability",
    id: "compliance.eslog",
    label: "e-SLOG",
    description: "Hide e-SLOG settings surfaces. Only affects entities that support e-SLOG.",
    group: "compliance",
    affectedSurfaces: ["sidebar settings", "settings routes"],
    countryFeatureDependency: "eslog",
  },
  {
    kind: "capability",
    id: "compliance.e_invoicing",
    label: "E-invoicing",
    description: "Hide e-invoicing settings surfaces. Only affects entities that support e-invoicing.",
    group: "compliance",
    affectedSurfaces: ["sidebar settings", "settings routes"],
    countryFeatureDependency: "e_invoicing",
  },
];

export const WHITE_LABEL_ACTION_CONTROLS: WhiteLabelActionControlDefinition[] = [
  {
    kind: "action",
    id: "actions.multi_entity.add_entity_entry_points",
    label: "Show add entity entry points",
    description: "Keep add-entity buttons and links visible while leaving the route available.",
    group: "workspace",
    affectedSurfaces: ["entity switcher", "account dashboard", "account entities page"],
    parentCapability: "multi_entity",
  },
  {
    kind: "action",
    id: "actions.documents.invoice.create",
    label: "Show Create invoice",
    description: "Keep invoice create entry points and add routes visible.",
    group: "documents",
    affectedSurfaces: ["invoice list", "invoice add route", "invoice empty state"],
  },
  {
    kind: "action",
    id: "actions.documents.invoice.save_draft",
    label: "Show invoice draft saving",
    description: "Keep invoice draft save actions visible on create forms.",
    group: "documents",
    affectedSurfaces: ["invoice create form", "embed invoice create form", "document footer actions"],
  },
  {
    kind: "action",
    id: "actions.documents.estimate.create",
    label: "Show Create estimate",
    description: "Keep estimate create entry points and add routes visible.",
    group: "documents",
    affectedSurfaces: ["estimate list", "estimate add route", "estimate empty state"],
    parentCapability: "documents.estimates",
  },
  {
    kind: "action",
    id: "actions.documents.estimate.save_draft",
    label: "Show estimate draft saving",
    description: "Keep estimate draft save actions visible on create forms.",
    group: "documents",
    affectedSurfaces: ["estimate create form", "embed estimate create form", "document footer actions"],
    parentCapability: "documents.estimates",
  },
  {
    kind: "action",
    id: "actions.documents.credit_note.create",
    label: "Show Create credit note",
    description: "Keep credit note create entry points and add routes visible.",
    group: "documents",
    affectedSurfaces: ["credit note list", "credit note add route", "credit note empty state"],
    parentCapability: "documents.credit_notes",
  },
  {
    kind: "action",
    id: "actions.documents.credit_note.save_draft",
    label: "Show credit note draft saving",
    description: "Keep credit note draft save actions visible on create forms.",
    group: "documents",
    affectedSurfaces: ["credit note create form", "embed credit note create form", "document footer actions"],
    parentCapability: "documents.credit_notes",
  },
  {
    kind: "action",
    id: "actions.documents.advance_invoice.create",
    label: "Show Create advance invoice",
    description: "Keep advance invoice create entry points and add routes visible.",
    group: "documents",
    affectedSurfaces: ["advance invoice list", "advance invoice add route", "advance invoice empty state"],
    parentCapability: "documents.advance_invoices",
  },
  {
    kind: "action",
    id: "actions.documents.advance_invoice.save_draft",
    label: "Show advance invoice draft saving",
    description: "Keep advance invoice draft save actions visible on create forms.",
    group: "documents",
    affectedSurfaces: ["advance invoice create form", "embed advance invoice create form", "document footer actions"],
    parentCapability: "documents.advance_invoices",
  },
  {
    kind: "action",
    id: "actions.documents.delivery_note.create",
    label: "Show Create delivery note",
    description: "Keep delivery note create entry points and add routes visible.",
    group: "documents",
    affectedSurfaces: ["delivery note list", "delivery note add route", "delivery note empty state"],
    parentCapability: "documents.delivery_notes",
  },
  {
    kind: "action",
    id: "actions.documents.delivery_note.save_draft",
    label: "Show delivery note draft saving",
    description: "Keep delivery note draft save actions visible on create forms.",
    group: "documents",
    affectedSurfaces: ["delivery note create form", "embed delivery note create form", "document footer actions"],
    parentCapability: "documents.delivery_notes",
  },
  {
    kind: "action",
    id: "actions.documents.recurring_invoices.create",
    label: "Show Create recurring invoice",
    description: "Keep recurring invoice create entry points visible where available.",
    group: "documents",
    affectedSurfaces: ["recurring invoice create entry points"],
    parentCapability: "documents.recurring_invoices",
    subscriptionFeatureDependency: "recurring",
  },
  {
    kind: "action",
    id: "actions.documents.invoice.void",
    label: "Show Void invoice",
    description: "Keep invoice void actions visible on list and view pages.",
    group: "documents",
    affectedSurfaces: ["invoice list", "invoice view"],
  },
  {
    kind: "action",
    id: "actions.documents.credit_note.void",
    label: "Show Void credit note",
    description: "Keep credit note void actions visible on list and view pages.",
    group: "documents",
    affectedSurfaces: ["credit note list", "credit note view"],
    parentCapability: "documents.credit_notes",
  },
  {
    kind: "action",
    id: "actions.documents.advance_invoice.void",
    label: "Show Void advance invoice",
    description: "Keep advance invoice void actions visible on list and view pages.",
    group: "documents",
    affectedSurfaces: ["advance invoice list", "advance invoice view"],
    parentCapability: "documents.advance_invoices",
  },
  {
    kind: "action",
    id: "actions.documents.delivery_note.void",
    label: "Show Void delivery note",
    description: "Keep delivery note void actions visible on list and view pages.",
    group: "documents",
    affectedSurfaces: ["delivery note list", "delivery note view"],
    parentCapability: "documents.delivery_notes",
  },
  {
    kind: "action",
    id: "actions.documents.invoice.payments.manage",
    label: "Show invoice payments",
    description: "Keep invoice payment add, edit, and delete UI visible.",
    group: "documents",
    affectedSurfaces: ["invoice action bar", "invoice sidebar payments"],
  },
  {
    kind: "action",
    id: "actions.documents.credit_note.payments.manage",
    label: "Show credit note payments",
    description: "Keep credit note payment add, edit, and delete UI visible.",
    group: "documents",
    affectedSurfaces: ["credit note action bar", "credit note sidebar payments"],
    parentCapability: "documents.credit_notes",
  },
  {
    kind: "action",
    id: "actions.documents.advance_invoice.payments.manage",
    label: "Show advance invoice payments",
    description: "Keep advance invoice payment add, edit, and delete UI visible.",
    group: "documents",
    affectedSurfaces: ["advance invoice action bar", "advance invoice sidebar payments"],
    parentCapability: "documents.advance_invoices",
  },
  {
    kind: "action",
    id: "actions.documents.credit_notes.create_from_invoice",
    label: "Show Create credit note from invoice",
    description: "Keep the invoice-to-credit-note conversion action visible on invoice view.",
    group: "documents",
    affectedSurfaces: ["invoice actions"],
    parentCapability: "documents.credit_notes",
  },
  {
    kind: "action",
    id: "actions.documents.invoices.create_from_estimate",
    label: "Show Create invoice from estimate",
    description: "Keep the estimate-to-invoice conversion action visible on estimate view.",
    group: "documents",
    affectedSurfaces: ["estimate actions"],
    parentCapability: "documents.estimates",
  },
  {
    kind: "action",
    id: "actions.documents.invoices.create_from_advance_invoice",
    label: "Show Create invoice from advance invoice",
    description: "Keep the advance-invoice-to-invoice conversion action visible on advance invoice view.",
    group: "documents",
    affectedSurfaces: ["advance invoice actions"],
    parentCapability: "documents.advance_invoices",
  },
  {
    kind: "action",
    id: "actions.documents.invoices.create_from_delivery_note",
    label: "Show Create invoice from delivery note",
    description: "Keep the delivery-note-to-invoice conversion action visible on delivery note view.",
    group: "documents",
    affectedSurfaces: ["delivery note actions"],
    parentCapability: "documents.delivery_notes",
  },
  {
    kind: "action",
    id: "actions.documents.recurring_invoices.create_from_invoice",
    label: "Show Create recurring from invoice",
    description: "Keep the recurring invoice CTA visible on invoice view.",
    group: "documents",
    affectedSurfaces: ["invoice actions"],
    parentCapability: "documents.recurring_invoices",
    subscriptionFeatureDependency: "recurring",
  },
];

export const WHITE_LABEL_CAPABILITY_IDS = WHITE_LABEL_CAPABILITIES.map((capability) => capability.id);
export const WHITE_LABEL_ACTION_CONTROL_IDS = WHITE_LABEL_ACTION_CONTROLS.map((control) => control.id);
export const WHITE_LABEL_HIDDEN_FEATURE_IDS = [...WHITE_LABEL_CAPABILITY_IDS, ...WHITE_LABEL_ACTION_CONTROL_IDS];

type WhiteLabelFutureFeatureVisibilityInput = {
  hiddenFeatures: string[];
  hideNewFeaturesByDefault?: boolean;
  reviewedFeatureCatalogIds?: string[];
  currentCatalogIds?: string[];
};

const DOCUMENT_CAPABILITY_MAP: Partial<Record<WhiteLabelDocumentType, WhiteLabelCapabilityId>> = {
  estimate: "documents.estimates",
  credit_note: "documents.credit_notes",
  advance_invoice: "documents.advance_invoices",
  delivery_note: "documents.delivery_notes",
};

const DOCUMENT_TRANSITION_ACTION_CONTROL_MAP: Partial<
  Record<`${WhiteLabelDocumentType}->${WhiteLabelDocumentType}`, WhiteLabelActionControlId>
> = {
  "invoice->credit_note": "actions.documents.credit_notes.create_from_invoice",
  "estimate->invoice": "actions.documents.invoices.create_from_estimate",
  "advance_invoice->invoice": "actions.documents.invoices.create_from_advance_invoice",
  "delivery_note->invoice": "actions.documents.invoices.create_from_delivery_note",
};

const DOCUMENT_CREATE_ACTION_CONTROL_MAP: Record<WhiteLabelCreatableResourceType, WhiteLabelActionControlId> = {
  invoice: "actions.documents.invoice.create",
  estimate: "actions.documents.estimate.create",
  credit_note: "actions.documents.credit_note.create",
  advance_invoice: "actions.documents.advance_invoice.create",
  delivery_note: "actions.documents.delivery_note.create",
  recurring_invoice: "actions.documents.recurring_invoices.create",
};

const DOCUMENT_DRAFT_ACTION_CONTROL_MAP: Record<WhiteLabelDocumentType, WhiteLabelActionControlId> = {
  invoice: "actions.documents.invoice.save_draft",
  estimate: "actions.documents.estimate.save_draft",
  credit_note: "actions.documents.credit_note.save_draft",
  advance_invoice: "actions.documents.advance_invoice.save_draft",
  delivery_note: "actions.documents.delivery_note.save_draft",
};

const DOCUMENT_VOID_ACTION_CONTROL_MAP: Record<WhiteLabelVoidableDocumentType, WhiteLabelActionControlId> = {
  invoice: "actions.documents.invoice.void",
  credit_note: "actions.documents.credit_note.void",
  advance_invoice: "actions.documents.advance_invoice.void",
  delivery_note: "actions.documents.delivery_note.void",
};

const DOCUMENT_PAYMENTS_ACTION_CONTROL_MAP: Record<WhiteLabelPayableDocumentType, WhiteLabelActionControlId> = {
  invoice: "actions.documents.invoice.payments.manage",
  credit_note: "actions.documents.credit_note.payments.manage",
  advance_invoice: "actions.documents.advance_invoice.payments.manage",
};

export function getWhiteLabelCapability(id: string): WhiteLabelCapabilityDefinition | undefined {
  return WHITE_LABEL_CAPABILITIES.find((capability) => capability.id === id);
}

export function getWhiteLabelActionControl(id: string): WhiteLabelActionControlDefinition | undefined {
  return WHITE_LABEL_ACTION_CONTROLS.find((control) => control.id === id);
}

export function getCurrentWhiteLabelCatalogIds(): WhiteLabelHiddenFeatureId[] {
  return [...WHITE_LABEL_HIDDEN_FEATURE_IDS];
}

export function getAutoHiddenWhiteLabelFeatureIds({
  hideNewFeaturesByDefault = false,
  reviewedFeatureCatalogIds = [],
  currentCatalogIds = WHITE_LABEL_HIDDEN_FEATURE_IDS,
}: Omit<WhiteLabelFutureFeatureVisibilityInput, "hiddenFeatures">): string[] {
  if (!hideNewFeaturesByDefault) {
    return [];
  }

  const reviewedIds = new Set(reviewedFeatureCatalogIds);

  return currentCatalogIds.filter((featureId) => !reviewedIds.has(featureId));
}

export function getEffectiveWhiteLabelHiddenFeatures({
  hiddenFeatures,
  hideNewFeaturesByDefault = false,
  reviewedFeatureCatalogIds = [],
  currentCatalogIds = WHITE_LABEL_HIDDEN_FEATURE_IDS,
}: WhiteLabelFutureFeatureVisibilityInput): string[] {
  const effectiveHiddenFeatures = new Set(hiddenFeatures);

  for (const featureId of getAutoHiddenWhiteLabelFeatureIds({
    hideNewFeaturesByDefault,
    reviewedFeatureCatalogIds,
    currentCatalogIds,
  })) {
    effectiveHiddenFeatures.add(featureId);
  }

  return [...effectiveHiddenFeatures];
}

export function getWhiteLabelCapabilityForDocumentType(
  documentType: WhiteLabelDocumentType | string | null | undefined,
): WhiteLabelCapabilityId | null {
  if (!documentType) return null;
  return DOCUMENT_CAPABILITY_MAP[documentType as WhiteLabelDocumentType] ?? null;
}

export function getWhiteLabelActionControlForDocumentTransition(
  sourceType: WhiteLabelDocumentType | string | null | undefined,
  targetType: WhiteLabelDocumentType | string | null | undefined,
): WhiteLabelActionControlId | null {
  if (!sourceType || !targetType) return null;

  return (
    DOCUMENT_TRANSITION_ACTION_CONTROL_MAP[
      `${sourceType as WhiteLabelDocumentType}->${targetType as WhiteLabelDocumentType}`
    ] ?? null
  );
}

export function getWhiteLabelActionControlForDocumentCreate(
  documentType: WhiteLabelCreatableResourceType | string | null | undefined,
): WhiteLabelActionControlId | null {
  if (!documentType) return null;
  return DOCUMENT_CREATE_ACTION_CONTROL_MAP[documentType as WhiteLabelCreatableResourceType] ?? null;
}

export function getWhiteLabelActionControlForDocumentDraft(
  documentType: WhiteLabelDocumentType | string | null | undefined,
): WhiteLabelActionControlId | null {
  if (!documentType) return null;
  return DOCUMENT_DRAFT_ACTION_CONTROL_MAP[documentType as WhiteLabelDocumentType] ?? null;
}

export function getWhiteLabelActionControlForDocumentVoid(
  documentType: WhiteLabelVoidableDocumentType | string | null | undefined,
): WhiteLabelActionControlId | null {
  if (!documentType) return null;
  return DOCUMENT_VOID_ACTION_CONTROL_MAP[documentType as WhiteLabelVoidableDocumentType] ?? null;
}

export function getWhiteLabelActionControlForDocumentPayments(
  documentType: WhiteLabelPayableDocumentType | string | null | undefined,
): WhiteLabelActionControlId | null {
  if (!documentType) return null;
  return DOCUMENT_PAYMENTS_ACTION_CONTROL_MAP[documentType as WhiteLabelPayableDocumentType] ?? null;
}

function entityHasCountryFeature(entity: Entity | null | undefined, feature: CountryFeatureDependency): boolean {
  return entity?.country_rules?.features?.includes(feature) ?? false;
}

type WhiteLabelCapabilityVisibilityInput = {
  capability: WhiteLabelCapabilityId;
  hiddenFeatures: string[];
  entity?: Entity | null;
  entityCount?: number;
};

type WhiteLabelActionControlVisibilityInput = {
  control: WhiteLabelActionControlId;
  hiddenFeatures: string[];
  entity?: Entity | null;
  entityCount?: number;
};

export function isWhiteLabelCapabilityAvailable({
  capability,
  entity,
}: Omit<WhiteLabelCapabilityVisibilityInput, "hiddenFeatures">): boolean {
  if (capability === "multi_entity") {
    return true;
  }

  const definition = getWhiteLabelCapability(capability);
  if (!definition?.countryFeatureDependency) {
    return true;
  }

  return entityHasCountryFeature(entity, definition.countryFeatureDependency);
}

export function isWhiteLabelCapabilityVisible({
  capability,
  hiddenFeatures,
  entity,
  entityCount,
}: WhiteLabelCapabilityVisibilityInput): boolean {
  if (!isWhiteLabelCapabilityAvailable({ capability, entity, entityCount })) {
    return false;
  }

  if (capability === "multi_entity" && (entityCount ?? 0) === 0) {
    return true;
  }

  return !hiddenFeatures.includes(capability);
}

export function isWhiteLabelUiControlVisible({
  control,
  hiddenFeatures,
  entity,
  entityCount,
}: WhiteLabelActionControlVisibilityInput): boolean {
  const definition = getWhiteLabelActionControl(control);
  if (!definition) {
    return true;
  }

  if (definition.parentCapability) {
    if (
      !isWhiteLabelCapabilityVisible({
        capability: definition.parentCapability,
        hiddenFeatures,
        entity,
        entityCount,
      })
    ) {
      return false;
    }
  }

  return !hiddenFeatures.includes(control);
}
