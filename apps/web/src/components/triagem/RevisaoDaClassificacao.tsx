"use client";

import { CircleCheck, ScanSearch } from "lucide-react";
import type { Chamado, Classificacao } from "@/types/chamado";
import { confirmarClassificacao } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { PrioridadeIndicador } from "@/components/ui/StatusBadge";
import { ResponsavelPelaAnalise } from "@/components/triagem/ConclusaoDaTriagem";
import { NOME_TIPO, ROTULO_PESO } from "@/utils/prioridade";

export default function RevisaoDaClassificacao({ chamado, vigente, aoConcluir }: { chamado: Chamado; vigente: Classificacao; aoConcluir: (aviso: string) => void }) {
  const confirmacao = useAcaoNoChamado<void>(chamado.id, (api) => confirmarClassificacao(api, chamado.id));

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-5 md:p-6" aria-labelledby="titulo-revisao">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ScanSearch size={18} aria-hidden /></span>
        <div>
          <h2 id="titulo-revisao" className="font-display text-sm font-semibold text-brand-navy">Revisão da classificação automática</h2>
          <p className="mt-0.5 text-xs text-slate-500">Gerada a partir do relato do solicitante.</p>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-4">
        <div><div className="text-xs text-slate-400">Tipo</div><div className="font-semibold">{NOME_TIPO[vigente.tipo]}</div></div>
        <div><div className="text-xs text-slate-400">Severidade</div><div className="font-semibold">{ROTULO_PESO[vigente.severidade]}</div></div>
        <div><div className="text-xs text-slate-400">Urgência</div><div className="font-semibold">{ROTULO_PESO[vigente.urgencia]}</div></div>
        <div><div className="text-xs text-slate-400">Prioridade</div><PrioridadeIndicador prioridade={vigente.prioridade} score={vigente.score} /></div>
      </div>
      <div className="space-y-3">
        <ResponsavelPelaAnalise chamado={chamado} />
        {confirmacao.isError && <AvisoDeErro erro={confirmacao.error} />}
        <button
          type="button"
          disabled={confirmacao.isPending}
          onClick={() => confirmacao.mutate(undefined, { onSuccess: () => aoConcluir("Classificação confirmada") })}
          className="alvo-toque inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-green py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
        >
          <CircleCheck size={15} aria-hidden /> {confirmacao.isPending ? "Confirmando…" : "Confirmar classificação"}
        </button>
      </div>
    </section>
  );
}
