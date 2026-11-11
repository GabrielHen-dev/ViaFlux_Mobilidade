"use client";

import * as Primitivo from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export const DropdownMenu = Primitivo.Root;
export const DropdownMenuTrigger = Primitivo.Trigger;

export function DropdownMenuContent({ className, align = "end", sideOffset = 6, ...props }: ComponentProps<typeof Primitivo.Content>) {
  return (
    <Primitivo.Portal>
      <Primitivo.Content
        align={align}
        sideOffset={sideOffset}
        className={cn("z-50 min-w-48 rounded border border-linha bg-white py-1 shadow-lg focus:outline-none", className)}
        {...props}
      />
    </Primitivo.Portal>
  );
}

export function DropdownMenuItem({ className, perigo = false, ...props }: ComponentProps<typeof Primitivo.Item> & { perigo?: boolean }) {
  return (
    <Primitivo.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        perigo ? "text-[var(--vf-perigo)] data-[highlighted]:bg-[var(--vf-perigo-fundo)]" : "text-tinta data-[highlighted]:bg-fundo",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Primitivo.Label>) {
  return <Primitivo.Label className={cn("px-3 py-2 text-xs text-tinta-apagada", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Primitivo.Separator>) {
  return <Primitivo.Separator className={cn("my-1 h-px bg-linha", className)} {...props} />;
}
