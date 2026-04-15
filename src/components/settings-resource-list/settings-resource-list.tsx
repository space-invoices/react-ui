import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/ui/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";

export function SettingsResourceListCard({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title ? <CardTitle className="text-base">{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      )}
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function SettingsResourceListEmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsResourceListItem({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
      {...props}
    />
  );
}

export function SettingsResourceListItemBody({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("min-w-0 space-y-2", className)} {...props} />;
}

export function SettingsResourceListItemTitleRow({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />;
}

export function SettingsResourceListItemDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

export function SettingsResourceListItemBadges({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex flex-wrap gap-2 text-xs", className)} {...props} />;
}

export function SettingsResourceListItemActions({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex shrink-0 items-center gap-2", className)} {...props} />;
}
