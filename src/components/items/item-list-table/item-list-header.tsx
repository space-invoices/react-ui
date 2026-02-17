import { TableHead, TableHeader, TableRow } from "@/ui/components/ui/table";
import type { ComponentTranslationProps } from "@/ui/lib/translation";
import { createTranslation } from "@/ui/lib/translation";

type ItemListHeaderProps = ComponentTranslationProps;

export default function ItemListHeader({ ...i18nProps }: ItemListHeaderProps) {
  const t = createTranslation(i18nProps);

  return (
    <TableHeader>
      <TableRow>
        <TableHead>{t("Name")}</TableHead>
        <TableHead>{t("Description")}</TableHead>
        <TableHead className="text-right">{t("Price")}</TableHead>
        <TableHead className="w-[42px] text-right" />
      </TableRow>
    </TableHeader>
  );
}
