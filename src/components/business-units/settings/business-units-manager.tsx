import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { files } from "@spaceinvoices/js-sdk";
import { Building2, Filter, Mail, MoreHorizontal, Palette, Plus, Settings2, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SmartCodeInsertButton } from "@/ui/components/documents/create/smart-code-insert-button";
import { ImageUploadWithCrop } from "@/ui/components/entities/entity-settings-form/image-upload-with-crop";
import { InputWithPreview } from "@/ui/components/entities/entity-settings-form/input-with-preview";
import { getPdfTemplateOption, PDF_TEMPLATE_IDS, PDF_TEMPLATE_OPTIONS } from "@/ui/components/entities/settings/pdf-template-selector";
import {
  SettingsResourceListCard,
  SettingsResourceListEmptyState,
  SettingsResourceListItem,
  SettingsResourceListItemActions,
  SettingsResourceListItemBadges,
  SettingsResourceListItemBody,
  SettingsResourceListItemDescription,
  SettingsResourceListItemTitleRow,
} from "@/ui/components/settings-resource-list";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { Switch } from "@/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import pdfTemplateSelectorSlTranslations from "@/ui/components/entities/settings/pdf-template-selector/locales/sl";
import { BusinessUnitEmptyState } from "./business-unit-empty-state";

const translations = {
  sl: {
    ...pdfTemplateSelectorSlTranslations,
    "Account name": "Naziv računa",
    "Add unit / brand": "Dodaj enoto / blagovno znamko",
    Address: "Naslov",
    "Address and contact": "Naslov in kontakt",
    "Address line 2": "Naslov 2. vrstica",
    "Adjust logo size for documents that use this unit branding.": "Prilagodite velikost logotipa za dokumente, izdane iz te enote.",
    "Advance Invoice": "Avansni račun",
    Archive: "Arhiviraj",
    "Archive this business unit?": "Arhiviram to poslovno enoto?",
    Archived: "Arhivirano",
    "Advance invoice note": "Opomba za avansni račun",
    "Bank name": "Naziv banke",
    "Brand assets uploaded": "Naloženi grafični elementi",
    Branding: "Celostna podoba",
    "Unit / brand archived": "Enota / blagovna znamka je arhivirana",
    "BIC / SWIFT": "BIC / SWIFT",
    "Unit / Brand": "Enota / blagovna znamka",
    "Unit / brand created": "Enota / blagovna znamka je ustvarjena",
    "Units / Brands": "Enote / blagovne znamke",
    Cancel: "Prekliči",
    City: "Mesto",
    "Company number": "Matična številka",
    "Credit Note": "Dobropis",
    "Credit note note": "Opomba za dobropis",
    "Credit note payment terms": "Plačilni pogoji za dobropis",
    "Delivery Note": "Dobavnica",
    "Delivery note note": "Opomba za dobavnico",
    Defaults: "Privzete vrednosti",
    "Document type defaults": "Privzete vrednosti po vrsti dokumenta",
    "Active only": "Samo aktivne",
    All: "Vse",
    Actions: "Dejanja",
    Filter: "Filter",
    "Create a unit / brand first, then configure its branding, defaults, and payment details from the settings panel.":
      "Najprej ustvarite enoto / blagovno znamko, nato pa v nastavitvah uredite celostno podobo, privzete vrednosti in plačilne podatke.",
    "Create a unit / brand, then open its settings only when you need to change something.":
      "Ustvarite enoto / blagovno znamko, nato pa odprite njene nastavitve samo takrat, ko želite nekaj spremeniti.",
    "Create unit / brand": "Ustvari enoto / blagovno znamko",
    "Create first unit / brand": "Ustvari prvo enoto / blagovno znamko",
    "Create your first unit / brand": "Ustvarite svojo prvo enoto / blagovno znamko",
    "This hides the unit from new documents and integrations, but keeps existing references intact.":
      "To skrije enoto pri novih dokumentih in integracijah, obstoječe povezave pa ostanejo nespremenjene.",
    "Document defaults": "Privzete vrednosti dokumentov",
    "Document footer": "Noga dokumenta",
    "Document signature": "Podpis dokumenta",
    "Edit settings": "Uredi nastavitve",
    Email: "E-pošta",
    "Email defaults": "Privzete e-poštne nastavitve",
    "Entity default": "Privzeto za podjetje",
    "Entity default template": "Privzeta predloga podjetja",
    Estimate: "Predračun",
    "Estimate email body": "Besedilo e-pošte za predračun",
    "Estimate email subject": "Zadeva e-pošte za predračun",
    "Estimate note": "Opomba za predračun",
    "Estimate payment terms": "Plačilni pogoji za predračun",
    General: "Splošno",
    "Hide delivery note prices": "Skrij cene na dobavnici",
    IBAN: "IBAN",
    Invoice: "Račun",
    "Invoice defaults set": "Nastavljene privzete vrednosti računa",
    "Invoice email body": "Besedilo e-pošte za račun",
    "Invoice email subject": "Zadeva e-pošte za račun",
    "Invoice note": "Opomba za račun",
    "Invoice payment terms": "Plačilni pogoji za račun",
    "Loading...": "Nalaganje ...",
    Logo: "Logotip",
    "Logo scale %": "Velikost logotipa %",
    "Manage branding, addresses, defaults, and payment details for this unit / brand.":
      "Upravljajte celostno podobo, naslove, privzete vrednosti in plačilne podatke za to enoto / blagovno znamko.",
    Name: "Naziv",
    "No units / brands to show.": "Ni enot / blagovnih znamk za prikaz.",
    "No active units / brands to show.": "Ni aktivnih enot / blagovnih znamk za prikaz.",
    "No archived units / brands to show.": "Ni arhiviranih enot / blagovnih znamk za prikaz.",
    "Overrides the main entity accent color for document rendering.": "Preglasi glavno poudarjeno barvo podjetja pri izrisu dokumentov.",
    "Payment accounts": "Plačilni računi",
    "PDF template": "PDF predloga",
    Phone: "Telefon",
    "Post code": "Poštna številka",
    "Primary color": "Primarna barva",
    Save: "Shrani",
    "Saved successfully": "Uspešno shranjeno",
    Summary: "Povzetek",
    "Show archived": "Prikaži arhivirane",
    "Shown under the main entity name when this unit is selected.": "Prikaže se pod glavnim imenom podjetja, ko je ta enota izbrana.",
    Signature: "Podpis",
    "Start with a name. You can configure branding, addresses, defaults, and payment details after the unit is created.":
      "Začnite z nazivom. Celostno podobo, naslove, privzete vrednosti in plačilne podatke lahko uredite po ustvarjanju enote.",
    State: "Regija",
    "Show payment amounts": "Prikaži zneske plačil",
    "Shared defaults": "Skupne privzete vrednosti",
    "These details override the main entity when this unit is selected on a document.":
      "Ti podatki preglasijo glavno podjetje, ko je ta enota izbrana na dokumentu.",
    "These values are used when new documents are created from this unit.":
      "Te vrednosti se uporabijo, ko iz te enote ustvarite nov dokument.",
    "Tax number": "Davčna številka",
    "Unit address": "Naslov enote",
    "Unit city": "Mesto enote",
    "Unit country": "Država enote",
    "Unit email": "E-pošta enote",
    "Unit name": "Naziv enote",
    "Unit post code": "Poštna številka enote",
    "Upload a dedicated logo for documents issued from this unit.": "Naložite namenski logotip za dokumente, izdane iz te enote.",
    "Upload a signature image for PDFs issued from this unit.": "Naložite sliko podpisa za PDF-je, izdane iz te enote.",
    "Use the entity template unless this unit needs a different layout.":
      "Uporabite predlogo podjetja, razen če ta enota potrebuje drugačno postavitev.",
    Units: "Enote",
    "Use negative credit note values": "Uporabi negativne vrednosti na dobropisu",
    "Use units / brands for alternate branding, addresses, defaults, and integration-specific document behavior.":
      "Enote / blagovne znamke uporabite za drugo celostno podobo, naslove, privzete vrednosti in vedenje dokumentov, vezano na integracije.",
    "Uses main entity address and defaults.": "Uporablja glavni naslov in privzete vrednosti podjetja.",
    Website: "Spletna stran",
    "Insert variable": "Vstavi spremenljivko",
  },
} as const;

type UnitFilterMode = "active" | "archived" | "all";

const createUnitSchema = z.object({
  name: z.string().trim().min(1),
});

const settingsSchema = z.object({
  name: z.string().min(1),
  address: z.string().nullish(),
  address_2: z.string().nullish(),
  post_code: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  country: z.string().nullish(),
  country_code: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  website: z.string().nullish(),
  pdf_template: z.enum(PDF_TEMPLATE_IDS).nullish(),
  primary_color: z.string().nullish(),
  logo_scale_percent: z.coerce.number().int().min(30).max(100).nullish(),
  default_invoice_note: z.string().nullish(),
  default_invoice_payment_terms: z.string().nullish(),
  default_estimate_note: z.string().nullish(),
  default_estimate_payment_terms: z.string().nullish(),
  default_credit_note_note: z.string().nullish(),
  default_credit_note_payment_terms: z.string().nullish(),
  default_advance_invoice_note: z.string().nullish(),
  default_delivery_note_note: z.string().nullish(),
  document_footer: z.string().nullish(),
  default_document_signature: z.string().nullish(),
  invoice_email_subject: z.string().nullish(),
  invoice_email_body: z.string().nullish(),
  estimate_email_subject: z.string().nullish(),
  estimate_email_body: z.string().nullish(),
  bank_account_iban: z.string().nullish(),
  bank_account_name: z.string().nullish(),
  bank_account_bank_name: z.string().nullish(),
  bank_account_bic: z.string().nullish(),
  delivery_note_hide_prices: z.boolean().default(false),
  credit_note_negative_values: z.boolean().default(false),
  show_payment_amounts: z.boolean().default(false),
});

type CreateUnitValues = z.infer<typeof createUnitSchema>;
type BusinessUnitFormValues = z.input<typeof settingsSchema>;

type ManagedBusinessUnit = {
  id: string;
  entity_id: string;
  name: string;
  address?: string | null;
  address_2?: string | null;
  post_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  country_code?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_file_id?: string | null;
  signature_file_id?: string | null;
  settings?: Record<string, unknown> | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
};

type BusinessUnitsManagerProps = {
  entity: Entity;
  entityId: string;
  units: ManagedBusinessUnit[];
  isLoading?: boolean;
  includeArchived: boolean;
  onIncludeArchivedChange: (value: boolean) => void;
  onCreate: (data: Record<string, unknown>) => Promise<ManagedBusinessUnit>;
  onUpdate: (args: { id: string; data: Record<string, unknown> }) => Promise<unknown>;
  onArchive: (id: string) => Promise<unknown>;
  isCreatePending?: boolean;
  isUpdatePending?: boolean;
  isArchivePending?: boolean;
} & ComponentTranslationProps;

const sectionTabs = [
  { value: "general", label: "General", icon: Settings2 },
  { value: "branding", label: "Branding", icon: Palette },
  { value: "defaults", label: "Defaults", icon: Building2 },
  { value: "email", label: "Email defaults", icon: Mail },
  { value: "payments", label: "Payment accounts", icon: Wallet },
] as const;

const addressFields = [
  ["address", "Address"],
  ["address_2", "Address line 2"],
  ["post_code", "Post code"],
  ["city", "City"],
  ["state", "State"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["website", "Website"],
] as const;

const defaultsFields = [
  ["default_invoice_note", "Invoice note"],
  ["default_invoice_payment_terms", "Invoice payment terms"],
  ["default_estimate_note", "Estimate note"],
  ["default_estimate_payment_terms", "Estimate payment terms"],
  ["default_credit_note_note", "Credit note note"],
  ["default_credit_note_payment_terms", "Credit note payment terms"],
  ["default_advance_invoice_note", "Advance invoice note"],
  ["default_delivery_note_note", "Delivery note note"],
  ["document_footer", "Document footer"],
  ["default_document_signature", "Document signature"],
] as const;

const documentDefaultsTabs = [
  {
    value: "invoice",
    label: "Invoice",
    fields: [
      ["default_invoice_note", "Invoice note"],
      ["default_invoice_payment_terms", "Invoice payment terms"],
    ] as const,
  },
  {
    value: "estimate",
    label: "Estimate",
    fields: [
      ["default_estimate_note", "Estimate note"],
      ["default_estimate_payment_terms", "Estimate payment terms"],
    ] as const,
  },
  {
    value: "credit_note",
    label: "Credit Note",
    fields: [
      ["default_credit_note_note", "Credit note note"],
      ["default_credit_note_payment_terms", "Credit note payment terms"],
    ] as const,
  },
  {
    value: "advance_invoice",
    label: "Advance Invoice",
    fields: [["default_advance_invoice_note", "Advance invoice note"]] as const,
  },
  {
    value: "delivery_note",
    label: "Delivery Note",
    fields: [["default_delivery_note_note", "Delivery note note"]] as const,
  },
] as const;

const sharedDefaultsFields = [
  ["document_footer", "Document footer"],
  ["default_document_signature", "Document signature"],
] as const;

const emailTemplateTabs = [
  {
    value: "invoice",
    label: "Invoice",
    subject: "invoice_email_subject",
    body: "invoice_email_body",
  },
  {
    value: "estimate",
    label: "Estimate",
    subject: "estimate_email_subject",
    body: "estimate_email_body",
  },
] as const;

function noopImageValueChange() {
  return;
}

function formatUnitSummary(unit: ManagedBusinessUnit, t: (key: string) => string) {
  const parts = [formatLocation(unit), unit.email, unit.website].filter(Boolean);
  if (parts.length === 0) return t("Uses main entity address and defaults.");
  return parts.join(" • ");
}

function toFormValues(unit?: ManagedBusinessUnit | null): BusinessUnitFormValues {
  const settings = (unit?.settings as Record<string, any> | undefined) ?? {};
  const bankAccount = settings.bank_accounts?.[0] ?? {};

  return {
    name: unit?.name ?? "",
    address: unit?.address ?? "",
    address_2: unit?.address_2 ?? "",
    post_code: unit?.post_code ?? "",
    city: unit?.city ?? "",
    state: unit?.state ?? "",
    country: unit?.country ?? "",
    country_code: unit?.country_code ?? "",
    email: unit?.email ?? "",
    phone: unit?.phone ?? "",
    website: unit?.website ?? "",
    pdf_template: settings.pdf_template ?? null,
    primary_color: settings.primary_color ?? "",
    logo_scale_percent: settings.logo_scale_percent ?? 100,
    default_invoice_note: settings.default_invoice_note ?? "",
    default_invoice_payment_terms: settings.default_invoice_payment_terms ?? "",
    default_estimate_note: settings.default_estimate_note ?? "",
    default_estimate_payment_terms: settings.default_estimate_payment_terms ?? "",
    default_credit_note_note: settings.default_credit_note_note ?? "",
    default_credit_note_payment_terms: settings.default_credit_note_payment_terms ?? "",
    default_advance_invoice_note: settings.default_advance_invoice_note ?? "",
    default_delivery_note_note: settings.default_delivery_note_note ?? "",
    document_footer: settings.document_footer ?? "",
    default_document_signature: settings.default_document_signature ?? "",
    invoice_email_subject: settings.email_defaults?.invoice_subject ?? "",
    invoice_email_body: settings.email_defaults?.invoice_body ?? "",
    estimate_email_subject: settings.email_defaults?.estimate_subject ?? "",
    estimate_email_body: settings.email_defaults?.estimate_body ?? "",
    bank_account_iban: bankAccount.iban ?? "",
    bank_account_name: bankAccount.name ?? "",
    bank_account_bank_name: bankAccount.bank_name ?? "",
    bank_account_bic: bankAccount.bic ?? "",
    delivery_note_hide_prices: settings.delivery_note_hide_prices ?? false,
    credit_note_negative_values: settings.credit_note_negative_values ?? false,
    show_payment_amounts: settings.show_payment_amounts ?? false,
  };
}

function toPayload(values: BusinessUnitFormValues) {
  const normalizedCountry = values.country?.trim() || null;

  return {
    name: values.name.trim(),
    address: values.address?.trim() || null,
    address_2: values.address_2?.trim() || null,
    post_code: values.post_code?.trim() || null,
    city: values.city?.trim() || null,
    state: values.state?.trim() || null,
    country: normalizedCountry,
    country_code: normalizedCountry ? values.country_code?.trim() || null : null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    website: values.website?.trim() || null,
    settings: {
      pdf_template: values.pdf_template || undefined,
      primary_color: values.primary_color?.trim() || undefined,
      logo_scale_percent: values.logo_scale_percent ?? undefined,
      default_invoice_note: values.default_invoice_note?.trim() || undefined,
      default_invoice_payment_terms: values.default_invoice_payment_terms?.trim() || undefined,
      default_estimate_note: values.default_estimate_note?.trim() || undefined,
      default_estimate_payment_terms: values.default_estimate_payment_terms?.trim() || undefined,
      default_credit_note_note: values.default_credit_note_note?.trim() || undefined,
      default_credit_note_payment_terms: values.default_credit_note_payment_terms?.trim() || undefined,
      default_advance_invoice_note: values.default_advance_invoice_note?.trim() || undefined,
      default_delivery_note_note: values.default_delivery_note_note?.trim() || undefined,
      document_footer: values.document_footer?.trim() || undefined,
      default_document_signature: values.default_document_signature?.trim() || undefined,
      email_defaults: {
        invoice_subject: values.invoice_email_subject?.trim() || undefined,
        invoice_body: values.invoice_email_body?.trim() || undefined,
        estimate_subject: values.estimate_email_subject?.trim() || undefined,
        estimate_body: values.estimate_email_body?.trim() || undefined,
      },
      bank_accounts: values.bank_account_iban?.trim()
        ? [
            {
              type: "iban",
              iban: values.bank_account_iban.trim(),
              name: values.bank_account_name?.trim() || undefined,
              bank_name: values.bank_account_bank_name?.trim() || undefined,
              bic: values.bank_account_bic?.trim() || undefined,
              is_default: true,
            },
          ]
        : [],
      delivery_note_hide_prices: values.delivery_note_hide_prices ?? false,
      credit_note_negative_values: values.credit_note_negative_values ?? false,
      show_payment_amounts: values.show_payment_amounts ?? false,
    },
  };
}

function formatLocation(unit: ManagedBusinessUnit) {
  return [unit.address, unit.address_2, [unit.post_code, unit.city].filter(Boolean).join(" "), unit.country]
    .filter(Boolean)
    .join(", ");
}

function BusinessUnitCreateDialog({
  open,
  onOpenChange,
  onCreate,
  isPending,
  onCreated,
  t: translateProp,
  namespace,
  locale,
  translationLocale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: Record<string, unknown>) => Promise<ManagedBusinessUnit>;
  onCreated: (unit: ManagedBusinessUnit) => void;
  isPending?: boolean;
} & ComponentTranslationProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });
  const form = useForm<CreateUnitValues>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: "" });
    }
  }, [form, open]);

  const onSubmit = async (values: CreateUnitValues) => {
    const created = await onCreate({
      name: values.name.trim(),
    });
    toast.success(t("Unit / brand created"));
    onCreated(created);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Create business unit")}</DialogTitle>
          <DialogDescription>
            {t("Start with a name. You can configure branding, addresses, defaults, and payment details after the unit is created.")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Name")}</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {t("Create business unit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function BusinessUnitSettingsEditor({
  entity,
  entityId,
  open,
  onOpenChange,
  unit,
  onUpdate,
  onRequestArchive,
  isUpdatePending,
  isArchivePending,
  t: translateProp,
  namespace,
  locale,
  translationLocale,
}: {
  entity: Entity;
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: ManagedBusinessUnit;
  onUpdate: (args: { id: string; data: Record<string, unknown> }) => Promise<unknown>;
  onRequestArchive: (unit: ManagedBusinessUnit) => void;
  isUpdatePending?: boolean;
  isArchivePending?: boolean;
} & ComponentTranslationProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });
  const [activeTab, setActiveTab] = useState<(typeof sectionTabs)[number]["value"]>("general");
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  const form = useForm<BusinessUnitFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: toFormValues(unit),
  });
  const watchedValues = form.watch();
  const invoiceNoteRef = useRef<HTMLTextAreaElement>(null);
  const invoicePaymentTermsRef = useRef<HTMLTextAreaElement>(null);
  const estimateNoteRef = useRef<HTMLTextAreaElement>(null);
  const estimatePaymentTermsRef = useRef<HTMLTextAreaElement>(null);
  const creditNoteNoteRef = useRef<HTMLTextAreaElement>(null);
  const creditNotePaymentTermsRef = useRef<HTMLTextAreaElement>(null);
  const advanceInvoiceNoteRef = useRef<HTMLTextAreaElement>(null);
  const deliveryNoteNoteRef = useRef<HTMLTextAreaElement>(null);
  const documentFooterRef = useRef<HTMLTextAreaElement>(null);
  const documentSignatureRef = useRef<HTMLTextAreaElement>(null);
  const invoiceEmailSubjectRef = useRef<HTMLInputElement>(null);
  const invoiceEmailBodyRef = useRef<HTMLTextAreaElement>(null);
  const estimateEmailSubjectRef = useRef<HTMLInputElement>(null);
  const estimateEmailBodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    form.reset(toFormValues(unit));
    setActiveTab("general");
  }, [form, unit]);

  useEffect(() => {
    async function loadFiles() {
      const result = await files.list({ entity_id: entityId, business_unit_id: unit.id } as any);
      setLogoUrl(result.data.find((file) => file.category === "logo")?.secureUrl || "");
      setSignatureUrl(result.data.find((file) => file.category === "signature")?.secureUrl || "");
    }

    void loadFiles();
  }, [entityId, unit.id]);

  const handleUpload = async (kind: "logo" | "signature", file: File) => {
    if (kind === "logo") setIsUploadingLogo(true);
    else setIsUploadingSignature(true);

    try {
      const uploaded = await files.uploadFile(
        {
          file,
          category: kind,
          business_unit_id: unit.id,
        } as any,
        { entity_id: entityId } as any,
      );

      await onUpdate({
        id: unit.id,
        data: kind === "logo" ? { logo_file_id: uploaded.id } : { signature_file_id: uploaded.id },
      });

      if (kind === "logo") setLogoUrl(uploaded.secureUrl);
      else setSignatureUrl(uploaded.secureUrl);

      toast.success(t("Saved successfully"));
      return { secureUrl: uploaded.secureUrl };
    } finally {
      if (kind === "logo") setIsUploadingLogo(false);
      else setIsUploadingSignature(false);
    }
  };

  const onSubmit = async (values: BusinessUnitFormValues) => {
    await onUpdate({ id: unit.id, data: toPayload(values) });
    toast.success(t("Saved successfully"));
    onOpenChange(false);
  };

  const previewBankAccounts = useMemo(
    () =>
      watchedValues.bank_account_iban?.trim()
        ? [
            {
              type: "iban",
              iban: watchedValues.bank_account_iban.trim(),
              name: watchedValues.bank_account_name?.trim() || undefined,
              bank_name: watchedValues.bank_account_bank_name?.trim() || undefined,
              bic: watchedValues.bank_account_bic?.trim() || undefined,
              is_default: true,
            },
          ]
        : null,
    [
      watchedValues.bank_account_bic,
      watchedValues.bank_account_bank_name,
      watchedValues.bank_account_iban,
      watchedValues.bank_account_name,
    ],
  );

  const previewDocument = useMemo(
    () => ({
      issuer: {
        unit_name: watchedValues.name || null,
        email: watchedValues.email || null,
        address: watchedValues.address || null,
        post_code: watchedValues.post_code || null,
        city: watchedValues.city || null,
        country: watchedValues.country || null,
      },
      business_unit: {
        name: watchedValues.name || null,
        email: watchedValues.email || null,
        address: watchedValues.address || null,
        post_code: watchedValues.post_code || null,
        city: watchedValues.city || null,
        country: watchedValues.country || null,
        settings: {
          bank_accounts: previewBankAccounts,
        },
      },
    }),
    [
      watchedValues.address,
      watchedValues.bank_account_bic,
      watchedValues.bank_account_bank_name,
      watchedValues.bank_account_iban,
      watchedValues.bank_account_name,
      watchedValues.city,
      watchedValues.country,
      watchedValues.email,
      watchedValues.name,
      watchedValues.post_code,
      previewBankAccounts,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg">{unit.name}</DialogTitle>
              {unit.deleted_at ? <Badge variant="secondary">{t("Archived")}</Badge> : null}
            </div>
            <DialogDescription>
              {t("Manage branding, addresses, defaults, and payment details for this unit / brand.")}
            </DialogDescription>
          </div>
        </div>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as (typeof sectionTabs)[number]["value"])}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            {sectionTabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-2">
                <Icon className="h-4 w-4" />
                {t(label)}
              </TabsTrigger>
            ))}
          </TabsList>
            <div className="space-y-6 pt-6">
              <TabsContent value="general" className="mt-0 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-base">{t("Name")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          {t("Shown under the main entity name when this unit is selected.")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h3 className="font-medium text-sm">{t("Address and contact")}</h3>
                    <p className="text-muted-foreground text-sm">
                      {t("These details override the main entity when this unit is selected on a document.")}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {addressFields.map(([name, label]) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-sm">{t(label)}</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="branding" className="mt-0 space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="pdf_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-sm">{t("PDF template")}</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("Entity default")}>
                            {field.value ? t(getPdfTemplateOption(field.value)?.nameKey ?? field.value) : t("Entity default")}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">{t("Entity default")}</SelectItem>
                            {PDF_TEMPLATE_OPTIONS.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {t(template.nameKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">{t("Use the entity template unless this unit needs a different layout.")}</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-sm">{t("Primary color")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="#1d4ed8" />
                        </FormControl>
                        <FormDescription className="text-xs">{t("Overrides the main entity accent color for document rendering.")}</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="logo_scale_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-sm">{t("Logo scale %")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={typeof field.value === "number" ? field.value : ""}
                            onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">{t("Adjust logo size for documents that use this unit branding.")}</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
                  <div>
                    <div className="mb-2 font-medium text-base">{t("Logo")}</div>
                    <ImageUploadWithCrop
                      value={logoUrl}
                      onChange={noopImageValueChange}
                      onUpload={(file) => handleUpload("logo", file)}
                      translate={t}
                      isUploading={isUploadingLogo}
                    />
                    <p className="mt-2 text-muted-foreground text-xs">{t("Upload a dedicated logo for documents issued from this unit.")}</p>
                  </div>
                  <div>
                    <div className="mb-2 font-medium text-base">{t("Signature")}</div>
                    <ImageUploadWithCrop
                      value={signatureUrl}
                      onChange={noopImageValueChange}
                      onUpload={(file) => handleUpload("signature", file)}
                      translate={t}
                      isUploading={isUploadingSignature}
                      imageType="signature"
                    />
                    <p className="mt-2 text-muted-foreground text-xs">{t("Upload a signature image for PDFs issued from this unit.")}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="defaults" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm">{t("Document defaults")}</h3>
                    <p className="text-muted-foreground text-sm">
                      {t("These values are used when new documents are created from this unit.")}
                    </p>
                  </div>
                  <div className="border-t pt-6">
                    <div className="mb-4 font-medium text-muted-foreground text-xs">{t("Document type defaults")}</div>
                    <Tabs defaultValue="invoice" className="w-full">
                      <TabsList className="h-auto w-full flex-wrap justify-start">
                        {documentDefaultsTabs.map((tab) => (
                          <TabsTrigger key={tab.value} value={tab.value} className="cursor-pointer">
                            {t(tab.label)}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {documentDefaultsTabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            {tab.fields.map(([name, label]) => (
                              <FormField
                                key={name}
                                control={form.control}
                                name={name}
                                render={({ field }) => (
                                  <FormItem className={tab.fields.length === 1 ? "md:col-span-2" : ""}>
                                    <div className="flex items-center justify-between">
                                      <FormLabel className="font-medium text-sm">{t(label)}</FormLabel>
                                      <SmartCodeInsertButton
                                        textareaRef={
                                          (name === "default_invoice_note"
                                            ? invoiceNoteRef
                                            : name === "default_invoice_payment_terms"
                                              ? invoicePaymentTermsRef
                                              : name === "default_estimate_note"
                                                ? estimateNoteRef
                                                : name === "default_estimate_payment_terms"
                                                  ? estimatePaymentTermsRef
                                                  : name === "default_credit_note_note"
                                                    ? creditNoteNoteRef
                                                    : name === "default_credit_note_payment_terms"
                                                      ? creditNotePaymentTermsRef
                                                      : name === "default_advance_invoice_note"
                                                        ? advanceInvoiceNoteRef
                                                        : deliveryNoteNoteRef) as React.RefObject<HTMLTextAreaElement | null>
                                        }
                                        value={field.value ?? ""}
                                        onInsert={field.onChange}
                                        t={t}
                                      />
                                    </div>
                                    <FormControl>
                                      <InputWithPreview
                                        ref={
                                          (name === "default_invoice_note"
                                            ? invoiceNoteRef
                                            : name === "default_invoice_payment_terms"
                                              ? invoicePaymentTermsRef
                                              : name === "default_estimate_note"
                                                ? estimateNoteRef
                                                : name === "default_estimate_payment_terms"
                                                  ? estimatePaymentTermsRef
                                                  : name === "default_credit_note_note"
                                                    ? creditNoteNoteRef
                                                    : name === "default_credit_note_payment_terms"
                                                      ? creditNotePaymentTermsRef
                                                      : name === "default_advance_invoice_note"
                                                        ? advanceInvoiceNoteRef
                                                        : deliveryNoteNoteRef) as React.RefObject<HTMLTextAreaElement | HTMLTextAreaElement>
                                        }
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        entity={entity}
                                        document={previewDocument}
                                        translatePreviewLabel={t}
                                        multiline
                                        rows={4}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                  <div className="border-t pt-6">
                    <div className="mb-4 font-medium text-muted-foreground text-xs">{t("Shared defaults")}</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {sharedDefaultsFields.map(([name, label]) => (
                        <FormField
                          key={name}
                          control={form.control}
                          name={name}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="font-medium text-sm">{t(label)}</FormLabel>
                                <SmartCodeInsertButton
                                  textareaRef={
                                    (name === "document_footer" ? documentFooterRef : documentSignatureRef) as React.RefObject<HTMLTextAreaElement | null>
                                  }
                                  value={field.value ?? ""}
                                  onInsert={field.onChange}
                                  t={t}
                                />
                              </div>
                              <FormControl>
                                <InputWithPreview
                                  ref={(name === "document_footer" ? documentFooterRef : documentSignatureRef) as React.RefObject<HTMLTextAreaElement | HTMLTextAreaElement>}
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  entity={entity}
                                  document={previewDocument}
                                  translatePreviewLabel={t}
                                  multiline
                                  rows={4}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 border-t pt-6 md:grid-cols-3">
                  {(
                    [
                      ["delivery_note_hide_prices", "Hide delivery note prices"],
                      ["credit_note_negative_values", "Use negative credit note values"],
                      ["show_payment_amounts", "Show payment amounts"],
                    ] as const
                  ).map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 rounded-lg border px-4 py-3">
                          <FormLabel className="mb-0 flex-1 font-medium text-sm leading-tight">{t(label)}</FormLabel>
                          <FormControl>
                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="email" className="mt-0 space-y-6">
                <div className="border-t pt-6">
                  <Tabs defaultValue="invoice" className="w-full">
                    <TabsList className="h-auto w-full justify-start">
                      {emailTemplateTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="cursor-pointer">
                          {t(tab.label)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {emailTemplateTabs.map((tab) => (
                      <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-4">
                        <FormField
                          control={form.control}
                          name={tab.subject}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="font-medium text-sm">{t(tab.label === "Invoice" ? "Invoice email subject" : "Estimate email subject")}</FormLabel>
                                <SmartCodeInsertButton
                                  textareaRef={(tab.value === "invoice" ? invoiceEmailSubjectRef : estimateEmailSubjectRef) as React.RefObject<HTMLTextAreaElement | null>}
                                  value={field.value ?? ""}
                                  onInsert={field.onChange}
                                  t={t}
                                />
                              </div>
                              <FormControl>
                                <InputWithPreview
                                  ref={(tab.value === "invoice" ? invoiceEmailSubjectRef : estimateEmailSubjectRef) as React.RefObject<HTMLInputElement | HTMLTextAreaElement>}
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  entity={entity}
                                  document={previewDocument}
                                  translatePreviewLabel={t}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={tab.body}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="font-medium text-sm">{t(tab.label === "Invoice" ? "Invoice email body" : "Estimate email body")}</FormLabel>
                                <SmartCodeInsertButton
                                  textareaRef={(tab.value === "invoice" ? invoiceEmailBodyRef : estimateEmailBodyRef) as React.RefObject<HTMLTextAreaElement | null>}
                                  value={field.value ?? ""}
                                  onInsert={field.onChange}
                                  t={t}
                                />
                              </div>
                              <FormControl>
                                <InputWithPreview
                                  ref={(tab.value === "invoice" ? invoiceEmailBodyRef : estimateEmailBodyRef) as React.RefObject<HTMLTextAreaElement | HTMLTextAreaElement>}
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  entity={entity}
                                  document={previewDocument}
                                  translatePreviewLabel={t}
                                  multiline
                                  rows={6}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="mt-0 space-y-6">
                <div className="grid gap-4 border-t pt-6 md:grid-cols-2">
                  {(
                    [
                      ["bank_account_iban", "IBAN"],
                      ["bank_account_name", "Account name"],
                      ["bank_account_bank_name", "Bank name"],
                      ["bank_account_bic", "BIC / SWIFT"],
                    ] as const
                  ).map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-sm">{t(label)}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </TabsContent>
            </div>
        </Tabs>
            <DialogFooter className="border-t pt-4 sm:justify-between">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("Cancel")}
                </Button>
                {!unit.deleted_at ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isArchivePending}
                    onClick={() => onRequestArchive(unit)}
                  >
                    {t("Archive")}
                  </Button>
                ) : null}
              </div>
              <Button type="submit" disabled={isUpdatePending}>
                {t("Save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function BusinessUnitsManager({
  entity,
  entityId,
  units,
  isLoading = false,
  includeArchived,
  onIncludeArchivedChange,
  onCreate,
  onUpdate,
  onArchive,
  isCreatePending,
  isUpdatePending,
  isArchivePending,
  t: translateProp,
  namespace,
  locale,
  translationLocale,
}: BusinessUnitsManagerProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [archiveTargetUnit, setArchiveTargetUnit] = useState<ManagedBusinessUnit | null>(null);
  const [filterMode, setFilterMode] = useState<UnitFilterMode>(includeArchived ? "all" : "active");

  const activeUnits = useMemo(() => units.filter((unit) => !unit.deleted_at && unit.is_active !== false), [units]);
  const visibleUnits = useMemo(
    () =>
      units.filter((unit) => {
        const isArchived = !!unit.deleted_at || unit.is_active === false;
        if (filterMode === "active") return !isArchived;
        if (filterMode === "archived") return isArchived;
        return true;
      }),
    [filterMode, units],
  );
  const editingUnit = visibleUnits.find((unit) => unit.id === editingUnitId) ?? null;

  const handleCreated = (unit: ManagedBusinessUnit) => {
    setEditingUnitId(unit.id);
  };

  const handleArchiveConfirmed = async () => {
    if (!archiveTargetUnit) return;
    await onArchive(archiveTargetUnit.id);
    toast.success(t("Unit / brand archived"));
    if (editingUnitId === archiveTargetUnit.id) {
      setEditingUnitId(null);
    }
    setArchiveTargetUnit(null);
  };

  const handleFilterModeChange = (value: string) => {
    const next = value as UnitFilterMode;
    setFilterMode(next);
    onIncludeArchivedChange(next !== "active");
  };

  const emptyMessage =
    filterMode === "archived"
      ? t("No archived units / brands to show.")
      : filterMode === "active"
        ? t("No active units / brands to show.")
        : t("No units / brands to show.");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-lg">{t("Units / Brands")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("Create a unit / brand first, then configure its branding, defaults, and payment details from the settings panel.")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("Add unit / brand")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground text-sm">{t("Loading...")}</CardContent>
        </Card>
      ) : activeUnits.length === 0 && !includeArchived ? (
        <BusinessUnitEmptyState t={t} onCreate={() => setCreateOpen(true)} />
      ) : (
        <SettingsResourceListCard
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base">{t("Units")}</div>
                <div className="mt-1 text-muted-foreground text-sm">
                  {t("Create a unit / brand, then open its settings only when you need to change something.")}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Filter className="mr-2 h-4 w-4" />
                    {t("Filter")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={filterMode} onValueChange={handleFilterModeChange}>
                    <DropdownMenuRadioItem value="active">{t("Active only")}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="archived">{t("Archived")}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="all">{t("All")}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        >
            {visibleUnits.length === 0 ? (
              <SettingsResourceListEmptyState>
                {emptyMessage}
              </SettingsResourceListEmptyState>
            ) : (
              visibleUnits.map((unit) => {
                const summary = formatUnitSummary(unit, t);
                const templateId = (unit.settings as any)?.pdf_template;
                const templateOption = templateId ? getPdfTemplateOption(templateId) : null;

                return (
                  <SettingsResourceListItem key={unit.id}>
                    <SettingsResourceListItemBody>
                      <SettingsResourceListItemTitleRow>
                        <span className="font-medium">{unit.name}</span>
                        {unit.deleted_at ? <Badge variant="secondary">{t("Archived")}</Badge> : null}
                      </SettingsResourceListItemTitleRow>
                      <SettingsResourceListItemDescription>
                        {summary}
                      </SettingsResourceListItemDescription>
                      <SettingsResourceListItemBadges>
                        <Badge variant="outline">
                          {templateOption ? t(templateOption.nameKey) : t("Entity default template")}
                        </Badge>
                        {(unit.settings as any)?.default_invoice_note ? (
                          <Badge variant="outline">{t("Invoice defaults set")}</Badge>
                        ) : null}
                        {unit.logo_file_id || unit.signature_file_id ? (
                          <Badge variant="outline">{t("Brand assets uploaded")}</Badge>
                        ) : null}
                      </SettingsResourceListItemBadges>
                    </SettingsResourceListItemBody>

                    <SettingsResourceListItemActions>
                      <Button type="button" variant="outline" onClick={() => setEditingUnitId(unit.id)}>
                        {t("Edit settings")}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" aria-label={t("Actions")}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingUnitId(unit.id)}>{t("Edit settings")}</DropdownMenuItem>
                          {!unit.deleted_at ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setArchiveTargetUnit(unit)}
                                disabled={isArchivePending}
                              >
                                {t("Archive")}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SettingsResourceListItemActions>
                  </SettingsResourceListItem>
                );
              })
            )}
        </SettingsResourceListCard>
      )}

      <BusinessUnitCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={onCreate}
        onCreated={handleCreated}
        isPending={isCreatePending}
        t={translateProp}
        namespace={namespace}
        locale={locale}
        translationLocale={translationLocale}
      />
      {editingUnit ? (
        <BusinessUnitSettingsEditor
          entity={entity}
          entityId={entityId}
          open={!!editingUnit}
          onOpenChange={(open) => {
            if (!open) setEditingUnitId(null);
          }}
          unit={editingUnit}
          onUpdate={onUpdate}
          onRequestArchive={setArchiveTargetUnit}
          isUpdatePending={isUpdatePending}
          isArchivePending={isArchivePending}
          t={translateProp}
          namespace={namespace}
          locale={locale}
          translationLocale={translationLocale}
        />
      ) : null}

      <AlertDialog open={!!archiveTargetUnit} onOpenChange={(open) => !open && setArchiveTargetUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Archive this business unit?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This hides the unit from new documents and integrations, but keeps existing references intact.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveTargetUnit(null)}>
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isArchivePending}
              onClick={handleArchiveConfirmed}
            >
              {t("Archive")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
