import { getLocaleLanguage } from "./locale";

type ValidationDictionary = {
  required: string;
  minChars: (count: number) => string;
  maxChars: (count: number) => string;
  exactDigits: (count: number) => string;
  digitsOnly: string;
  invalidEmail: string;
  invalidFormat: string;
  invalidValue: string;
  alphanumericRange: string;
  invalidPortugalTaxNumber: string;
  invalidPortugalPhone: string;
  invalidPortugalPostCode: string;
  invalidAmount: string;
  amountNegative: string;
  portugalIssueDateNotToday: string;
  portugalCorrectionReasonRequired: string;
  portugalNameTooLong: string;
  portugalAddressTooLong: string;
  portugalCityTooLong: string;
  portugalCompanyIdTooLong: string;
  portugalInvalidRegistrationNumber: string;
  portugalItemNameTooShort: string;
  portugalItemNameTooLong: string;
  portugalItemUnitTooLong: string;
  portugalItemTaxRequired: string;
  portugalItemSingleTax: string;
  latinOnly: string;
};

const dictionaries: Record<string, ValidationDictionary> = {
  en: {
    required: "Required",
    minChars: (count) => `Must be at least ${count} characters`,
    maxChars: (count) => `Must be at most ${count} characters`,
    exactDigits: (count) => `Must be exactly ${count} digits`,
    digitsOnly: "Must contain only digits",
    invalidEmail: "Invalid email address",
    invalidFormat: "Invalid format",
    invalidValue: "Invalid value",
    alphanumericRange: "Must be alphanumeric, 1-20 characters",
    invalidPortugalTaxNumber: "Invalid Portuguese tax number",
    invalidPortugalPhone: "Invalid international phone number",
    invalidPortugalPostCode: "Invalid Portuguese post code",
    invalidAmount: "Invalid amount",
    amountNegative: "Amount cannot be negative",
    portugalIssueDateNotToday: "Portuguese documents must be issued with today's date.",
    portugalCorrectionReasonRequired: "State why this credit note is being issued.",
    portugalNameTooLong: "Portugal limits the company name to 100 characters",
    portugalAddressTooLong: "Portugal limits the address to 210 characters",
    portugalCityTooLong: "Portugal limits the city to 50 characters",
    portugalCompanyIdTooLong: "Registry office and registration number must fit 50 characters together",
    portugalInvalidRegistrationNumber: "Registration number must contain only digits and slashes",
    portugalItemNameTooShort: "Portuguese line names need at least 2 characters.",
    portugalItemNameTooLong:
      "Portuguese line names are limited to 200 characters. Put the longer wording in the description.",
    portugalItemUnitTooLong: "Portuguese units are limited to 20 characters.",
    portugalItemTaxRequired: "Pick the tax treatment for this line. Portugal needs one on every line.",
    portugalItemSingleTax: "Portugal accepts one tax treatment per line. Split the line instead.",
    latinOnly: "Must contain only Latin characters",
  },
  de: {
    required: "Erforderlich",
    minChars: (count) => `Muss mindestens ${count} Zeichen enthalten`,
    maxChars: (count) => `Darf höchstens ${count} Zeichen enthalten`,
    exactDigits: (count) => `Muss genau ${count} Ziffern enthalten`,
    digitsOnly: "Darf nur Ziffern enthalten",
    invalidEmail: "Ungultige E-Mail-Adresse",
    invalidFormat: "Ungultiges Format",
    invalidValue: "Ungultiger Wert",
    alphanumericRange: "Muss alphanumerisch sein, 1-20 Zeichen",
    invalidPortugalTaxNumber: "Ungultige portugiesische Steuernummer",
    invalidPortugalPhone: "Ungultige internationale Telefonnummer",
    invalidPortugalPostCode: "Ungultige portugiesische Postleitzahl",
    invalidAmount: "Ungultiger Betrag",
    amountNegative: "Betrag darf nicht negativ sein",
    portugalIssueDateNotToday: "Portugiesische Dokumente mussen mit dem heutigen Datum ausgestellt werden.",
    portugalCorrectionReasonRequired: "Geben Sie an, warum diese Gutschrift ausgestellt wird.",
    portugalNameTooLong: "Portugal begrenzt den Firmennamen auf 100 Zeichen",
    portugalAddressTooLong: "Portugal begrenzt die Adresse auf 210 Zeichen",
    portugalCityTooLong: "Portugal begrenzt den Ort auf 50 Zeichen",
    portugalCompanyIdTooLong: "Registergericht und Registernummer durfen zusammen hochstens 50 Zeichen haben",
    portugalInvalidRegistrationNumber: "Die Registernummer darf nur Ziffern und Schragstriche enthalten",
    portugalItemNameTooShort: "Portugiesische Positionsbezeichnungen brauchen mindestens 2 Zeichen.",
    portugalItemNameTooLong:
      "Portugiesische Positionsbezeichnungen sind auf 200 Zeichen begrenzt. Schreiben Sie den langeren Text in die Beschreibung.",
    portugalItemUnitTooLong: "Portugiesische Einheiten sind auf 20 Zeichen begrenzt.",
    portugalItemTaxRequired:
      "Wahlen Sie die Steuerbehandlung fur diese Position. Portugal verlangt sie fur jede Position.",
    portugalItemSingleTax:
      "Portugal erlaubt nur eine Steuerbehandlung pro Position. Teilen Sie die Position stattdessen auf.",
    latinOnly: "Darf nur lateinische Zeichen enthalten",
  },
  es: {
    required: "Obligatorio",
    minChars: (count) => `Debe tener al menos ${count} caracteres`,
    maxChars: (count) => `Debe tener como maximo ${count} caracteres`,
    exactDigits: (count) => `Debe tener exactamente ${count} digitos`,
    digitsOnly: "Debe contener solo digitos",
    invalidEmail: "Direccion de correo electronico no valida",
    invalidFormat: "Formato no valido",
    invalidValue: "Valor no valido",
    alphanumericRange: "Debe ser alfanumerico y tener entre 1 y 20 caracteres",
    invalidPortugalTaxNumber: "Numero de identificacion fiscal portugues no valido",
    invalidPortugalPhone: "Numero de telefono internacional no valido",
    invalidPortugalPostCode: "Codigo postal portugues no valido",
    invalidAmount: "Importe no valido",
    amountNegative: "El importe no puede ser negativo",
    portugalIssueDateNotToday: "Los documentos portugueses deben emitirse con la fecha de hoy.",
    portugalCorrectionReasonRequired: "Indique por que se emite esta nota de credito.",
    portugalNameTooLong: "Portugal limita el nombre de la empresa a 100 caracteres",
    portugalAddressTooLong: "Portugal limita la direccion a 210 caracteres",
    portugalCityTooLong: "Portugal limita la ciudad a 50 caracteres",
    portugalCompanyIdTooLong: "El registro mercantil y el numero de registro no pueden superar 50 caracteres juntos",
    portugalInvalidRegistrationNumber: "El numero de registro solo puede contener digitos y barras",
    portugalItemNameTooShort: "Los nombres de linea portugueses necesitan al menos 2 caracteres.",
    portugalItemNameTooLong:
      "Los nombres de linea portugueses estan limitados a 200 caracteres. Escriba el texto mas largo en la descripcion.",
    portugalItemUnitTooLong: "Las unidades portuguesas estan limitadas a 20 caracteres.",
    portugalItemTaxRequired: "Elija el tratamiento fiscal de esta linea. Portugal lo exige en todas las lineas.",
    portugalItemSingleTax: "Portugal admite un solo tratamiento fiscal por linea. Divida la linea en su lugar.",
    latinOnly: "Debe contener solo caracteres latinos",
  },
  fr: {
    required: "Obligatoire",
    minChars: (count) => `Doit contenir au moins ${count} caracteres`,
    maxChars: (count) => `Doit contenir au maximum ${count} caracteres`,
    exactDigits: (count) => `Doit contenir exactement ${count} chiffres`,
    digitsOnly: "Doit contenir uniquement des chiffres",
    invalidEmail: "Adresse e-mail invalide",
    invalidFormat: "Format invalide",
    invalidValue: "Valeur invalide",
    alphanumericRange: "Doit etre alphanumerique, 1 a 20 caracteres",
    invalidPortugalTaxNumber: "Numero fiscal portugais invalide",
    invalidPortugalPhone: "Numero de telephone international invalide",
    invalidPortugalPostCode: "Code postal portugais invalide",
    invalidAmount: "Montant invalide",
    amountNegative: "Le montant ne peut pas etre negatif",
    portugalIssueDateNotToday: "Les documents portugais doivent etre emis a la date du jour.",
    portugalCorrectionReasonRequired: "Indiquez pourquoi cette note de credit est emise.",
    portugalNameTooLong: "Le Portugal limite le nom de la societe a 100 caracteres",
    portugalAddressTooLong: "Le Portugal limite l'adresse a 210 caracteres",
    portugalCityTooLong: "Le Portugal limite la ville a 50 caracteres",
    portugalCompanyIdTooLong: "Le greffe et le numero d'immatriculation ne doivent pas depasser 50 caracteres au total",
    portugalInvalidRegistrationNumber:
      "Le numero d'immatriculation ne peut contenir que des chiffres et des barres obliques",
    portugalItemNameTooShort: "Les libelles de ligne portugais doivent comporter au moins 2 caracteres.",
    portugalItemNameTooLong:
      "Les libelles de ligne portugais sont limites a 200 caracteres. Placez le texte plus long dans la description.",
    portugalItemUnitTooLong: "Les unites portugaises sont limitees a 20 caracteres.",
    portugalItemTaxRequired: "Choisissez le traitement de TVA de cette ligne. Le Portugal l'exige sur chaque ligne.",
    portugalItemSingleTax: "Le Portugal accepte un seul traitement de TVA par ligne. Divisez plutot la ligne.",
    latinOnly: "Doit contenir uniquement des caracteres latins",
  },
  hr: {
    required: "Obavezno",
    minChars: (count) => `Mora sadrzavati najmanje ${count} znakova`,
    maxChars: (count) => `Smije sadrzavati najvise ${count} znakova`,
    exactDigits: (count) => `Mora sadrzavati tocno ${count} znamenke`,
    digitsOnly: "Mora sadrzavati samo znamenke",
    invalidEmail: "Neispravna e-mail adresa",
    invalidFormat: "Neispravan format",
    invalidValue: "Neispravna vrijednost",
    alphanumericRange: "Mora biti alfanumericko, 1-20 znakova",
    invalidPortugalTaxNumber: "Neispravan portugalski porezni broj",
    invalidPortugalPhone: "Neispravan medunarodni telefonski broj",
    invalidPortugalPostCode: "Neispravan portugalski postanski broj",
    invalidAmount: "Neispravan iznos",
    amountNegative: "Iznos ne moze biti negativan",
    portugalIssueDateNotToday: "Portugalski dokumenti moraju biti izdani s danasnjim datumom.",
    portugalCorrectionReasonRequired: "Navedite zasto se izdaje ovo knjizno odobrenje.",
    portugalNameTooLong: "Portugal ogranicava naziv tvrtke na 100 znakova",
    portugalAddressTooLong: "Portugal ogranicava adresu na 210 znakova",
    portugalCityTooLong: "Portugal ogranicava grad na 50 znakova",
    portugalCompanyIdTooLong: "Registarski sud i maticni broj zajedno smiju imati najvise 50 znakova",
    portugalInvalidRegistrationNumber: "Maticni broj smije sadrzavati samo znamenke i kose crte",
    portugalItemNameTooShort: "Nazivi portugalskih stavki moraju imati najmanje 2 znaka.",
    portugalItemNameTooLong: "Nazivi portugalskih stavki ograniceni su na 200 znakova. Duzi tekst upisite u opis.",
    portugalItemUnitTooLong: "Portugalske jedinice mjere ogranicene su na 20 znakova.",
    portugalItemTaxRequired: "Odaberite porezni tretman za ovu stavku. Portugal ga trazi na svakoj stavci.",
    portugalItemSingleTax: "Portugal prihvaca samo jedan porezni tretman po stavci. Umjesto toga podijelite stavku.",
    latinOnly: "Mora sadrzavati samo latinicne znakove",
  },
  bg: {
    required: "Zadalzhitelno",
    minChars: (count) => `Tryabva da sadrzha pone ${count} znaka`,
    maxChars: (count) => `Mozhe da sadrzha nai-mnogo ${count} znaka`,
    exactDigits: (count) => `Tryabva da sadrzha tochno ${count} cifri`,
    digitsOnly: "Tryabva da sadrzha samo cifri",
    invalidEmail: "Nevaliden email adres",
    invalidFormat: "Nevaliden format",
    invalidValue: "Nevalidna stoinost",
    alphanumericRange: "Tryabva da e bukveno-cifrovo, 1-20 znaka",
    invalidPortugalTaxNumber: "Nevaliden portugalski danachen nomer",
    invalidPortugalPhone: "Nevaliden mezhdunaroden telefonen nomer",
    invalidPortugalPostCode: "Nevaliden portugalski poshtenski kod",
    invalidAmount: "Nevalidna suma",
    amountNegative: "Sumata ne mozhe da e otritsatelna",
    portugalIssueDateNotToday: "Portugalskite dokumenti tryabva da se izdavat s dneshna data.",
    portugalCorrectionReasonRequired: "Posochete zashto se izdava tova kreditno izvestie.",
    portugalNameTooLong: "Portugaliya ogranichava imeto na firmata do 100 znaka",
    portugalAddressTooLong: "Portugaliya ogranichava adresa do 210 znaka",
    portugalCityTooLong: "Portugaliya ogranichava grada do 50 znaka",
    portugalCompanyIdTooLong: "Targovskiyat registar i registratsionniyat nomer zaedno tryabva da sa do 50 znaka",
    portugalInvalidRegistrationNumber: "Registratsionniyat nomer mozhe da sadarzha samo cifri i nakloneni cherti",
    portugalItemNameTooShort: "Imenata na portugalskite redove tryabva da sa pone 2 znaka.",
    portugalItemNameTooLong:
      "Imenata na portugalskite redove sa ogranicheni do 200 znaka. Napishete po-dalgiya tekst v opisanieto.",
    portugalItemUnitTooLong: "Portugalskite merni edinitsi sa ogranicheni do 20 znaka.",
    portugalItemTaxRequired: "Izberete danachnoto tretirane za tozi red. Portugaliya go iziskva na vseki red.",
    portugalItemSingleTax: "Portugaliya priema samo edno danachno tretirane na red. Vmesto tova razdelete reda.",
    latinOnly: "Tryabva da sadarzha samo latinski znatsi",
  },
  cs: {
    required: "Povinne",
    minChars: (count) => `Musi obsahovat alespon ${count} znaku`,
    maxChars: (count) => `Muze obsahovat nejvyse ${count} znaku`,
    exactDigits: (count) => `Musi obsahovat presne ${count} cislice`,
    digitsOnly: "Musi obsahovat pouze cislice",
    invalidEmail: "Neplatna e-mailova adresa",
    invalidFormat: "Neplatny format",
    invalidValue: "Neplatna hodnota",
    alphanumericRange: "Musi byt alfanumericke, 1-20 znaku",
    invalidPortugalTaxNumber: "Neplatne portugalske danove cislo",
    invalidPortugalPhone: "Neplatne mezinarodni telefonni cislo",
    invalidPortugalPostCode: "Neplatne portugalske PSC",
    invalidAmount: "Neplatna castka",
    amountNegative: "Castka nemuze byt zaporna",
    portugalIssueDateNotToday: "Portugalske doklady musi byt vystaveny s dnesnim datem.",
    portugalCorrectionReasonRequired: "Uvedte, proc se tento dobropis vystavuje.",
    portugalNameTooLong: "Portugalsko omezuje nazev firmy na 100 znaku",
    portugalAddressTooLong: "Portugalsko omezuje adresu na 210 znaku",
    portugalCityTooLong: "Portugalsko omezuje mesto na 50 znaku",
    portugalCompanyIdTooLong: "Rejstrikovy soud a registracni cislo mohou mit dohromady nejvyse 50 znaku",
    portugalInvalidRegistrationNumber: "Registracni cislo muze obsahovat pouze cislice a lomitka",
    portugalItemNameTooShort: "Nazvy portugalskych polozek musi mit alespon 2 znaky.",
    portugalItemNameTooLong: "Nazvy portugalskych polozek jsou omezeny na 200 znaku. Delsi text uvedte v popisu.",
    portugalItemUnitTooLong: "Portugalske merne jednotky jsou omezeny na 20 znaku.",
    portugalItemTaxRequired: "Vyberte danovy rezim pro tuto polozku. Portugalsko jej vyzaduje u kazde polozky.",
    portugalItemSingleTax: "Portugalsko umoznuje jen jeden danovy rezim na polozku. Radeji polozku rozdelte.",
    latinOnly: "Musi obsahovat pouze latinske znaky",
  },
  et: {
    required: "Kohustuslik",
    minChars: (count) => `Peab sisaldama vahemalt ${count} marki`,
    maxChars: (count) => `Voib sisaldada kuni ${count} marki`,
    exactDigits: (count) => `Peab sisaldama tapselt ${count} numbrit`,
    digitsOnly: "Tohib sisaldada ainult numbreid",
    invalidEmail: "Vigane e-posti aadress",
    invalidFormat: "Vigane vorming",
    invalidValue: "Vigane vaartus",
    alphanumericRange: "Peab olema tahe- ja numbrimarkidega, 1-20 marki",
    invalidPortugalTaxNumber: "Vigane Portugali maksukohustuslase number",
    invalidPortugalPhone: "Vigane rahvusvaheline telefoninumber",
    invalidPortugalPostCode: "Vigane Portugali postiindeks",
    invalidAmount: "Vigane summa",
    amountNegative: "Summa ei saa olla negatiivne",
    portugalIssueDateNotToday: "Portugali dokumendid tuleb valjastada tanase kuupaevaga.",
    portugalCorrectionReasonRequired: "Markige, miks see kreeditarve valjastatakse.",
    portugalNameTooLong: "Portugal piirab ettevotte nime 100 margiga",
    portugalAddressTooLong: "Portugal piirab aadressi 210 margiga",
    portugalCityTooLong: "Portugal piirab linna 50 margiga",
    portugalCompanyIdTooLong: "Registriosakond ja registrikood peavad kokku mahtuma 50 margi sisse",
    portugalInvalidRegistrationNumber: "Registrikood voib sisaldada ainult numbreid ja kaldkriipse",
    portugalItemNameTooShort: "Portugali ridade nimed peavad olema vahemalt 2 marki.",
    portugalItemNameTooLong: "Portugali ridade nimed on piiratud 200 margiga. Kirjuta pikem tekst kirjeldusse.",
    portugalItemUnitTooLong: "Portugali uhikud on piiratud 20 margiga.",
    portugalItemTaxRequired: "Vali sellele reale maksukasitlus. Portugal nouab seda igal real.",
    portugalItemSingleTax: "Portugal lubab uhe maksukasitluse rea kohta. Jaga rida selle asemel kaheks.",
    latinOnly: "Tohib sisaldada ainult ladina tahemarke",
  },
  fi: {
    required: "Pakollinen",
    minChars: (count) => `Vahintaan ${count} merkkiä`,
    maxChars: (count) => `Enintaan ${count} merkkiä`,
    exactDigits: (count) => `Taytyy olla tasan ${count} numeroa`,
    digitsOnly: "Saa sisaltaa vain numeroita",
    invalidEmail: "Virheellinen sahkopostiosoite",
    invalidFormat: "Virheellinen muoto",
    invalidValue: "Virheellinen arvo",
    alphanumericRange: "Taytyy olla aakkosnumeerinen, 1-20 merkkia",
    invalidPortugalTaxNumber: "Virheellinen Portugalin verotunniste",
    invalidPortugalPhone: "Virheellinen kansainvalinen puhelinnumero",
    invalidPortugalPostCode: "Virheellinen Portugalin postinumero",
    invalidAmount: "Virheellinen summa",
    amountNegative: "Summa ei voi olla negatiivinen",
    portugalIssueDateNotToday: "Portugalilaiset asiakirjat on laadittava kuluvan paivan paivamaaralla.",
    portugalCorrectionReasonRequired: "Ilmoita, miksi tama hyvityslasku laaditaan.",
    portugalNameTooLong: "Portugali rajoittaa yrityksen nimen 100 merkkiin",
    portugalAddressTooLong: "Portugali rajoittaa osoitteen 210 merkkiin",
    portugalCityTooLong: "Portugali rajoittaa kaupungin 50 merkkiin",
    portugalCompanyIdTooLong:
      "Kaupparekisterin toimipaikka ja rekisterinumero saavat olla yhteensa enintaan 50 merkkia",
    portugalInvalidRegistrationNumber: "Rekisterinumero saa sisaltaa vain numeroita ja kauttaviivoja",
    portugalItemNameTooShort: "Portugalilaisten rivien nimissa on oltava vahintaan 2 merkkia.",
    portugalItemNameTooLong:
      "Portugalilaisten rivien nimet on rajoitettu 200 merkkiin. Kirjoita pidempi teksti kuvaukseen.",
    portugalItemUnitTooLong: "Portugalilaiset yksikot on rajoitettu 20 merkkiin.",
    portugalItemTaxRequired: "Valitse taman rivin verokasittely. Portugali vaatii sen jokaiselle riville.",
    portugalItemSingleTax: "Portugali sallii yhden verokasittelyn rivia kohden. Jaa rivi sen sijaan kahtia.",
    latinOnly: "Saa sisaltaa vain latinalaisia merkkeja",
  },
  it: {
    required: "Obbligatorio",
    minChars: (count) => `Deve contenere almeno ${count} caratteri`,
    maxChars: (count) => `Deve contenere al massimo ${count} caratteri`,
    exactDigits: (count) => `Deve contenere esattamente ${count} cifre`,
    digitsOnly: "Deve contenere solo cifre",
    invalidEmail: "Indirizzo email non valido",
    invalidFormat: "Formato non valido",
    invalidValue: "Valore non valido",
    alphanumericRange: "Deve essere alfanumerico, 1-20 caratteri",
    invalidPortugalTaxNumber: "Numero fiscale portoghese non valido",
    invalidPortugalPhone: "Numero di telefono internazionale non valido",
    invalidPortugalPostCode: "Codice postale portoghese non valido",
    invalidAmount: "Importo non valido",
    amountNegative: "L'importo non puo essere negativo",
    portugalIssueDateNotToday: "I documenti portoghesi devono essere emessi con la data odierna.",
    portugalCorrectionReasonRequired: "Indica il motivo per cui viene emessa questa nota di credito.",
    portugalNameTooLong: "Il Portogallo limita la ragione sociale a 100 caratteri",
    portugalAddressTooLong: "Il Portogallo limita l'indirizzo a 210 caratteri",
    portugalCityTooLong: "Il Portogallo limita la citta a 50 caratteri",
    portugalCompanyIdTooLong: "Ufficio del registro e numero di registrazione devono stare insieme in 50 caratteri",
    portugalInvalidRegistrationNumber: "Il numero di registrazione puo contenere solo cifre e barre",
    portugalItemNameTooShort: "I nomi delle righe portoghesi devono avere almeno 2 caratteri.",
    portugalItemNameTooLong:
      "I nomi delle righe portoghesi sono limitati a 200 caratteri. Inserisci il testo piu lungo nella descrizione.",
    portugalItemUnitTooLong: "Le unita di misura portoghesi sono limitate a 20 caratteri.",
    portugalItemTaxRequired: "Scegli il trattamento IVA per questa riga. Il Portogallo lo richiede su ogni riga.",
    portugalItemSingleTax: "Il Portogallo ammette un solo trattamento IVA per riga. Dividi invece la riga.",
    latinOnly: "Deve contenere solo caratteri latini",
  },
  nl: {
    required: "Verplicht",
    minChars: (count) => `Moet minimaal ${count} tekens bevatten`,
    maxChars: (count) => `Mag maximaal ${count} tekens bevatten`,
    exactDigits: (count) => `Moet precies ${count} cijfers bevatten`,
    digitsOnly: "Mag alleen cijfers bevatten",
    invalidEmail: "Ongeldig e-mailadres",
    invalidFormat: "Ongeldig formaat",
    invalidValue: "Ongeldige waarde",
    alphanumericRange: "Moet alfanumeriek zijn, 1-20 tekens",
    invalidPortugalTaxNumber: "Ongeldig Portugees fiscaal nummer",
    invalidPortugalPhone: "Ongeldig internationaal telefoonnummer",
    invalidPortugalPostCode: "Ongeldige Portugese postcode",
    invalidAmount: "Ongeldig bedrag",
    amountNegative: "Bedrag mag niet negatief zijn",
    portugalIssueDateNotToday: "Portugese documenten moeten met de datum van vandaag worden uitgegeven.",
    portugalCorrectionReasonRequired: "Geef aan waarom deze creditnota wordt uitgegeven.",
    portugalNameTooLong: "Portugal beperkt de bedrijfsnaam tot 100 tekens",
    portugalAddressTooLong: "Portugal beperkt het adres tot 210 tekens",
    portugalCityTooLong: "Portugal beperkt de plaats tot 50 tekens",
    portugalCompanyIdTooLong: "Registerkantoor en registratienummer mogen samen maximaal 50 tekens bevatten",
    portugalInvalidRegistrationNumber: "Het registratienummer mag alleen cijfers en schuine strepen bevatten",
    portugalItemNameTooShort: "Portugese regelnamen hebben minimaal 2 tekens nodig.",
    portugalItemNameTooLong:
      "Portugese regelnamen zijn beperkt tot 200 tekens. Zet de langere tekst in de omschrijving.",
    portugalItemUnitTooLong: "Portugese eenheden zijn beperkt tot 20 tekens.",
    portugalItemTaxRequired: "Kies de btw-behandeling voor deze regel. Portugal vereist er een op elke regel.",
    portugalItemSingleTax: "Portugal accepteert een btw-behandeling per regel. Splits de regel in plaats daarvan.",
    latinOnly: "Mag alleen Latijnse tekens bevatten",
  },
  nb: {
    required: "Obligatorisk",
    minChars: (count) => `Må inneholde minst ${count} tegn`,
    maxChars: (count) => `Kan inneholde maksimalt ${count} tegn`,
    exactDigits: (count) => `Må inneholde nøyaktig ${count} sifre`,
    digitsOnly: "Må bare inneholde sifre",
    invalidEmail: "Ugyldig e-postadresse",
    invalidFormat: "Ugyldig format",
    invalidValue: "Ugyldig verdi",
    alphanumericRange: "Må være alfanumerisk, 1-20 tegn",
    invalidPortugalTaxNumber: "Ugyldig portugisisk skattenummer",
    invalidPortugalPhone: "Ugyldig internasjonalt telefonnummer",
    invalidPortugalPostCode: "Ugyldig portugisisk postnummer",
    invalidAmount: "Ugyldig beløp",
    amountNegative: "Belopet kan ikke vare negativt",
    portugalIssueDateNotToday: "Portugisiske dokumenter må utstedes med dagens dato.",
    portugalCorrectionReasonRequired: "Oppgi hvorfor denne kreditnotaen utstedes.",
    portugalNameTooLong: "Portugal begrenser firmanavnet til 100 tegn",
    portugalAddressTooLong: "Portugal begrenser adressen til 210 tegn",
    portugalCityTooLong: "Portugal begrenser stedet til 50 tegn",
    portugalCompanyIdTooLong: "Registerkontor og registreringsnummer må til sammen få plass på 50 tegn",
    portugalInvalidRegistrationNumber: "Registreringsnummeret kan bare inneholde sifre og skråstreker",
    portugalItemNameTooShort: "Portugisiske linjenavn må ha minst 2 tegn.",
    portugalItemNameTooLong:
      "Portugisiske linjenavn er begrenset til 200 tegn. Skriv den lengre teksten i beskrivelsen.",
    portugalItemUnitTooLong: "Portugisiske enheter er begrenset til 20 tegn.",
    portugalItemTaxRequired: "Velg avgiftsbehandling for denne linjen. Portugal krever det på hver linje.",
    portugalItemSingleTax: "Portugal godtar én avgiftsbehandling per linje. Del opp linjen i stedet.",
    latinOnly: "Må bare inneholde latinske tegn",
  },
  pl: {
    required: "Wymagane",
    minChars: (count) => `Musi zawierac co najmniej ${count} znakow`,
    maxChars: (count) => `Moze zawierac maksymalnie ${count} znakow`,
    exactDigits: (count) => `Musi zawierac dokladnie ${count} cyfry`,
    digitsOnly: "Musi zawierac tylko cyfry",
    invalidEmail: "Nieprawidlowy adres e-mail",
    invalidFormat: "Nieprawidlowy format",
    invalidValue: "Nieprawidlowa wartosc",
    alphanumericRange: "Musi byc alfanumeryczne, 1-20 znakow",
    invalidPortugalTaxNumber: "Nieprawidlowy portugalski numer podatkowy",
    invalidPortugalPhone: "Nieprawidlowy miedzynarodowy numer telefonu",
    invalidPortugalPostCode: "Nieprawidlowy portugalski kod pocztowy",
    invalidAmount: "Nieprawidlowa kwota",
    amountNegative: "Kwota nie moze byc ujemna",
    portugalIssueDateNotToday: "Dokumenty portugalskie musza byc wystawione z dzisiejsza data.",
    portugalCorrectionReasonRequired: "Podaj powod wystawienia tej faktury korygujacej.",
    portugalNameTooLong: "Portugalia ogranicza nazwe firmy do 100 znakow",
    portugalAddressTooLong: "Portugalia ogranicza adres do 210 znakow",
    portugalCityTooLong: "Portugalia ogranicza miejscowosc do 50 znakow",
    portugalCompanyIdTooLong: "Sad rejestrowy i numer rejestrowy moga miec lacznie najwyzej 50 znakow",
    portugalInvalidRegistrationNumber: "Numer rejestrowy moze zawierac tylko cyfry i ukosniki",
    portugalItemNameTooShort: "Nazwy pozycji portugalskich musza miec co najmniej 2 znaki.",
    portugalItemNameTooLong: "Nazwy pozycji portugalskich sa ograniczone do 200 znakow. Dluzszy tekst wpisz w opisie.",
    portugalItemUnitTooLong: "Portugalskie jednostki miary sa ograniczone do 20 znakow.",
    portugalItemTaxRequired: "Wybierz sposob opodatkowania tej pozycji. Portugalia wymaga go w kazdej pozycji.",
    portugalItemSingleTax: "Portugalia dopuszcza jeden sposob opodatkowania na pozycje. Zamiast tego podziel pozycje.",
    latinOnly: "Musi zawierac tylko znaki lacinskie",
  },
  pt: {
    required: "Obrigatorio",
    minChars: (count) => `Tem de ter pelo menos ${count} caracteres`,
    maxChars: (count) => `Tem de ter no maximo ${count} caracteres`,
    exactDigits: (count) => `Tem de ter exatamente ${count} digitos`,
    digitsOnly: "Tem de conter apenas digitos",
    invalidEmail: "Endereco de email invalido",
    invalidFormat: "Formato invalido",
    invalidValue: "Valor invalido",
    alphanumericRange: "Tem de ser alfanumerico, 1-20 caracteres",
    invalidPortugalTaxNumber: "NIF portugues invalido",
    invalidPortugalPhone: "Numero de telefone internacional invalido",
    invalidPortugalPostCode: "Codigo postal portugues invalido",
    invalidAmount: "Montante invalido",
    amountNegative: "O montante nao pode ser negativo",
    portugalIssueDateNotToday: "Os documentos portugueses tem de ser emitidos com a data de hoje.",
    portugalCorrectionReasonRequired: "Indique o motivo da emissao desta nota de credito.",
    portugalNameTooLong: "Portugal limita o nome da empresa a 100 caracteres",
    portugalAddressTooLong: "Portugal limita a morada a 210 caracteres",
    portugalCityTooLong: "Portugal limita a localidade a 50 caracteres",
    portugalCompanyIdTooLong: "A conservatoria e o numero de matricula tem de caber em 50 caracteres no total",
    portugalInvalidRegistrationNumber: "O numero de matricula so pode conter digitos e barras",
    portugalItemNameTooShort: "Os nomes das linhas portuguesas precisam de pelo menos 2 caracteres.",
    portugalItemNameTooLong:
      "Os nomes das linhas portuguesas estao limitados a 200 caracteres. Coloque o texto mais longo na descricao.",
    portugalItemUnitTooLong: "As unidades portuguesas estao limitadas a 20 caracteres.",
    portugalItemTaxRequired: "Escolha o tratamento de IVA desta linha. Portugal exige um em todas as linhas.",
    portugalItemSingleTax: "Portugal aceita apenas um tratamento de IVA por linha. Divida antes a linha.",
    latinOnly: "Tem de conter apenas caracteres latinos",
  },
  sk: {
    required: "Povinne",
    minChars: (count) => `Musi obsahovat aspon ${count} znakov`,
    maxChars: (count) => `Moze obsahovat najviac ${count} znakov`,
    exactDigits: (count) => `Musi obsahovat presne ${count} cislice`,
    digitsOnly: "Musi obsahovat iba cislice",
    invalidEmail: "Neplatna e-mailova adresa",
    invalidFormat: "Neplatny format",
    invalidValue: "Neplatna hodnota",
    alphanumericRange: "Musi byt alfanumericke, 1-20 znakov",
    invalidPortugalTaxNumber: "Neplatne portugalske danove cislo",
    invalidPortugalPhone: "Neplatne medzinarodne telefonne cislo",
    invalidPortugalPostCode: "Neplatne portugalske PSC",
    invalidAmount: "Neplatna suma",
    amountNegative: "Suma nemoze byt zaporna",
    portugalIssueDateNotToday: "Portugalske doklady musia byt vystavene s dnesnym datumom.",
    portugalCorrectionReasonRequired: "Uvedte, preco sa tento dobropis vystavuje.",
    portugalNameTooLong: "Portugalsko obmedzuje nazov firmy na 100 znakov",
    portugalAddressTooLong: "Portugalsko obmedzuje adresu na 210 znakov",
    portugalCityTooLong: "Portugalsko obmedzuje mesto na 50 znakov",
    portugalCompanyIdTooLong: "Registrovy sud a registracne cislo mozu mat spolu najviac 50 znakov",
    portugalInvalidRegistrationNumber: "Registracne cislo moze obsahovat iba cislice a lomitka",
    portugalItemNameTooShort: "Nazvy portugalskych poloziek musia mat aspon 2 znaky.",
    portugalItemNameTooLong: "Nazvy portugalskych poloziek su obmedzene na 200 znakov. Dlhsi text uvedte v popise.",
    portugalItemUnitTooLong: "Portugalske merne jednotky su obmedzene na 20 znakov.",
    portugalItemTaxRequired: "Vyberte danovy rezim pre tuto polozku. Portugalsko ho vyzaduje pri kazdej polozke.",
    portugalItemSingleTax: "Portugalsko umoznuje len jeden danovy rezim na polozku. Radsej polozku rozdelte.",
    latinOnly: "Musi obsahovat iba latinske znaky",
  },
  sl: {
    required: "Obvezno",
    minChars: (count) => `Mora vsebovati vsaj ${count} znakov`,
    maxChars: (count) => `Lahko vsebuje najvec ${count} znakov`,
    exactDigits: (count) => `Mora vsebovati natanko ${count} stevilke`,
    digitsOnly: "Vsebovati mora samo stevilke",
    invalidEmail: "Neveljaven e-postni naslov",
    invalidFormat: "Neveljaven format",
    invalidValue: "Neveljavna vrednost",
    alphanumericRange: "Mora biti alfanumericno, 1-20 znakov",
    invalidPortugalTaxNumber: "Neveljavna portugalska davcna stevilka",
    invalidPortugalPhone: "Neveljavna mednarodna telefonska stevilka",
    invalidPortugalPostCode: "Neveljavna portugalska postna stevilka",
    invalidAmount: "Neveljaven znesek",
    amountNegative: "Znesek ne more biti negativen",
    portugalIssueDateNotToday: "Portugalski dokumenti morajo biti izdani z danasnjim datumom.",
    portugalCorrectionReasonRequired: "Navedite, zakaj je izdan ta dobropis.",
    portugalNameTooLong: "Portugalska omejuje naziv podjetja na 100 znakov",
    portugalAddressTooLong: "Portugalska omejuje naslov na 210 znakov",
    portugalCityTooLong: "Portugalska omejuje kraj na 50 znakov",
    portugalCompanyIdTooLong: "Registrski organ in registrska stevilka morata skupaj obsegati najvec 50 znakov",
    portugalInvalidRegistrationNumber: "Registrska stevilka lahko vsebuje samo stevilke in posevnice",
    portugalItemNameTooShort: "Nazivi portugalskih postavk morajo imeti vsaj 2 znaka.",
    portugalItemNameTooLong: "Nazivi portugalskih postavk so omejeni na 200 znakov. Daljse besedilo vpisite v opis.",
    portugalItemUnitTooLong: "Portugalske merske enote so omejene na 20 znakov.",
    portugalItemTaxRequired: "Izberite davcno obravnavo za to postavko. Portugalska jo zahteva pri vsaki postavki.",
    portugalItemSingleTax: "Portugalska dovoljuje eno davcno obravnavo na postavko. Namesto tega postavko razdelite.",
    latinOnly: "Vsebovati mora samo latinicne znake",
  },
  sv: {
    required: "Obligatoriskt",
    minChars: (count) => `Maste innehalla minst ${count} tecken`,
    maxChars: (count) => `Far innehalla hogst ${count} tecken`,
    exactDigits: (count) => `Maste innehalla exakt ${count} siffror`,
    digitsOnly: "Får bara innehålla siffror",
    invalidEmail: "Ogiltig e-postadress",
    invalidFormat: "Ogiltigt format",
    invalidValue: "Ogiltigt varde",
    alphanumericRange: "Maste vara alfanumeriskt, 1-20 tecken",
    invalidPortugalTaxNumber: "Ogiltigt portugisiskt skattenummer",
    invalidPortugalPhone: "Ogiltigt internationellt telefonnummer",
    invalidPortugalPostCode: "Ogiltigt portugisiskt postnummer",
    invalidAmount: "Ogiltigt belopp",
    amountNegative: "Beloppet kan inte vara negativt",
    portugalIssueDateNotToday: "Portugisiska dokument maste utfardas med dagens datum.",
    portugalCorrectionReasonRequired: "Ange varfor denna kreditnota utfardas.",
    portugalNameTooLong: "Portugal begransar foretagsnamnet till 100 tecken",
    portugalAddressTooLong: "Portugal begransar adressen till 210 tecken",
    portugalCityTooLong: "Portugal begransar orten till 50 tecken",
    portugalCompanyIdTooLong: "Registreringsmyndighet och registreringsnummer far tillsammans vara hogst 50 tecken",
    portugalInvalidRegistrationNumber: "Registreringsnumret far bara innehalla siffror och snedstreck",
    portugalItemNameTooShort: "Portugisiska radnamn maste ha minst 2 tecken.",
    portugalItemNameTooLong:
      "Portugisiska radnamn ar begransade till 200 tecken. Skriv den langre texten i beskrivningen.",
    portugalItemUnitTooLong: "Portugisiska enheter ar begransade till 20 tecken.",
    portugalItemTaxRequired: "Valj momshantering for den har raden. Portugal kraver en pa varje rad.",
    portugalItemSingleTax: "Portugal godtar en momshantering per rad. Dela upp raden i stallet.",
    latinOnly: "Får bara innehålla latinska tecken",
  },
  is: {
    required: "Skyldureitur",
    minChars: (count) => `Verdur ad innihalda ad minnsta kosti ${count} stafi`,
    maxChars: (count) => `Ma innihalda ad haesta lagi ${count} stafi`,
    exactDigits: (count) => `Verdur ad innihalda natturlega ${count} tolustafi`,
    digitsOnly: "Ma einungis innihalda tolustafi",
    invalidEmail: "Ogiltt netfang",
    invalidFormat: "Ogilt snið",
    invalidValue: "Ogilt gildi",
    alphanumericRange: "Verdur ad vera bokstafa- og tolustafablandad, 1-20 stafir",
    invalidPortugalTaxNumber: "Ogilt portugalskt skattnumer",
    invalidPortugalPhone: "Ogilt althjodlegt simanumer",
    invalidPortugalPostCode: "Ogilt portugalskt postnumer",
    invalidAmount: "Ogild upphaed",
    amountNegative: "Upphaed ma ekki vera neikvaed",
    portugalIssueDateNotToday: "Portugalsk skjol verda ad vera gefin ut med dagsetningu dagsins i dag.",
    portugalCorrectionReasonRequired: "Tilgreindu hvers vegna thessi kreditreikningur er gefinn ut.",
    portugalNameTooLong: "Portugal takmarkar heiti fyrirtaekis vid 100 stafi",
    portugalAddressTooLong: "Portugal takmarkar heimilisfang vid 210 stafi",
    portugalCityTooLong: "Portugal takmarkar borg vid 50 stafi",
    portugalCompanyIdTooLong: "Fyrirtaekjaskra og skraningarnumer mega samtals vera 50 stafir",
    portugalInvalidRegistrationNumber: "Skraningarnumer ma adeins innihalda tolustafi og skastrik",
    portugalItemNameTooShort: "Heiti portugalskra lina verda ad vera ad minnsta kosti 2 stafir.",
    portugalItemNameTooLong: "Heiti portugalskra lina takmarkast vid 200 stafi. Settu lengri textann i lysinguna.",
    portugalItemUnitTooLong: "Portugalskar einingar takmarkast vid 20 stafi.",
    portugalItemTaxRequired: "Veldu skattamedferd fyrir thessa linu. Portugal krefst hennar a hverri linu.",
    portugalItemSingleTax: "Portugal leyfir eina skattamedferd a linu. Skiptu linunni upp i stadinn.",
    latinOnly: "Ma einungis innihalda latneska stafi",
  },
};

const tooSmallStringRegex = /^Too small: expected string to have >=(\d+) characters$/;
const tooBigStringRegex = /^Too big: expected string to have <=(\d+) characters$/;
const invalidPatternRegex = /^Invalid string: must match pattern (\/.*\/)$/;
const invalidInputRegex = /^Invalid input: expected .*$/;

function getDictionary(locale?: string): ValidationDictionary {
  const language = getLocaleLanguage(locale);
  return dictionaries[language] ?? dictionaries.en;
}

function normalizePattern(pattern: string): string {
  return pattern.replaceAll("\\\\", "\\");
}

export function getValidationLocale(explicitLocale?: string): string {
  if (explicitLocale?.trim()) return explicitLocale;

  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement.lang?.trim();
    if (htmlLang) return htmlLang;
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }

  return "en";
}

export function translateZodValidationMessage(message?: string, locale?: string): string | undefined {
  if (!message) return message;

  const dict = getDictionary(locale);

  if (message === "Invalid email address") {
    return dict.invalidEmail;
  }

  if (message === "Required") {
    return dict.required;
  }

  if (message === "Invalid Portuguese tax number") {
    return dict.invalidPortugalTaxNumber;
  }

  if (message === "Invalid international phone number") {
    return dict.invalidPortugalPhone;
  }

  if (message === "Invalid Portuguese post code") {
    return dict.invalidPortugalPostCode;
  }

  if (message === "Invalid amount") {
    return dict.invalidAmount;
  }

  if (message === "Amount cannot be negative") {
    return dict.amountNegative;
  }

  if (message === "Portuguese documents must be issued with today's date.") {
    return dict.portugalIssueDateNotToday;
  }

  if (message === "State why this credit note is being issued.") {
    return dict.portugalCorrectionReasonRequired;
  }

  if (message === "Portugal limits the company name to 100 characters") {
    return dict.portugalNameTooLong;
  }

  if (message === "Portugal limits the address to 210 characters") {
    return dict.portugalAddressTooLong;
  }

  if (message === "Portugal limits the city to 50 characters") {
    return dict.portugalCityTooLong;
  }

  if (message === "Registry office and registration number must fit 50 characters together") {
    return dict.portugalCompanyIdTooLong;
  }

  if (message === "Registration number must contain only digits and slashes") {
    return dict.portugalInvalidRegistrationNumber;
  }

  if (message === "Portuguese line names need at least 2 characters.") {
    return dict.portugalItemNameTooShort;
  }

  if (message === "Portuguese line names are limited to 200 characters. Put the longer wording in the description.") {
    return dict.portugalItemNameTooLong;
  }

  if (message === "Portuguese units are limited to 20 characters.") {
    return dict.portugalItemUnitTooLong;
  }

  if (message === "Pick the tax treatment for this line. Portugal needs one on every line.") {
    return dict.portugalItemTaxRequired;
  }

  if (message === "Portugal accepts one tax treatment per line. Split the line instead.") {
    return dict.portugalItemSingleTax;
  }

  if (message === "Must contain only Latin characters") {
    return dict.latinOnly;
  }

  if (message === "Must be alphanumeric, 1-20 characters") {
    return dict.alphanumericRange;
  }

  const tooSmallMatch = message.match(tooSmallStringRegex);
  if (tooSmallMatch) {
    const count = Number.parseInt(tooSmallMatch[1] || "0", 10);
    return count <= 1 ? dict.required : dict.minChars(count);
  }

  const tooBigMatch = message.match(tooBigStringRegex);
  if (tooBigMatch) {
    const count = Number.parseInt(tooBigMatch[1] || "0", 10);
    return dict.maxChars(count);
  }

  const invalidPatternMatch = message.match(invalidPatternRegex);
  if (invalidPatternMatch) {
    const pattern = normalizePattern(invalidPatternMatch[1] || "");

    if (pattern === "/^\\d+$/") {
      return dict.digitsOnly;
    }

    const exactDigitsMatch = pattern.match(/^\/\^\\d\{(\d+)\}\$\/$/);
    if (exactDigitsMatch) {
      return dict.exactDigits(Number.parseInt(exactDigitsMatch[1] || "0", 10));
    }

    return dict.invalidFormat;
  }

  if (invalidInputRegex.test(message)) {
    return dict.invalidValue;
  }

  return message;
}
