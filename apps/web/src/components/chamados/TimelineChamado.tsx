"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Chamado } from "@/types/chamado";
import IconeDoEvento from "@/components/ui/IconeDoEvento";
import { formatarDataHora } from "@/utils/date";
import { cn } from "@/utils/cn";

interface Props {
  chamado: Chamado;
  visaoDeCliente?: boolean;
}

export default function TimelineChamado({ chamado, visaoDeCliente = false }: Props) {
  const [somentePublicos, setSomentePublicos] = useState(false);
  const eventosSemConversa = chamado.timeline.filter((evento) => evento.tipo !== "ATUALIZACAO");
  const eventos = somentePublicos ? eventosSemConversa.filter((evento) => evento.visivelCliente) : eventosSemConversa;

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6" aria-labelledby={`timeline-${chamado.id}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 id={`timeline-${chamado.id}`} className="font-display text-sm font-semibold text-brand-navy">Histórico</h3>
        {!visaoDeCliente && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={somentePublicos} onChange={(evento) => setSomentePublicos(evento.target.checked)} />
            Visão do solicitante
          </label>
        )}
      </div>
      <ol className="relative space-y-5">
        <span className="absolute bottom-0 left-4 top-0 w-px bg-[#E2E8F0]" aria-hidden />
        {eventos.map((evento) => (
          <li key={evento.id} className="relative flex gap-4">
            <span className={cn("z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white", evento.tipo === "SLA" ? "border-orange-200 text-orange-600" : "border-[#E2E8F0] text-[#475569]")}>
              <IconeDoEvento tipo={evento.tipo} size={14} />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-brand-dark">{evento.acao}</span>
                {!visaoDeCliente && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", evento.visivelCliente ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {evento.visivelCliente ? <Eye size={10} aria-hidden /> : <EyeOff size={10} aria-hidden />}
                    {evento.visivelCliente ? "Público" : "Interno"}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#94A3B8]">
                <time dateTime={evento.ocorridoEm}>{formatarDataHora(evento.ocorridoEm)}</time> · {evento.autor?.nome ?? "Sistema"}
              </p>
              {evento.detalhe && <p className="mt-1 break-words text-xs text-[#64748B]">{evento.detalhe}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
