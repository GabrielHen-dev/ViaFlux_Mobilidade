"use client";

import { useState } from "react";
import { CODIGOS_PRIORIDADE, type Chamado, type CodigoPrioridade } from "@/types/chamado";
import type { DadosOverride } from "@/services/api/contratos";
import { definirOverride, removerOverride } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { Justificativa, cartaoClass, justificativaValida, labelClass } from "@/components/triagem/CamposDaTriagem";
import { ROTULO_PRIORIDADE } from "@/utils/prioridade";
import { cn } from "@/utils/cn";

interface Props {
  chamado: Chamado;
  prioridadeEfetiva: CodigoPrioridade;
  aoConcluir: (aviso: string) => void;
}

export default function OverrideDePrioridade({ chamado, prioridadeEfetiva, aoConcluir }: Props) {
  const [prioridadeManual, setPrioridadeManual] = useState<CodigoPrioridade>(prioridadeEfetiva);
  const [prioridadeDeReferencia, setPrioridadeDeReferencia] = useState(prioridadeEfetiva);
  const [justificativa, setJustificativa] = useState("");
  if (prioridadeDeReferencia !== prioridadeEfetiva) {
    setPrioridadeDeReferencia(prioridadeEfetiva);
    setPrioridadeManual(prioridadeEfetiva);
  }
  const override = useAcaoNoChamado(chamado.id, (api, dados: DadosOverride) => definirOverride(api, chamado.id, dados));
  const remocao = useAcaoNoChamado<void>(chamado.id, (api) => removerOverride(api, chamado.id));
  const valido = prioridadeManual !== prioridadeEfetiva && justificativaValida(justificativa);

  return (
    <section className={cartaoClass}>
      <h2 className="mb-1 font-display text-sm font-semibold text-brand-navy">Prioridade manual</h2>
      <p className="mb-4 text-xs text-slate-500">O SLA segue a prioridade efetiva.</p>
      {chamado.override && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          <span>{chamado.override.prioridade} definida por {chamado.override.autor.nome}: “{chamado.override.justificativa}”</span>
          <button
            type="button"
            disabled={remocao.isPending}
            onClick={() => remocao.mutate(undefined, { onSuccess: () => aoConcluir("Prioridade calculada restabelecida") })}
            className="font-semibold underline"
          >
            Restaurar prioridade calculada
          </button>
        </div>
      )}
      <fieldset className="mb-4">
        <legend className={labelClass}>Prioridade efetiva</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CODIGOS_PRIORIDADE.map((codigo) => (
            <label key={codigo} className={cn("alvo-toque flex cursor-pointer items-center justify-center rounded-xl border-2 px-2 py-2 text-xs font-semibold transition", prioridadeManual === codigo ? "border-brand-blue bg-blue-50 text-blue-700" : "border-[#E2E8F0] text-slate-600")}>
              <input type="radio" name="prioridade-manual" className="sr-only" checked={prioridadeManual === codigo} onChange={() => setPrioridadeManual(codigo)} />
              {codigo} · {ROTULO_PRIORIDADE[codigo]}
            </label>
          ))}
        </div>
      </fieldset>
      <Justificativa id="override-justificativa" valor={justificativa} aoAlterar={setJustificativa} />
      {(override.isError || remocao.isError) && <div className="mt-3"><AvisoDeErro erro={override.error ?? remocao.error} /></div>}
      <button
        type="button"
        disabled={!valido || override.isPending}
        onClick={() => override.mutate({ prioridade: prioridadeManual, justificativa: justificativa.trim() }, {
          onSuccess: (atualizado) => { setJustificativa(""); aoConcluir(`Prioridade alterada para ${atualizado.prioridade}`); },
        })}
        className="alvo-toque mt-4 w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
      >
        {override.isPending ? "Salvando…" : "Aplicar prioridade"}
      </button>
    </section>
  );
}
