/**
 * Shared constants for the UI library
 */

/**
 * Supported currencies - comprehensive list of world currencies
 * Includes: Major world currencies, G20 currencies, European currencies, and common trading currencies
 * Sorted alphabetically by code (ISO 4217)
 */
export const CURRENCY_CODES = [
  // Middle East
  { value: "AED", label: "AED - UAE Dirham" },
  // Africa
  { value: "AFN", label: "AFN - Afghan Afghani" },
  // Europe
  { value: "ALL", label: "ALL - Albanian Lek" },
  // Middle East
  { value: "AMD", label: "AMD - Armenian Dram" },
  // Caribbean
  { value: "ANG", label: "ANG - Netherlands Antillean Guilder" },
  // Africa
  { value: "AOA", label: "AOA - Angolan Kwanza" },
  // South America
  { value: "ARS", label: "ARS - Argentine Peso" },
  // Oceania
  { value: "AUD", label: "AUD - Australian Dollar" },
  // Caribbean
  { value: "AWG", label: "AWG - Aruban Florin" },
  // Europe
  { value: "AZN", label: "AZN - Azerbaijani Manat" },
  { value: "BAM", label: "BAM - Bosnia-Herzegovina Mark" },
  // Caribbean
  { value: "BBD", label: "BBD - Barbadian Dollar" },
  // Asia
  { value: "BDT", label: "BDT - Bangladeshi Taka" },
  // Europe
  { value: "BGN", label: "BGN - Bulgarian Lev" },
  // Middle East
  { value: "BHD", label: "BHD - Bahraini Dinar" },
  // Africa
  { value: "BIF", label: "BIF - Burundian Franc" },
  // Caribbean
  { value: "BMD", label: "BMD - Bermudian Dollar" },
  // Asia
  { value: "BND", label: "BND - Brunei Dollar" },
  // South America
  { value: "BOB", label: "BOB - Bolivian Boliviano" },
  { value: "BRL", label: "BRL - Brazilian Real" },
  // Caribbean
  { value: "BSD", label: "BSD - Bahamian Dollar" },
  // Asia
  { value: "BTN", label: "BTN - Bhutanese Ngultrum" },
  // Africa
  { value: "BWP", label: "BWP - Botswanan Pula" },
  // Europe
  { value: "BYN", label: "BYN - Belarusian Ruble" },
  // Central America
  { value: "BZD", label: "BZD - Belize Dollar" },
  // North America
  { value: "CAD", label: "CAD - Canadian Dollar" },
  // Africa
  { value: "CDF", label: "CDF - Congolese Franc" },
  // Europe
  { value: "CHF", label: "CHF - Swiss Franc" },
  // South America
  { value: "CLP", label: "CLP - Chilean Peso" },
  // Asia
  { value: "CNY", label: "CNY - Chinese Yuan" },
  // South America
  { value: "COP", label: "COP - Colombian Peso" },
  // Central America
  { value: "CRC", label: "CRC - Costa Rican Colon" },
  // Caribbean
  { value: "CUP", label: "CUP - Cuban Peso" },
  // Africa
  { value: "CVE", label: "CVE - Cape Verdean Escudo" },
  // Europe
  { value: "CZK", label: "CZK - Czech Koruna" },
  // Africa
  { value: "DJF", label: "DJF - Djiboutian Franc" },
  // Europe
  { value: "DKK", label: "DKK - Danish Krone" },
  // Caribbean
  { value: "DOP", label: "DOP - Dominican Peso" },
  // Africa
  { value: "DZD", label: "DZD - Algerian Dinar" },
  // Africa
  { value: "EGP", label: "EGP - Egyptian Pound" },
  // Africa
  { value: "ERN", label: "ERN - Eritrean Nakfa" },
  // Africa
  { value: "ETB", label: "ETB - Ethiopian Birr" },
  // Europe
  { value: "EUR", label: "EUR - Euro" },
  // Oceania
  { value: "FJD", label: "FJD - Fijian Dollar" },
  // Europe
  { value: "GBP", label: "GBP - British Pound" },
  { value: "GEL", label: "GEL - Georgian Lari" },
  // Africa
  { value: "GHS", label: "GHS - Ghanaian Cedi" },
  // Europe
  { value: "GIP", label: "GIP - Gibraltar Pound" },
  // Africa
  { value: "GMD", label: "GMD - Gambian Dalasi" },
  { value: "GNF", label: "GNF - Guinean Franc" },
  // Central America
  { value: "GTQ", label: "GTQ - Guatemalan Quetzal" },
  // South America
  { value: "GYD", label: "GYD - Guyanese Dollar" },
  // Asia
  { value: "HKD", label: "HKD - Hong Kong Dollar" },
  // Central America
  { value: "HNL", label: "HNL - Honduran Lempira" },
  // Europe
  { value: "HRK", label: "HRK - Croatian Kuna" },
  // Caribbean
  { value: "HTG", label: "HTG - Haitian Gourde" },
  // Europe
  { value: "HUF", label: "HUF - Hungarian Forint" },
  // Asia
  { value: "IDR", label: "IDR - Indonesian Rupiah" },
  { value: "ILS", label: "ILS - Israeli Shekel" },
  { value: "INR", label: "INR - Indian Rupee" },
  // Middle East
  { value: "IQD", label: "IQD - Iraqi Dinar" },
  { value: "IRR", label: "IRR - Iranian Rial" },
  // Europe
  { value: "ISK", label: "ISK - Icelandic Krona" },
  // Caribbean
  { value: "JMD", label: "JMD - Jamaican Dollar" },
  // Middle East
  { value: "JOD", label: "JOD - Jordanian Dinar" },
  // Asia
  { value: "JPY", label: "JPY - Japanese Yen" },
  // Africa
  { value: "KES", label: "KES - Kenyan Shilling" },
  // Asia
  { value: "KGS", label: "KGS - Kyrgystani Som" },
  { value: "KHR", label: "KHR - Cambodian Riel" },
  // Africa
  { value: "KMF", label: "KMF - Comorian Franc" },
  // Asia
  { value: "KRW", label: "KRW - South Korean Won" },
  // Middle East
  { value: "KWD", label: "KWD - Kuwaiti Dinar" },
  // Caribbean
  { value: "KYD", label: "KYD - Cayman Islands Dollar" },
  // Asia
  { value: "KZT", label: "KZT - Kazakhstani Tenge" },
  { value: "LAK", label: "LAK - Laotian Kip" },
  // Middle East
  { value: "LBP", label: "LBP - Lebanese Pound" },
  // Asia
  { value: "LKR", label: "LKR - Sri Lankan Rupee" },
  // Africa
  { value: "LRD", label: "LRD - Liberian Dollar" },
  { value: "LSL", label: "LSL - Lesotho Loti" },
  // Africa
  { value: "LYD", label: "LYD - Libyan Dinar" },
  { value: "MAD", label: "MAD - Moroccan Dirham" },
  // Europe
  { value: "MDL", label: "MDL - Moldovan Leu" },
  // Africa
  { value: "MGA", label: "MGA - Malagasy Ariary" },
  // Europe
  { value: "MKD", label: "MKD - Macedonian Denar" },
  // Asia
  { value: "MMK", label: "MMK - Myanmar Kyat" },
  { value: "MNT", label: "MNT - Mongolian Tugrik" },
  { value: "MOP", label: "MOP - Macanese Pataca" },
  // Africa
  { value: "MRU", label: "MRU - Mauritanian Ouguiya" },
  { value: "MUR", label: "MUR - Mauritian Rupee" },
  // Asia
  { value: "MVR", label: "MVR - Maldivian Rufiyaa" },
  // Africa
  { value: "MWK", label: "MWK - Malawian Kwacha" },
  // North America
  { value: "MXN", label: "MXN - Mexican Peso" },
  // Asia
  { value: "MYR", label: "MYR - Malaysian Ringgit" },
  // Africa
  { value: "MZN", label: "MZN - Mozambican Metical" },
  { value: "NAD", label: "NAD - Namibian Dollar" },
  { value: "NGN", label: "NGN - Nigerian Naira" },
  // Central America
  { value: "NIO", label: "NIO - Nicaraguan Cordoba" },
  // Europe
  { value: "NOK", label: "NOK - Norwegian Krone" },
  // Asia
  { value: "NPR", label: "NPR - Nepalese Rupee" },
  // Oceania
  { value: "NZD", label: "NZD - New Zealand Dollar" },
  // Middle East
  { value: "OMR", label: "OMR - Omani Rial" },
  // Central America
  { value: "PAB", label: "PAB - Panamanian Balboa" },
  // South America
  { value: "PEN", label: "PEN - Peruvian Sol" },
  // Oceania
  { value: "PGK", label: "PGK - Papua New Guinean Kina" },
  // Asia
  { value: "PHP", label: "PHP - Philippine Peso" },
  { value: "PKR", label: "PKR - Pakistani Rupee" },
  // Europe
  { value: "PLN", label: "PLN - Polish Zloty" },
  // South America
  { value: "PYG", label: "PYG - Paraguayan Guarani" },
  // Middle East
  { value: "QAR", label: "QAR - Qatari Rial" },
  // Europe
  { value: "RON", label: "RON - Romanian Leu" },
  { value: "RSD", label: "RSD - Serbian Dinar" },
  { value: "RUB", label: "RUB - Russian Ruble" },
  // Africa
  { value: "RWF", label: "RWF - Rwandan Franc" },
  // Middle East
  { value: "SAR", label: "SAR - Saudi Riyal" },
  // Oceania
  { value: "SBD", label: "SBD - Solomon Islands Dollar" },
  // Africa
  { value: "SCR", label: "SCR - Seychellois Rupee" },
  { value: "SDG", label: "SDG - Sudanese Pound" },
  // Europe
  { value: "SEK", label: "SEK - Swedish Krona" },
  // Asia
  { value: "SGD", label: "SGD - Singapore Dollar" },
  // Africa
  { value: "SLL", label: "SLL - Sierra Leonean Leone" },
  { value: "SOS", label: "SOS - Somali Shilling" },
  // South America
  { value: "SRD", label: "SRD - Surinamese Dollar" },
  // Africa
  { value: "SSP", label: "SSP - South Sudanese Pound" },
  { value: "STN", label: "STN - Sao Tome and Principe Dobra" },
  // Central America
  { value: "SVC", label: "SVC - Salvadoran Colon" },
  // Middle East
  { value: "SYP", label: "SYP - Syrian Pound" },
  // Africa
  { value: "SZL", label: "SZL - Swazi Lilangeni" },
  // Asia
  { value: "THB", label: "THB - Thai Baht" },
  { value: "TJS", label: "TJS - Tajikistani Somoni" },
  { value: "TMT", label: "TMT - Turkmenistani Manat" },
  // Africa
  { value: "TND", label: "TND - Tunisian Dinar" },
  // Oceania
  { value: "TOP", label: "TOP - Tongan Pa'anga" },
  // Europe
  { value: "TRY", label: "TRY - Turkish Lira" },
  // Caribbean
  { value: "TTD", label: "TTD - Trinidad and Tobago Dollar" },
  // Asia
  { value: "TWD", label: "TWD - New Taiwan Dollar" },
  // Africa
  { value: "TZS", label: "TZS - Tanzanian Shilling" },
  // Europe
  { value: "UAH", label: "UAH - Ukrainian Hryvnia" },
  // Africa
  { value: "UGX", label: "UGX - Ugandan Shilling" },
  // North America
  { value: "USD", label: "USD - US Dollar" },
  // South America
  { value: "UYU", label: "UYU - Uruguayan Peso" },
  // Asia
  { value: "UZS", label: "UZS - Uzbekistan Som" },
  // South America
  { value: "VES", label: "VES - Venezuelan Bolivar" },
  // Asia
  { value: "VND", label: "VND - Vietnamese Dong" },
  // Oceania
  { value: "VUV", label: "VUV - Vanuatu Vatu" },
  { value: "WST", label: "WST - Samoan Tala" },
  // Africa
  { value: "XAF", label: "XAF - Central African CFA Franc" },
  { value: "XOF", label: "XOF - West African CFA Franc" },
  // Middle East
  { value: "YER", label: "YER - Yemeni Rial" },
  // Africa
  { value: "ZAR", label: "ZAR - South African Rand" },
  { value: "ZMW", label: "ZMW - Zambian Kwacha" },
  { value: "ZWL", label: "ZWL - Zimbabwean Dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number]["value"];
