"use client";

import { useState } from "react";
import { CircleCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Chamado } from "@/types/chamado";
import { confirmarResolucao, contestarResolucao, reabrirChamado } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { useAgora } from "@/hooks/useAgora";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { formatarDataHora } from "@/utils/date";

const MOTIVO_MINIMO = 10;
const cartaoClass = "rounded-2xl border p-5";
const botaoPrincipalClass = "alvo-toque inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40";
const botaoSecundarioClass = "alvo-toque inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";

function avisarResultado(acao: Promise<unknown>, sucesso: { titulo: string; descricao?: string }, falha: string) {
  acao.then(
    () => toast.success(sucesso.titulo, { description: sucesso.descricao }),
    (erro: unknown) => toast.error(falha, { description: mensagemDeErro(erro) }),
  );
}

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
        placeholder={`Mínimo de ${MOTIVO_MINIMO} caracteres.`}
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
          Prazo para resposta: {formatarDataHora(chamado.confirmacaoAte)}. Sem resposta, o chamado será fechado automaticamente.
        </p>
      )}
      {contestando ? (
        <CampoDeMotivo
          id={`contestacao-${chamado.id}`}
          rotulo="Motivo da contestação"
          enviando={enviando}
          rotuloDoEnvio="Enviar contestação"
          aoEnviar={(motivo) => avisarResultado(contestar.mutateAsync(motivo), { titulo: "Solução contestada", descricao: "O chamado retornou para atendimento." }, "Não foi possível enviar a contestação")}
          aoCancelar={() => setContestando(false)}
        />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={enviando} onClick={() => avisarResultado(confirmar.mutateAsync(), { titulo: "Solução confirmada" }, "Não foi possível confirmar a solução")} className={botaoPrincipalClass}>
            {confirmar.isPending ? "Confirmando…" : "Confirmar solução"}
          </button>
          <button type="button" disabled={enviando} onClick={() => setContestando(true)} className={botaoSecundarioClass}>
            Contestar solução
          </button>
        </div>
      )}
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
        Reabertura disponível até {formatarDataHora(limite)}.
      </p>
      {reabrindo ? (
        <CampoDeMotivo
          id={`reabertura-${chamado.id}`}
          rotulo="Motivo da reabertura"
          enviando={reabrir.isPending}
          rotuloDoEnvio="Reabrir chamado"
          aoEnviar={(motivo) => avisarResultado(reabrir.mutateAsync(motivo), { titulo: "Chamado reaberto" }, "Não foi possível reabrir o chamado")}
          aoCancelar={() => setReabrindo(false)}
        />
      ) : (
        <button type="button" onClick={() => setReabrindo(true)} className={`${botaoSecundarioClass} mt-4`}>Reabrir chamado</button>
      )}
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
      Prazo de reabertura encerrado. Para uma nova ocorrência, abra outro chamado informando o protocolo {chamado.id}.
    </p>
  );
}
