import { Card, CardContent, CardHeader } from "@/ui/components/ui/card";
import { cn } from "@/ui/lib/utils";

export type LoadingCardProps = {
  className?: string;
};

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
