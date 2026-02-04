"use client";

import * as React from "react";

import { cn } from "@/ui/lib/utils";
import { Button } from "@/ui/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/components/ui/dialog";

// AlertDialog is built on top of Dialog but styled for confirmations
const AlertDialog = Dialog;
const AlertDialogTrigger = DialogTrigger;
const AlertDialogContent = ({ className, ...props }: Parameters<typeof DialogContent>[0]) => (
  <DialogContent showCloseButton={false} className={cn("sm:max-w-md", className)} {...props} />
);
const AlertDialogHeader = DialogHeader;
const AlertDialogFooter = DialogFooter;
const AlertDialogTitle = DialogTitle;
const AlertDialogDescription = DialogDescription;

type ButtonProps = React.ComponentProps<typeof Button>;

function AlertDialogAction({ className, children, ...props }: ButtonProps & { onClick?: () => void }) {
  return (
    <DialogClose asChild>
      <Button className={className} {...props}>
        {children}
      </Button>
    </DialogClose>
  );
}

function AlertDialogCancel({ className, children, ...props }: ButtonProps) {
  return (
    <DialogClose asChild>
      <Button variant="outline" className={cn("mt-2 sm:mt-0", className)} {...props}>
        {children}
      </Button>
    </DialogClose>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
