import type { CreateInvoiceRequest } from "@spaceinvoices/js-sdk";

type DemoInvoiceData = Partial<CreateInvoiceRequest>;

interface LocaleDemoData {
  customer: {
    name: string;
    address: string;
    city: string;
    post_code: string;
    country: string;
  };
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    price: number;
  }>;
  note: string;
}

const demoDataByLocale: Record<string, LocaleDemoData> = {
  "en-US": {
    customer: {
      name: "Acme Corporation",
      address: "123 Business Avenue",
      city: "New York",
      post_code: "10001",
      country: "United States",
    },
    items: [
      {
        name: "Professional Consulting",
        description: "Strategic business consulting services",
        quantity: 8,
        price: 150.0,
      },
      { name: "Project Management", description: "End-to-end project coordination", quantity: 1, price: 500.0 },
    ],
    note: "Thank you for your business. Payment is due within 30 days.",
  },
  "sl-SI": {
    customer: {
      name: "Podjetje d.o.o.",
      address: "Slovenska cesta 123",
      city: "Ljubljana",
      post_code: "1000",
      country: "Slovenija",
    },
    items: [
      { name: "Poslovno svetovanje", description: "Strateško poslovno svetovanje", quantity: 8, price: 120.0 },
      { name: "Vodenje projekta", description: "Celostna koordinacija projekta", quantity: 1, price: 400.0 },
    ],
    note: "Hvala za zaupanje. Rok plačila je 30 dni.",
  },
  "de-DE": {
    customer: {
      name: "Musterfirma GmbH",
      address: "Musterstraße 123",
      city: "Berlin",
      post_code: "10115",
      country: "Deutschland",
    },
    items: [
      { name: "Unternehmensberatung", description: "Strategische Geschäftsberatung", quantity: 8, price: 140.0 },
      { name: "Projektmanagement", description: "Umfassende Projektkoordination", quantity: 1, price: 450.0 },
    ],
    note: "Vielen Dank für Ihr Vertrauen. Zahlungsziel: 30 Tage.",
  },
  "fr-FR": {
    customer: {
      name: "Société Exemple SARL",
      address: "123 Rue du Commerce",
      city: "Paris",
      post_code: "75001",
      country: "France",
    },
    items: [
      { name: "Conseil professionnel", description: "Services de conseil stratégique", quantity: 8, price: 130.0 },
      { name: "Gestion de projet", description: "Coordination de projet complète", quantity: 1, price: 480.0 },
    ],
    note: "Merci pour votre confiance. Paiement à 30 jours.",
  },
  "es-ES": {
    customer: {
      name: "Empresa Ejemplo S.L.",
      address: "Calle Comercio 123",
      city: "Madrid",
      post_code: "28001",
      country: "España",
    },
    items: [
      {
        name: "Consultoría profesional",
        description: "Servicios de consultoría estratégica",
        quantity: 8,
        price: 125.0,
      },
      { name: "Gestión de proyectos", description: "Coordinación integral de proyectos", quantity: 1, price: 460.0 },
    ],
    note: "Gracias por su confianza. Pago a 30 días.",
  },
  "it-IT": {
    customer: {
      name: "Azienda Esempio S.r.l.",
      address: "Via del Commercio 123",
      city: "Roma",
      post_code: "00100",
      country: "Italia",
    },
    items: [
      { name: "Consulenza professionale", description: "Servizi di consulenza strategica", quantity: 8, price: 135.0 },
      { name: "Gestione progetti", description: "Coordinamento completo del progetto", quantity: 1, price: 470.0 },
    ],
    note: "Grazie per la fiducia. Pagamento entro 30 giorni.",
  },
};

/**
 * Get demo invoice data for template preview based on locale
 */
export function getDemoInvoiceData(locale: string): DemoInvoiceData {
  // Normalize locale (e.g., "en" -> "en-US", "sl" -> "sl-SI")
  const normalizedLocale = normalizeLocale(locale);
  const data = demoDataByLocale[normalizedLocale] || demoDataByLocale["en-US"];

  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);

  return {
    date: today.toISOString(),
    date_due: dueDate.toISOString(),
    customer: data.customer,
    items: data.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      taxes: [{ rate: 22 }],
    })),
    note: data.note,
  };
}

function normalizeLocale(locale: string): string {
  const mapping: Record<string, string> = {
    en: "en-US",
    sl: "sl-SI",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    it: "it-IT",
  };

  // If already full locale, return as-is if supported
  if (demoDataByLocale[locale]) {
    return locale;
  }

  // Try to match short code
  const shortCode = locale.split("-")[0].toLowerCase();
  return mapping[shortCode] || "en-US";
}
