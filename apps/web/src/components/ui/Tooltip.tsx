"use client";

import * as Primitivo from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export const TooltipProvider = Primitivo.Provider;

export function Tooltip({ texto, children, lado = "top" }: { texto: ReactNode; children: ReactNode; lado?: "top" | "right" | "bottom" | "left" }) {
  return (
    <Primitivo.Root delayDuration={200}>
      <Primitivo.Trigger asChild>{children}</Primitivo.Trigger>
      <Primitivo.Portal>
        <Primitivo.Content side={lado} sideOffset={6} className="z-50 rounded bg-tinta px-2 py-1 text-xs font-medium text-white shadow-md">
          {texto}
        </Primitivo.Content>
      </Primitivo.Portal>
    </Primitivo.Root>
  );
}
