"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import type { ChamadoResumo } from "@/types/chamado";
import { escalonarChamado } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { slaVencido } from "@/components/ui/SlaIndicador";
import { cn } from "@/utils/cn";
import { formatarDataHora } from "@/utils/date";

const STATUS_ENCERRADOS = ["Resolvido", "Fechado"];
const LIMITE_DA_OBSERVACAO = 1000;

export function podeEscalonar(chamado: ChamadoResumo) {
  return chamado.escalonamento === null && !STATUS_ENCERRADOS.includes(chamado.status) && slaVencido(chamado.sla);
}

function DialogoDeEscalonamento({ chamado, aoFechar }: { chamado: ChamadoResumo; aoFechar: () => void }) {
  const idDoTitulo = useId();
  const campo = useRef<HTMLTextAreaElement>(null);
  const [observacao, setObservacao] = useState("");
  const escalonamento = useAcaoNoChamado<string>(chamado.id, (api, texto) => escalonarChamado(api, chamado.id, texto));

  useEffect(() => {
    campo.current?.focus();
    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoPressionar);
    return () => document.removeEventListener("keydown", aoPressionar);
  }, [aoFechar]);

  function confirmar() {
    escalonamento.mutate(observacao.trim(), {
      onSuccess: () => {
        toast.success("Chamado escalonado", { description: `A liderança foi notificada sobre o chamado ${chamado.id}.` });
        aoFechar();
      },
      onError: (erro) => toast.error("Não foi possível escalonar", { description: mensagemDeErro(erro) }),
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/40 p-4 backdrop-blur-[2px] sm:items-center" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) aoFechar(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={idDoTitulo} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><ShieldAlert size={20} aria-hidden /></span>
            <div>
              <h2 id={idDoTitulo} className="font-display text-base font-bold text-brand-navy">Escalonar à liderança</h2>
              <p className="mt-0.5 text-sm text-slate-500">Chamado #{chamado.id} · SLA vencido</p>
            </div>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
        </div>
        <label htmlFor={`${idDoTitulo}-observacao`} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#475569]">Observação (opcional)</label>
        <textarea
          ref={campo}
          id={`${idDoTitulo}-observacao`}
          rows={4}
          maxLength={LIMITE_DA_OBSERVACAO}
          value={observacao}
          onChange={(evento) => setObservacao(evento.target.value)}
          placeholder="Contexto para a liderança"
          className="w-full resize-none rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
        />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={aoFechar} className="alvo-toque rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="button" disabled={escalonamento.isPending} onClick={confirmar} className="alvo-toque inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            <ArrowUpRight size={15} aria-hidden /> {escalonamento.isPending ? "Escalonando…" : "Escalonar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function BotaoDeEscalonamento({ chamado, compacto = false }: { chamado: ChamadoResumo; compacto?: boolean }) {
  const [aberto, setAberto] = useState(false);
  if (!podeEscalonar(chamado)) return null;
  return (
    <>
      <button
        type="button"
        onClick={(evento) => { evento.stopPropagation(); setAberto(true); }}
        aria-label={compacto ? `Escalonar chamado ${chamado.id} à liderança` : undefined}
        title="Escalonar à liderança"
        className={cn(
          "alvo-toque inline-flex items-center gap-1.5 font-semibold transition-colors",
          compacto
            ? "rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
            : "rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100",
        )}
      >
        <ArrowUpRight size={compacto ? 12 : 14} aria-hidden /> {compacto ? "Escalonar" : "Escalonar à liderança"}
      </button>
      {aberto && <DialogoDeEscalonamento chamado={chamado} aoFechar={() => setAberto(false)} />}
    </>
  );
}

export function SeloDeEscalonamento({ chamado, detalhado = false }: { chamado: ChamadoResumo; detalhado?: boolean }) {
  const { escalonamento } = chamado;
  if (!escalonamento) return null;
  if (!detalhado) {
    return (
      <span title={`Escalonado em ${formatarDataHora(escalonamento.em)}`} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
        <ArrowUpRight size={11} aria-hidden /> Escalonado
      </span>
    );
  }
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">
      <p className="flex items-center gap-1.5 font-semibold"><ArrowUpRight size={13} aria-hidden /> Escalonado à liderança</p>
      <p className="mt-1">{formatarDataHora(escalonamento.em)}{escalonamento.por ? ` · ${escalonamento.por.nome}` : ""}</p>
      {escalonamento.observacao && <p className="mt-1 text-red-700">“{escalonamento.observacao}”</p>}
    </div>
  );
}
