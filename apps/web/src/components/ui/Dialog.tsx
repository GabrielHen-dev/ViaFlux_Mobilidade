"use client";

import * as Primitivo from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export const Dialog = Primitivo.Root;
export const DialogTrigger = Primitivo.Trigger;
export const DialogClose = Primitivo.Close;

export function DialogContent({ titulo, descricao, children, className, larga = false }: {
  titulo: ReactNode;
  descricao?: ReactNode;
  children: ReactNode;
  className?: string;
  larga?: boolean;
}) {
  return (
    <Primitivo.Portal>
      <Primitivo.Overlay className="fixed inset-0 z-50 bg-[#0B2545]/40" />
      <Primitivo.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded border border-linha bg-white shadow-xl focus:outline-none",
          larga ? "max-w-2xl" : "max-w-md",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-linha px-5 py-3.5">
          <div>
            <Primitivo.Title className="text-base font-medium text-tinta">{titulo}</Primitivo.Title>
            {descricao ? <Primitivo.Description className="mt-0.5 text-xs text-tinta-suave">{descricao}</Primitivo.Description> : <Primitivo.Description className="sr-only">{titulo}</Primitivo.Description>}
          </div>
          <Primitivo.Close aria-label="Fechar" className="alvo-toque flex h-8 w-8 items-center justify-center rounded text-tinta-apagada hover:bg-fundo hover:text-tinta">
            <X size={16} />
          </Primitivo.Close>
        </div>
        <div className="px-5 py-4">{children}</div>
      </Primitivo.Content>
    </Primitivo.Portal>
  );
}
