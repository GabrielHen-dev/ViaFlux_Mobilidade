"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Ban, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import type { Chamado } from "@/types/chamado";
import { cancelarChamado, reabrirChamadoCancelado } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { cn } from "@/utils/cn";
import { formatarDataHora } from "@/utils/date";

const MOTIVO_MINIMO = 10;
const LIMITE_DO_MOTIVO = 2000;
const STATUS_QUE_NAO_PODEM_SER_CANCELADOS = ["Resolvido", "Fechado", "Cancelado"];

export function podeCancelar(chamado: Chamado) {
  return !STATUS_QUE_NAO_PODEM_SER_CANCELADOS.includes(chamado.status);
}

interface DialogoComMotivoProps {
  titulo: string;
  subtitulo: string;
  explicacao: ReactNode;
  rotuloDoMotivo: string;
  placeholder: string;
  rotuloDaConfirmacao: string;
  rotuloEnquantoEnvia: string;
  perigoso?: boolean;
  enviando: boolean;
  aoConfirmar: (motivo: string) => void;
  aoFechar: () => void;
}

function DialogoComMotivo({
  titulo, subtitulo, explicacao, rotuloDoMotivo, placeholder, rotuloDaConfirmacao, rotuloEnquantoEnvia, perigoso = false, enviando, aoConfirmar, aoFechar,
}: DialogoComMotivoProps) {
  const idDoTitulo = useId();
  const campo = useRef<HTMLTextAreaElement>(null);
  const [motivo, setMotivo] = useState("");
  const curtoDemais = motivo.trim().length < MOTIVO_MINIMO;

  useEffect(() => {
    campo.current?.focus();
    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !enviando) aoFechar();
    }
    document.addEventListener("keydown", aoPressionar);
    return () => document.removeEventListener("keydown", aoPressionar);
  }, [aoFechar, enviando]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/40 p-4 backdrop-blur-[2px] sm:items-center" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !enviando) aoFechar(); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={idDoTitulo} aria-describedby={`${idDoTitulo}-explicacao`} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", perigoso ? "bg-red-50 text-red-600" : "bg-blue-50 text-brand-blue")}>
              {perigoso ? <Ban size={20} aria-hidden /> : <RotateCcw size={20} aria-hidden />}
            </span>
            <div>
              <h2 id={idDoTitulo} className="font-display text-base font-bold text-brand-navy">{titulo}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>
            </div>
          </div>
          <button type="button" onClick={aoFechar} disabled={enviando} aria-label="Fechar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div id={`${idDoTitulo}-explicacao`} className="mb-4 text-sm text-slate-600">{explicacao}</div>
        <label htmlFor={`${idDoTitulo}-motivo`} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#475569]">{rotuloDoMotivo} *</label>
        <textarea
          ref={campo}
          id={`${idDoTitulo}-motivo`}
          rows={4}
          maxLength={LIMITE_DO_MOTIVO}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
        />
        <p className="mt-1 text-xs text-slate-400">Mínimo de {MOTIVO_MINIMO} caracteres.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={aoFechar} disabled={enviando} className="alvo-toque rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Voltar</button>
          <button
            type="button"
            disabled={enviando || curtoDemais}
            onClick={() => aoConfirmar(motivo.trim())}
            className={cn(
              "alvo-toque inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40",
              perigoso ? "bg-red-600 hover:bg-red-700" : "bg-brand-blue hover:opacity-90",
            )}
          >
            {enviando ? rotuloEnquantoEnvia : rotuloDaConfirmacao}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function BotaoDeCancelamento({ chamado }: { chamado: Chamado }) {
  const [aberto, setAberto] = useState(false);
  const cancelamento = useAcaoNoChamado(chamado.id, (api, motivo: string) => cancelarChamado(api, chamado.id, motivo));
  if (!podeCancelar(chamado)) return null;

  function confirmar(motivo: string) {
    cancelamento.mutate(motivo, {
      onSuccess: () => {
        toast.success("Chamado cancelado", { description: `O chamado #${chamado.id} continua no histórico e pode ser reaberto.` });
        setAberto(false);
      },
      onError: (erro) => toast.error("Não foi possível cancelar o chamado", { description: mensagemDeErro(erro) }),
    });
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="alvo-toque inline-flex items-center gap-1.5 rounded-xl border border-[#FECACA] px-3 py-2 text-sm font-semibold text-[#EF4444] transition-all hover:bg-[#FEF2F2]">
        <Ban size={14} aria-hidden /> Cancelar chamado
      </button>
      {aberto && (
        <DialogoComMotivo
          titulo="Cancelar este chamado?"
          subtitulo={`Chamado #${chamado.id} · ${chamado.cliente}`}
          explicacao={<>O chamado fica com o status <strong>Cancelado</strong>, continua no histórico e pode ser reaberto depois. O solicitante será avisado.</>}
          rotuloDoMotivo="Motivo do cancelamento"
          placeholder="Por que este chamado está sendo cancelado?"
          rotuloDaConfirmacao="Sim, cancelar chamado"
          rotuloEnquantoEnvia="Cancelando…"
          perigoso
          enviando={cancelamento.isPending}
          aoConfirmar={confirmar}
          aoFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}

export function AvisoDeCancelamento({ chamado, podeReabrir, visaoDeCliente = false, children }: {
  chamado: Chamado;
  podeReabrir: boolean;
  visaoDeCliente?: boolean;
  children?: ReactNode;
}) {
  const [reabrindo, setReabrindo] = useState(false);
  const reabertura = useAcaoNoChamado(chamado.id, (api, motivo: string) => reabrirChamadoCancelado(api, chamado.id, motivo));
  const { cancelamento } = chamado;
  if (chamado.status !== "Cancelado") return null;

  function confirmar(motivo: string) {
    reabertura.mutate(motivo, {
      onSuccess: (atualizado) => {
        toast.success("Chamado reaberto", { description: `O chamado #${chamado.id} voltou para ${atualizado.status}.` });
        setReabrindo(false);
      },
      onError: (erro) => toast.error("Não foi possível reabrir o chamado", { description: mensagemDeErro(erro) }),
    });
  }

  return (
    <section role="status" aria-label="Chamado cancelado" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-red-600"><Ban size={18} aria-hidden /></span>
        <div className="min-w-0 flex-1 text-sm text-red-900">
          <p className="font-semibold">Chamado cancelado</p>
          {cancelamento && (
            <>
              <p className="mt-0.5 text-red-800">{formatarDataHora(cancelamento.em)}{cancelamento.por ? ` · ${cancelamento.por.nome}` : ""}</p>
              <p className="mt-1 break-words text-red-800">“{cancelamento.motivo}”</p>
            </>
          )}
          <p className="mt-2 text-xs text-red-700">
            {visaoDeCliente
              ? "Se o cancelamento foi indevido, reabra o chamado contando o que aconteceu."
              : "Se o cancelamento foi indevido, reabra o chamado ou peça a revisão da liderança."}
          </p>
        </div>
        {(podeReabrir || children) && (
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            {podeReabrir && (
              <button type="button" onClick={() => setReabrindo(true)} className="alvo-toque inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                <RotateCcw size={14} aria-hidden /> Reabrir chamado
              </button>
            )}
            {children}
          </div>
        )}
      </div>
      {reabrindo && (
        <DialogoComMotivo
          titulo="Reabrir este chamado?"
          subtitulo={`Chamado #${chamado.id}`}
          explicacao="O chamado volta para a fila do atendimento, com o mesmo protocolo e histórico. O tempo em que ficou cancelado não conta no prazo de resolução."
          rotuloDoMotivo="Motivo da reabertura"
          placeholder="Por que o cancelamento foi indevido?"
          rotuloDaConfirmacao="Reabrir chamado"
          rotuloEnquantoEnvia="Reabrindo…"
          enviando={reabertura.isPending}
          aoConfirmar={confirmar}
          aoFechar={() => setReabrindo(false)}
        />
      )}
    </section>
  );
}
