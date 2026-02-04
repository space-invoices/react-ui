"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

export type StatCardProps = {
  title: string;
  value: string | number | undefined;
  href?: string;
  onClick?: () => void;
};

export function StatCard({ title, value, href, onClick }: StatCardProps) {
  const content = (
    <Card className="cursor-pointer transition-colors hover:bg-accent/50">
      <CardHeader className="pb-2">
        <CardTitle className="font-medium text-muted-foreground text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{value ?? 0}</div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}
