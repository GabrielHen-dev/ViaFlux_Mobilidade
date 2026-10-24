"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Chamado } from "@/types/chamado";
import { registrarAtualizacao } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { useRascunho } from "@/hooks/useRascunho";
import IconeDoEvento from "@/components/ui/IconeDoEvento";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { formatarDataHora } from "@/utils/date";
import { cn } from "@/utils/cn";
import { useUsuarioAutenticado } from "@/store/AuthContext";

interface Props {
  chamado: Chamado;
  visaoDeCliente?: boolean;
  somenteLeitura?: boolean;
}

export default function TimelineChamado({ chamado, visaoDeCliente = false, somenteLeitura = false }: Props) {
  const usuario = useUsuarioAutenticado();
  const { valor: texto, setValor: setTexto, descartar } = useRascunho(`atualizacao:${usuario.id}:${chamado.id}`, "");
  const [visivelCliente, setVisivelCliente] = useState(false);
  const [somentePublicos, setSomentePublicos] = useState(false);
  const atualizacao = useAcaoNoChamado(chamado.id, (api, dados: { texto: string; visivelCliente: boolean }) => registrarAtualizacao(api, chamado.id, dados));
  const eventos = somentePublicos ? chamado.timeline.filter((evento) => evento.visivelCliente) : chamado.timeline;

  function enviar() {
    if (!texto.trim()) return;
    atualizacao.mutate({ texto: texto.trim(), visivelCliente: visaoDeCliente || visivelCliente }, { onSuccess: () => descartar("") });
  }

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6" aria-labelledby={`timeline-${chamado.id}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 id={`timeline-${chamado.id}`} className="font-display text-sm font-semibold text-brand-navy">{visaoDeCliente ? "Histórico do atendimento" : "Timeline do histórico"}</h3>
        {!visaoDeCliente && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={somentePublicos} onChange={(evento) => setSomentePublicos(evento.target.checked)} />
            Ver como o cliente vê
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

      {!somenteLeitura && <div className="mt-5 border-t border-[#F1F5F9] pt-5">
        <label htmlFor={`nova-atualizacao-${chamado.id}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#475569]">
          {visaoDeCliente ? "Complementar informações" : "Adicionar atualização ao histórico"}
        </label>
        <textarea
          id={`nova-atualizacao-${chamado.id}`}
          className="w-full resize-none rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 text-sm text-brand-dark outline-none transition-all focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
          rows={2}
          placeholder={visaoDeCliente ? "Algo que a equipe precisa saber?" : "Registre o que foi feito ou a mensagem ao solicitante…"}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          {visaoDeCliente ? <span /> : (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={visivelCliente} onChange={(evento) => setVisivelCliente(evento.target.checked)} />
              Visível para o cliente (conta como 1ª resposta)
            </label>
          )}
          <button
            type="button"
            onClick={enviar}
            disabled={!texto.trim() || atualizacao.isPending}
            className="alvo-toque rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {atualizacao.isPending ? "Registrando…" : "Registrar"}
          </button>
        </div>
        {atualizacao.isError && <div className="mt-2"><AvisoDeErro erro={atualizacao.error} /></div>}
      </div>}
    </section>
  );
}
