"use client";

import { useState } from "react";
import { CircleCheck, RotateCcw } from "lucide-react";
import type { Chamado } from "@/types/chamado";
import { confirmarResolucao, contestarResolucao, reabrirChamado } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { useAgora } from "@/hooks/useAgora";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { formatarDataHora } from "@/utils/date";

const MOTIVO_MINIMO = 10;
const cartaoClass = "rounded-2xl border p-5";
const botaoPrincipalClass = "alvo-toque inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40";
const botaoSecundarioClass = "alvo-toque inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";

function CampoDeMotivo({ id, rotulo, enviando, rotuloDoEnvio, aoEnviar, aoCancelar }: {
  id: string;
  rotulo: string;
  enviando: boolean;
  rotuloDoEnvio: string;
  aoEnviar: (motivo: string) => void;
  aoCancelar: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const curtoDemais = motivo.trim().length < MOTIVO_MINIMO;
  return (
    <div className="mt-4 space-y-3">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-[#475569]">{rotulo} *</label>
      <textarea
        id={id}
        rows={3}
        maxLength={2000}
        value={motivo}
        onChange={(evento) => setMotivo(evento.target.value)}
        className="w-full resize-none rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
        placeholder={`Conte em pelo menos ${MOTIVO_MINIMO} caracteres o que está acontecendo.`}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={enviando || curtoDemais} onClick={() => aoEnviar(motivo.trim())} className={botaoPrincipalClass}>
          {enviando ? "Enviando…" : rotuloDoEnvio}
        </button>
        <button type="button" disabled={enviando} onClick={aoCancelar} className={botaoSecundarioClass}>Cancelar</button>
      </div>
    </div>
  );
}

function ConfirmacaoDaSolucao({ chamado }: { chamado: Chamado }) {
  const [contestando, setContestando] = useState(false);
  const confirmar = useAcaoNoChamado<void>(chamado.id, (api) => confirmarResolucao(api, chamado.id));
  const contestar = useAcaoNoChamado(chamado.id, (api, motivo: string) => contestarResolucao(api, chamado.id, motivo));
  const enviando = confirmar.isPending || contestar.isPending;

  return (
    <section aria-labelledby="titulo-confirmacao" className={`${cartaoClass} border-emerald-200 bg-emerald-50`}>
      <h2 id="titulo-confirmacao" className="flex items-center gap-2 font-display text-sm font-semibold text-emerald-900">
        <CircleCheck size={16} aria-hidden /> O problema foi resolvido?
      </h2>
      {chamado.resolucaoResumo && (
        <p className="mt-2 text-sm text-emerald-950"><span className="font-semibold">Solução registrada:</span> {chamado.resolucaoResumo}</p>
      )}
      {chamado.confirmacaoAte && (
        <p className="mt-2 text-xs text-emerald-800">
          Responda até {formatarDataHora(chamado.confirmacaoAte)}. Sem resposta, o chamado é fechado automaticamente.
        </p>
      )}
      {contestando ? (
        <CampoDeMotivo
          id={`contestacao-${chamado.id}`}
          rotulo="O que ainda não foi resolvido?"
          enviando={enviando}
          rotuloDoEnvio="Enviar e voltar ao atendimento"
          aoEnviar={(motivo) => contestar.mutate(motivo)}
          aoCancelar={() => setContestando(false)}
        />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={enviando} onClick={() => confirmar.mutate()} className={botaoPrincipalClass}>
            {confirmar.isPending ? "Confirmando…" : "Confirmar solução"}
          </button>
          <button type="button" disabled={enviando} onClick={() => setContestando(true)} className={botaoSecundarioClass}>
            Ainda não resolveu
          </button>
        </div>
      )}
      {confirmar.isError && <div className="mt-3"><AvisoDeErro erro={confirmar.error} /></div>}
      {contestar.isError && <div className="mt-3"><AvisoDeErro erro={contestar.error} /></div>}
    </section>
  );
}

function ReaberturaDoChamado({ chamado, limite }: { chamado: Chamado; limite: string }) {
  const [reabrindo, setReabrindo] = useState(false);
  const reabrir = useAcaoNoChamado(chamado.id, (api, motivo: string) => reabrirChamado(api, chamado.id, motivo));

  return (
    <section aria-labelledby="titulo-reabertura" className={`${cartaoClass} border-[#E2E8F0] bg-white`}>
      <h2 id="titulo-reabertura" className="flex items-center gap-2 font-display text-sm font-semibold text-brand-navy">
        <RotateCcw size={16} aria-hidden /> O problema voltou?
      </h2>
      <p className="mt-2 text-xs text-slate-500">
        Você pode reabrir este chamado até {formatarDataHora(limite)}, mantendo o protocolo e todo o histórico.
      </p>
      {reabrindo ? (
        <CampoDeMotivo
          id={`reabertura-${chamado.id}`}
          rotulo="Por que reabrir?"
          enviando={reabrir.isPending}
          rotuloDoEnvio="Reabrir chamado"
          aoEnviar={(motivo) => reabrir.mutate(motivo)}
          aoCancelar={() => setReabrindo(false)}
        />
      ) : (
        <button type="button" onClick={() => setReabrindo(true)} className={`${botaoSecundarioClass} mt-4`}>Reabrir chamado</button>
      )}
      {reabrir.isError && <div className="mt-3"><AvisoDeErro erro={reabrir.error} /></div>}
    </section>
  );
}

export default function EncerramentoPeloSolicitante({ chamado }: { chamado: Chamado }) {
  const agora = useAgora(60_000);
  if (chamado.status === "Resolvido") return <ConfirmacaoDaSolucao chamado={chamado} />;
  if (chamado.status !== "Fechado" || !chamado.reaberturaAte) return null;
  if (new Date(chamado.reaberturaAte) > agora) return <ReaberturaDoChamado chamado={chamado} limite={chamado.reaberturaAte} />;
  return (
    <p className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-xs text-slate-500">
      O prazo para reabrir este chamado terminou. Se o problema voltou, abra um novo chamado citando o protocolo {chamado.id}.
    </p>
  );
}
