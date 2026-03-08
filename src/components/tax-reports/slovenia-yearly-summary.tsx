type SloveniaYearlySummaryProps = {
  items: Array<{
    label: string;
    value: string;
  }>;
};

export function SloveniaYearlySummary({ items }: SloveniaYearlySummaryProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border bg-muted/30 p-3">
          <p className="text-muted-foreground text-sm">{item.label}</p>
          <p className="font-semibold text-base">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
