"use client";

import * as Primitivo from "@radix-ui/react-dialog";
import type { ComponentProps, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export function Sheet(props: ComponentProps<typeof Primitivo.Root>) {
  return <Primitivo.Root modal={false} {...props} />;
}

export function SheetContent({ titulo, children, className, rotuloDoFechar = "Fechar painel", aoSeguirLink }: {
  titulo: ReactNode;
  children: ReactNode;
  className?: string;
  rotuloDoFechar?: string;
  aoSeguirLink?: (destino: string) => void;
}) {
  return (
    <Primitivo.Portal>
      <div className="fixed inset-x-0 bottom-0 top-[var(--vf-altura-topo)] z-10 bg-[#0B2545]/30" aria-hidden />
      <Primitivo.Content
        aria-describedby={undefined}
        onInteractOutside={(evento) => evento.preventDefault()}
        onClickCapture={(evento) => {
          const destino = (evento.target as HTMLElement).closest("a[href]")?.getAttribute("href");
          if (destino) aoSeguirLink?.(destino);
        }}
        className={cn("fixed bottom-0 right-0 top-[var(--vf-altura-topo)] z-10 flex w-full max-w-2xl flex-col border-l border-linha bg-fundo shadow-xl focus:outline-none", className)}
      >
        <div className="flex items-center justify-between gap-3 border-b border-linha bg-white px-4 py-2.5">
          <Primitivo.Title className="truncate text-sm font-medium text-tinta-suave">{titulo}</Primitivo.Title>
          <Primitivo.Close aria-label={rotuloDoFechar} className="alvo-toque flex h-8 w-8 items-center justify-center rounded text-tinta-apagada hover:bg-fundo hover:text-tinta">
            <X size={16} />
          </Primitivo.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </Primitivo.Content>
    </Primitivo.Portal>
  );
}
