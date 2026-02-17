import { TableHead, TableHeader, TableRow } from "@/ui/components/ui/table";

type TaxListHeaderProps = {
  t: (key: string) => string;
};

export default function TaxListHeader({ t }: TaxListHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>{t("Name")}</TableHead>
        <TableHead>{t("Tax Rates")}</TableHead>
        <TableHead>{t("Created")}</TableHead>
        <TableHead className="text-right" />
      </TableRow>
    </TableHeader>
  );
}
