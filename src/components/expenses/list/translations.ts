import { withTableTranslations } from "@/ui/components/table/locales";
import bg from "./locales/bg";
import cs from "./locales/cs";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import et from "./locales/et";
import fi from "./locales/fi";
import fr from "./locales/fr";
import hr from "./locales/hr";
import is from "./locales/is";
import it from "./locales/it";
import nb from "./locales/nb";
import nl from "./locales/nl";
import pl from "./locales/pl";
import pt from "./locales/pt";
import sk from "./locales/sk";
import sl from "./locales/sl";
import sv from "./locales/sv";

export const expenseListTranslations = withTableTranslations({
  en,
  sl,
  de,
  it,
  fr,
  es,
  pt,
  nl,
  pl,
  hr,
  sv,
  fi,
  et,
  bg,
  cs,
  sk,
  nb,
  is,
} as const);
