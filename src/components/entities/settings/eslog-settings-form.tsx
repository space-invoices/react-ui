import { zodResolver } from "@hookform/resolvers/zod";
import type { Entity } from "@spaceinvoices/js-sdk";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/components/ui/form";
import { Switch } from "@/ui/components/ui/switch";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";
import { useFormFooterRegistration } from "@/ui/providers/form-footer-context";
import { useUpdateEntity } from "../entities.hooks";

const eslogSettingsSchema = z.object({
  eslog_validation_enabled: z.boolean(),
  ujp_validation_with_eslog_enabled: z.boolean(),
});

type EslogSettingsSchema = z.infer<typeof eslogSettingsSchema>;

const translations = {
  en: {
    "Save Settings": "Save Settings",
    "Enable e-SLOG validation": "Enable e-SLOG validation",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created or updated.",
    "Also validate UJP package requirements": "Also validate UJP package requirements",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "When enabled, invoice and credit note creation and updates also check the data needed for UJP package downloads.",
    "e-SLOG validation is only available for Slovenian entities.":
      "e-SLOG validation is only available for Slovenian entities.",
    "About e-SLOG 2.0": "About e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.",
  },
  sl: {
    "Save Settings": "Shrani nastavitve",
    "Enable e-SLOG validation": "Omogoči validacijo e-SLOG",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Ko je omogočeno, se dokumenti samodejno validirajo glede na zahteve e-SLOG 2.0 ob ustvarjanju ali urejanju.",
    "Also validate UJP package requirements": "Preveri tudi zahteve za UJP paket",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Ko je omogočeno, ustvarjanje in urejanje računov ter dobropisov preveri tudi podatke, potrebne za prenos UJP paketa.",
    "e-SLOG validation is only available for Slovenian entities.":
      "Validacija e-SLOG je na voljo samo za slovenske organizacije.",
    "About e-SLOG 2.0": "O e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 je slovenski standard za elektronske račune, ki temelji na evropski specifikaciji EN 16931. Veljavne dokumente lahko prenesete v obliki XML in priložite e-pošti.",
  },
  de: {
    "Save Settings": "Einstellungen speichern",
    "Enable e-SLOG validation": "e-SLOG-Validierung aktivieren",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Wenn aktiviert, werden Dokumente bei Erstellung oder Aktualisierung automatisch gegen e-SLOG 2.0-Anforderungen validiert.",
    "Also validate UJP package requirements": "Auch Anforderungen für UJP-Pakete validieren",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Wenn aktiviert, pruefen Erstellung und Aktualisierung von Rechnungen und Gutschriften auch die Daten fuer UJP-Paket-Downloads.",
    "e-SLOG validation is only available for Slovenian entities.":
      "Die e-SLOG-Validierung ist nur für slowenische Unternehmen verfügbar.",
    "About e-SLOG 2.0": "Über e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 ist der slowenische Standard für elektronische Rechnungen auf Basis der europäischen Spezifikation EN 16931. Gültige Dokumente können als XML heruntergeladen und an E-Mails angehängt werden.",
  },
  it: {
    "Save Settings": "Salva impostazioni",
    "Enable e-SLOG validation": "Abilita validazione e-SLOG",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Quando abilitata, i documenti vengono validati automaticamente secondo i requisiti e-SLOG 2.0 alla creazione o all'aggiornamento.",
    "Also validate UJP package requirements": "Valida anche i requisiti del pacchetto UJP",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Quando abilitato, la creazione e l'aggiornamento di fatture e note di credito verificano anche i dati necessari per scaricare il pacchetto UJP.",
    "e-SLOG validation is only available for Slovenian entities.":
      "La validazione e-SLOG è disponibile solo per le entità slovene.",
    "About e-SLOG 2.0": "Informazioni su e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 è lo standard sloveno per la fatturazione elettronica basato sulla specifica europea EN 16931. I documenti validi possono essere scaricati in formato XML e allegati alle email.",
  },
  fr: {
    "Save Settings": "Enregistrer les paramètres",
    "Enable e-SLOG validation": "Activer la validation e-SLOG",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Lorsqu'elle est activee, les documents sont automatiquement valides selon les exigences e-SLOG 2.0 lors de leur creation ou mise a jour.",
    "Also validate UJP package requirements": "Valider aussi les exigences du package UJP",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Lorsque cette option est activee, la creation et la mise a jour des factures et avoirs verifient aussi les donnees necessaires au telechargement du package UJP.",
    "e-SLOG validation is only available for Slovenian entities.":
      "La validation e-SLOG est disponible uniquement pour les entités slovènes.",
    "About e-SLOG 2.0": "À propos d’e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 est la norme slovène de facture électronique basée sur la spécification européenne EN 16931. Les documents valides peuvent être téléchargés au format XML et joints aux e-mails.",
  },
  es: {
    "Save Settings": "Guardar ajustes",
    "Enable e-SLOG validation": "Activar validación e-SLOG",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Cuando esta activada, los documentos se validan automaticamente segun los requisitos e-SLOG 2.0 al crearlos o actualizarlos.",
    "Also validate UJP package requirements": "Validar también los requisitos del paquete UJP",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Cuando esta activado, la creacion y actualizacion de facturas y notas de credito tambien comprueba los datos necesarios para descargar el paquete UJP.",
    "e-SLOG validation is only available for Slovenian entities.":
      "La validación e-SLOG solo está disponible para entidades eslovenas.",
    "About e-SLOG 2.0": "Acerca de e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 es el estándar esloveno de factura electrónica basado en la especificación europea EN 16931. Los documentos válidos se pueden descargar en XML y adjuntar a correos.",
  },
  pt: {
    "Save Settings": "Guardar definições",
    "Enable e-SLOG validation": "Ativar validação e-SLOG",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Quando ativada, os documentos sao automaticamente validados segundo os requisitos e-SLOG 2.0 ao serem criados ou atualizados.",
    "Also validate UJP package requirements": "Validar também os requisitos do pacote UJP",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Quando ativo, a criacao e atualizacao de faturas e notas de credito tambem verificam os dados necessarios para descarregar o pacote UJP.",
    "e-SLOG validation is only available for Slovenian entities.":
      "A validação e-SLOG está disponível apenas para entidades eslovenas.",
    "About e-SLOG 2.0": "Sobre e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 é o padrão esloveno de fatura eletrónica baseado na especificação europeia EN 16931. Documentos válidos podem ser descarregados em XML e anexados a emails.",
  },
  nl: {
    "Save Settings": "Instellingen opslaan",
    "Enable e-SLOG validation": "e-SLOG-validatie inschakelen",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Indien ingeschakeld, worden documenten automatisch gevalideerd tegen e-SLOG 2.0-vereisten bij aanmaak of update.",
    "Also validate UJP package requirements": "Ook UJP-pakketvereisten valideren",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Wanneer ingeschakeld, controleren het aanmaken en bijwerken van facturen en creditnota's ook de gegevens voor UJP-pakketdownloads.",
    "e-SLOG validation is only available for Slovenian entities.":
      "e-SLOG-validatie is alleen beschikbaar voor Sloveense entiteiten.",
    "About e-SLOG 2.0": "Over e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 is de Sloveense standaard voor elektronische facturen op basis van de Europese EN 16931-specificatie. Geldige documenten kunnen als XML worden gedownload en aan e-mails worden toegevoegd.",
  },
  pl: {
    "Save Settings": "Zapisz ustawienia",
    "Enable e-SLOG validation": "Włącz walidację e-SLOG",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Po wlaczeniu dokumenty sa automatycznie walidowane wedlug wymagan e-SLOG 2.0 przy tworzeniu lub aktualizacji.",
    "Also validate UJP package requirements": "Sprawdzaj też wymagania pakietu UJP",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Po wlaczeniu tworzenie i aktualizacja faktur oraz korekt sprawdza tez dane potrzebne do pobrania pakietu UJP.",
    "e-SLOG validation is only available for Slovenian entities.":
      "Walidacja e-SLOG jest dostępna tylko dla podmiotów słoweńskich.",
    "About e-SLOG 2.0": "O e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 to słoweński standard faktur elektronicznych oparty na europejskiej specyfikacji EN 16931. Poprawne dokumenty można pobrać jako XML i dołączyć do wiadomości e-mail.",
  },
  hr: {
    "Save Settings": "Spremi postavke",
    "Enable e-SLOG validation": "Omogući e-SLOG provjeru",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Kada je omoguceno, dokumenti se automatski validiraju prema zahtjevima e-SLOG 2.0 pri kreiranju ili azuriranju.",
    "Also validate UJP package requirements": "Provjeri i zahtjeve UJP paketa",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Kada je omoguceno, izrada i azuriranje racuna i odobrenja provjerava i podatke potrebne za preuzimanje UJP paketa.",
    "e-SLOG validation is only available for Slovenian entities.":
      "e-SLOG provjera dostupna je samo za slovenske subjekte.",
    "About e-SLOG 2.0": "O e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 je slovenski standard za elektroničke račune temeljen na europskoj specifikaciji EN 16931. Valjani dokumenti mogu se preuzeti u XML formatu i priložiti e-pošti.",
  },
  sv: {
    "Save Settings": "Spara inställningar",
    "Enable e-SLOG validation": "Aktivera e-SLOG-validering",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "När aktiverat valideras dokument automatiskt mot e-SLOG 2.0-krav när de skapas eller uppdateras.",
    "Also validate UJP package requirements": "Validera även UJP-paketkrav",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "När detta är aktiverat kontrolleras även data som behövs för UJP-paket när fakturor och kreditnotor skapas eller uppdateras.",
    "e-SLOG validation is only available for Slovenian entities.":
      "e-SLOG-validering är endast tillgänglig för slovenska entiteter.",
    "About e-SLOG 2.0": "Om e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 är den slovenska standarden för elektroniska fakturor baserad på den europeiska specifikationen EN 16931. Giltiga dokument kan laddas ned som XML och bifogas e-post.",
  },
  fi: {
    "Save Settings": "Tallenna asetukset",
    "Enable e-SLOG validation": "Ota e-SLOG-validointi käyttöön",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created or updated.",
    "Also validate UJP package requirements": "Validoi myös UJP-paketin vaatimukset",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Kun kaytossa, laskujen ja hyvityslaskujen luonti ja paivitys tarkistaa myos UJP-paketin lataukseen tarvittavat tiedot.",
    "e-SLOG validation is only available for Slovenian entities.":
      "e-SLOG-validointi on käytettävissä vain slovenialaisille entiteeteille.",
    "About e-SLOG 2.0": "Tietoja e-SLOG 2.0:sta",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 on Slovenian sähköisen laskutuksen standardi, joka perustuu eurooppalaiseen EN 16931 -määritykseen. Kelvolliset asiakirjat voi ladata XML-muodossa ja liittää sähköposteihin.",
  },
  et: {
    "Save Settings": "Salvesta seaded",
    "Enable e-SLOG validation": "Luba e-SLOG-i valideerimine",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Kui lubatud, valideeritakse dokumendid automaatselt e-SLOG 2.0 nouete vastu loomisel voi uuendamisel.",
    "Also validate UJP package requirements": "Valideeri ka UJP paketi nõuded",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Kui see on lubatud, kontrollib arvete ja kreeditarvete loomine ning uuendamine ka UJP paketi allalaadimiseks vajalikke andmeid.",
    "e-SLOG validation is only available for Slovenian entities.":
      "e-SLOG-i valideerimine on saadaval ainult Sloveenia üksustele.",
    "About e-SLOG 2.0": "Teave e-SLOG 2.0 kohta",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 on Sloveenia e-arve standard, mis põhineb Euroopa EN 16931 spetsifikatsioonil. Kehtivaid dokumente saab XML-vormingus alla laadida ja e-kirjadele lisada.",
  },
  bg: {
    "Save Settings": "Запази настройките",
    "Enable e-SLOG validation": "Активирай e-SLOG валидиране",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Когато е активирано, документите се валидират автоматично спрямо изискванията на e-SLOG 2.0 при създаване или актуализиране.",
    "Also validate UJP package requirements": "Валидирай и изискванията за UJP пакет",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Когато е активирано, създаването и актуализирането на фактури и кредитни известия проверява и данните за изтегляне на UJP пакет.",
    "e-SLOG validation is only available for Slovenian entities.":
      "e-SLOG валидирането е достъпно само за словенски организации.",
    "About e-SLOG 2.0": "За e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 е словенският стандарт за електронни фактури, базиран на европейската спецификация EN 16931. Валидните документи могат да се изтеглят като XML и да се прикачват към имейли.",
  },
  cs: {
    "Save Settings": "Uložit nastavení",
    "Enable e-SLOG validation": "Povolit ověření e-SLOG",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Pokud je povoleno, dokumenty se automaticky validuji proti pozadavkum e-SLOG 2.0 pri vytvoreni nebo aktualizaci.",
    "Also validate UJP package requirements": "Ověřit také požadavky balíčku UJP",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Je-li povoleno, tvorba a aktualizace faktur a dobropisu kontroluje take data potrebna pro stazeni balicku UJP.",
    "e-SLOG validation is only available for Slovenian entities.":
      "Ověření e-SLOG je dostupné pouze pro slovinské subjekty.",
    "About e-SLOG 2.0": "O e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 je slovinský standard pro elektronické faktury založený na evropské specifikaci EN 16931. Platné dokumenty lze stáhnout jako XML a přiložit k e-mailům.",
  },
  sk: {
    "Save Settings": "Uložiť nastavenia",
    "Enable e-SLOG validation": "Povoliť overenie e-SLOG",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Ked je povolene, dokumenty sa automaticky validuju podla poziadaviek e-SLOG 2.0 pri vytvoreni alebo aktualizacii.",
    "Also validate UJP package requirements": "Overiť aj požiadavky balíka UJP",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Ak je zapnute, tvorba a aktualizacia faktur a dobropisov kontroluje aj udaje potrebne na stiahnutie balika UJP.",
    "e-SLOG validation is only available for Slovenian entities.":
      "Overenie e-SLOG je dostupné iba pre slovinské subjekty.",
    "About e-SLOG 2.0": "O e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 je slovinský štandard pre elektronické faktúry založený na európskej špecifikácii EN 16931. Platné dokumenty možno stiahnuť ako XML a priložiť k e-mailom.",
  },
  nb: {
    "Save Settings": "Lagre innstillinger",
    "Enable e-SLOG validation": "Aktiver e-SLOG-validering",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Nar aktivert, valideres dokumenter automatisk mot e-SLOG 2.0-krav ved opprettelse eller oppdatering.",
    "Also validate UJP package requirements": "Valider også UJP-pakkekrav",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Nar aktivert kontrollerer oppretting og oppdatering av fakturaer og kreditnotaer ogsa dataene som trengs for UJP-pakkenedlasting.",
    "e-SLOG validation is only available for Slovenian entities.":
      "e-SLOG-validering er bare tilgjengelig for slovenske enheter.",
    "About e-SLOG 2.0": "Om e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 er den slovenske standarden for elektroniske fakturaer basert på den europeiske EN 16931-spesifikasjonen. Gyldige dokumenter kan lastes ned som XML og legges ved e-post.",
  },
  is: {
    "Save Settings": "Vista stillingar",
    "Enable e-SLOG validation": "Virkja e-SLOG staðfestingu",
    "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.":
      "Þegar virkjað verða skjöl sjálfkrafa staðfest gegn e-SLOG 2.0 kröfum þegar þau eru búin til eða uppfærð.",
    "Also validate UJP package requirements": "Staðfesta einnig kröfur UJP pakka",
    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.":
      "Þegar virkt athugar stofnun og uppfærsla reikninga og kreditreikninga einnig gögnin sem þarf til að sækja UJP pakka.",
    "e-SLOG validation is only available for Slovenian entities.":
      "e-SLOG staðfesting er aðeins í boði fyrir slóvenska aðila.",
    "About e-SLOG 2.0": "Um e-SLOG 2.0",
    "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.":
      "e-SLOG 2.0 er slóvenski rafræni reikningastaðallinn byggður á evrópsku EN 16931 forskriftinni. Gild skjöl má sækja sem XML og hengja við tölvupóst.",
  },
} as const;

export type EslogSettingsFormProps = {
  entity: Entity;
  onSuccess?: (data: Entity) => void;
  onError?: (error: unknown) => void;
} & ComponentTranslationProps;

export function EslogSettingsForm({
  entity,
  t: translateProp,
  namespace,
  locale,
  translationLocale,
  onSuccess,
  onError,
}: EslogSettingsFormProps) {
  const t = createTranslation({ t: translateProp, namespace, locale, translationLocale, translations });

  const currentSettings = (entity.settings as Record<string, unknown>) || {};
  const isEslogSupported = entity.country_rules?.features?.includes("eslog") ?? false;

  const form = useForm<EslogSettingsSchema>({
    resolver: zodResolver(eslogSettingsSchema),
    defaultValues: {
      eslog_validation_enabled: !!currentSettings.eslog_validation_enabled,
      ujp_validation_with_eslog_enabled: !!currentSettings.ujp_validation_with_eslog_enabled,
    },
  });

  // Reset form when entity data changes (e.g., after refetch)
  useEffect(() => {
    form.reset({
      eslog_validation_enabled: !!currentSettings.eslog_validation_enabled,
      ujp_validation_with_eslog_enabled: !!currentSettings.ujp_validation_with_eslog_enabled,
    });
  }, [currentSettings.eslog_validation_enabled, currentSettings.ujp_validation_with_eslog_enabled, form]);

  const { mutate: updateEntity, isPending } = useUpdateEntity({
    entityId: entity.id,
    onSuccess: (data) => {
      form.reset(form.getValues());
      onSuccess?.(data);
    },
    onError,
  });

  useFormFooterRegistration({
    formId: "eslog-settings-form",
    isPending,
    isDirty: form.formState.isDirty,
    label: t("Save Settings"),
  });

  const onSubmit = (values: EslogSettingsSchema) => {
    if (values.eslog_validation_enabled && !isEslogSupported) {
      form.setError("eslog_validation_enabled", {
        type: "manual",
        message: t("e-SLOG validation is only available for Slovenian entities."),
      });
      return;
    }

    updateEntity({
      id: entity.id,
      data: {
        // Send only keys this surface owns — see useUpdateEntity's settings contract
        settings: {
          eslog_validation_enabled: values.eslog_validation_enabled,
          ujp_validation_with_eslog_enabled:
            values.eslog_validation_enabled && values.ujp_validation_with_eslog_enabled,
        },
      },
    });
  };

  return (
    <Form {...form}>
      <form id="eslog-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="eslog_validation_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t("Enable e-SLOG validation")}</FormLabel>
                <FormDescription>
                  {isEslogSupported
                    ? t(
                        "When enabled, documents will be automatically validated against e-SLOG 2.0 requirements when created.",
                      )
                    : t("e-SLOG validation is only available for Slovenian entities.")}
                </FormDescription>
                <FormMessage />
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isEslogSupported} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ujp_validation_with_eslog_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t("Also validate UJP package requirements")}</FormLabel>
                <FormDescription>
                  {t(
                    "When enabled, invoice and credit note creation also checks the data needed for UJP package downloads.",
                  )}
                </FormDescription>
                <FormMessage />
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!isEslogSupported || !form.watch("eslog_validation_enabled")}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 text-sm dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <p className="font-medium">{t("About e-SLOG 2.0")}</p>
          <p className="mt-1">
            {t(
              "e-SLOG 2.0 is the Slovenian electronic invoice standard based on the European EN 16931 specification. Valid documents can be downloaded in XML format and attached to emails.",
            )}
          </p>
        </div>
      </form>
    </Form>
  );
}
