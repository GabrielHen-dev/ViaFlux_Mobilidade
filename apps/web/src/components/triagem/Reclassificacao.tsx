"use client";

import Link from "next/link";
import { useState } from "react";
import type { Chamado, Classificacao, Peso, TipoChamado } from "@/types/chamado";
import type { DadosReclassificacao } from "@/services/api/contratos";
import { reclassificarChamado } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { Justificativa, ResultadoDoScore, SeletorDePeso, SeletorDeTipo, cartaoClass, justificativaValida } from "@/components/triagem/CamposDaTriagem";

interface Props {
  chamado: Chamado;
  vigente: Classificacao;
  aoConcluir: (aviso: string) => void;
}

export default function Reclassificacao({ chamado, vigente, aoConcluir }: Props) {
  const [tipo, setTipo] = useState<TipoChamado>(vigente.tipo);
  const [severidade, setSeveridade] = useState<Peso>(vigente.severidade);
  const [urgencia, setUrgencia] = useState<Peso>(vigente.urgencia);
  const [justificativa, setJustificativa] = useState("");
  const reclassificacao = useAcaoNoChamado(chamado.id, (api, dados: DadosReclassificacao) => reclassificarChamado(api, chamado.id, dados));

  const departamentoAtual = chamado.departamento;
  const mudou = tipo !== vigente.tipo || severidade !== vigente.severidade || urgencia !== vigente.urgencia;
  const valida = mudou && justificativaValida(justificativa);

  return (
    <section className={cartaoClass}>
      <h2 className="mb-4 font-display text-sm font-semibold text-brand-navy">Reclassificar</h2>
      <div className="space-y-4">
        <SeletorDeTipo id="triagem-tipo" rotulo="Tipo" valor={tipo} aoAlterar={(novoTipo) => { if (novoTipo) setTipo(novoTipo); }} />
        <SeletorDePeso nome="severidade" rotulo="Severidade (impacto)" valor={severidade} aoAlterar={setSeveridade} />
        <SeletorDePeso nome="urgencia" rotulo="Urgência (contexto)" valor={urgencia} aoAlterar={setUrgencia} />
        <ResultadoDoScore severidade={severidade} urgencia={urgencia} />
        {departamentoAtual && tipo !== departamentoAtual.codigo && (
          <p className="text-xs text-slate-500">
            A reclassificação não muda a fila: o chamado continua em {departamentoAtual.nome}.{" "}
            <Link href={`/chamados/${chamado.id}/encaminhamento`} className="font-semibold text-brand-blue underline">Transferir o chamado</Link> se outro departamento deve assumir.
          </p>
        )}
        <Justificativa id="triagem-justificativa" valor={justificativa} aoAlterar={setJustificativa} />
        {reclassificacao.isError && <AvisoDeErro erro={reclassificacao.error} />}
        <button
          type="button"
          disabled={!valida || reclassificacao.isPending}
          onClick={() => reclassificacao.mutate({ tipo, severidade, urgencia, justificativa: justificativa.trim() }, {
            onSuccess: (atualizado) => {
              setJustificativa("");
              aoConcluir(`Chamado reclassificado: score ${atualizado.classificacao?.score} · ${atualizado.classificacao?.prioridade}.`);
            },
          })}
          className="alvo-toque w-full rounded-xl bg-brand-green py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
        >
          {reclassificacao.isPending ? "Salvando…" : "Confirmar reclassificação"}
        </button>
      </div>
    </section>
  );
}
