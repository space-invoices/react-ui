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
