"use client";

import { useState } from "react";
import { Hand } from "lucide-react";
import type { Chamado, Peso, TipoChamado } from "@/types/chamado";
import type { DadosConclusaoTriagem } from "@/services/api/contratos";
import { concluirTriagem, iniciarTriagem } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { PrazoDaTriagem } from "@/components/triagem/PrazoDaTriagem";
import { ResultadoDoScore, SeletorDePeso, SeletorDeTipo, cartaoClass, inputClass, labelClass } from "@/components/triagem/CamposDaTriagem";
import { NOME_TIPO } from "@/utils/prioridade";

export interface Sugestao {
  tipo: TipoChamado | null;
  severidade: Peso | null;
  urgencia: Peso | null;
}

export function sugestaoDoCliente(chamado: Chamado): Sugestao {
  return {
    tipo: chamado.motivo?.tipo ?? chamado.tipo,
    severidade: chamado.motivo?.severidade ?? null,
    urgencia: chamado.contexto?.urgencia ?? null,
  };
}

export function ResponsavelPelaAnalise({ chamado }: { chamado: Chamado }) {
  const usuario = useUsuarioAutenticado();
  const assumir = useAcaoNoChamado<void>(chamado.id, (api) => iniciarTriagem(api, chamado.id));
  const responsavel = chamado.triagem.responsavel;
  const comigo = responsavel?.id === usuario.id;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        {responsavel ? <>Responsável: <span className="font-semibold text-brand-dark">{comigo ? "você" : responsavel.nome}</span></> : "Sem responsável"}
      </p>
      {!comigo && (
        <button
          type="button"
          disabled={assumir.isPending}
          onClick={() => assumir.mutate()}
          className="alvo-toque inline-flex items-center gap-1.5 rounded-xl border border-brand-green px-4 py-2 text-sm font-semibold text-brand-green transition-all hover:bg-emerald-50 disabled:opacity-50"
        >
          <Hand size={14} aria-hidden /> {assumir.isPending ? "Assumindo…" : "Assumir análise"}
        </button>
      )}
      {assumir.isError && <div className="w-full"><AvisoDeErro erro={assumir.error} /></div>}
    </div>
  );
}

export default function ConclusaoDaTriagem({ chamado, aoConcluir }: { chamado: Chamado; aoConcluir: (aviso: string) => void }) {
  const sugestao = sugestaoDoCliente(chamado);
  const [tipo, setTipo] = useState<TipoChamado | "">(sugestao.tipo ?? "");
  const [severidade, setSeveridade] = useState<Peso | "">(sugestao.severidade ?? "");
  const [urgencia, setUrgencia] = useState<Peso | "">(sugestao.urgencia ?? "");
  const [observacao, setObservacao] = useState("");
  const conclusao = useAcaoNoChamado(chamado.id, (api, dados: DadosConclusaoTriagem) => concluirTriagem(api, chamado.id, dados));

  const confirmar = () => conclusao.mutate(
    { tipo: tipo as TipoChamado, severidade: severidade as Peso, urgencia: urgencia as Peso, observacao: observacao.trim() },
    { onSuccess: (atualizado) => aoConcluir(`Chamado classificado · ${atualizado.prioridade} · ${atualizado.departamento?.nome ?? (tipo ? NOME_TIPO[tipo] : "Central")}`) },
  );

  return (
    <div className="space-y-5">
      <section className={cartaoClass} aria-label="Prazo e responsável">
        <div className="space-y-3">
          <PrazoDaTriagem triagem={chamado.triagem} />
          <ResponsavelPelaAnalise chamado={chamado} />
        </div>
      </section>

      <section className={cartaoClass}>
        <h2 className="mb-4 font-display text-sm font-semibold text-brand-navy">Classificar chamado</h2>
        <div className="space-y-4">
          <SeletorDeTipo id="conclusao-tipo" rotulo="Tipo" valor={tipo} aoAlterar={setTipo} />
          <SeletorDePeso nome="conclusao-severidade" rotulo="Severidade (impacto)" valor={severidade} aoAlterar={setSeveridade} />
          <SeletorDePeso nome="conclusao-urgencia" rotulo="Urgência (contexto)" valor={urgencia} aoAlterar={setUrgencia} />
          <ResultadoDoScore severidade={severidade} urgencia={urgencia} />
          <div aria-live="polite">
            <p className={labelClass}>Departamento de destino</p>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-brand-dark">
              {tipo ? NOME_TIPO[tipo] : "Selecione o tipo"}
            </p>
            <p className="mt-1 text-xs text-slate-400">Fora do horário comercial, P1 e P2 operacionais seguem para o plantão da Assistência 24h.</p>
          </div>
          <div>
            <label htmlFor="conclusao-observacao" className={labelClass}>Observação</label>
            <textarea id="conclusao-observacao" className={`${inputClass} resize-none`} rows={2} maxLength={2000} value={observacao} onChange={(evento) => setObservacao(evento.target.value)} placeholder="Opcional · histórico interno" />
          </div>
          {conclusao.isError && <AvisoDeErro erro={conclusao.error} />}
          <button
            type="button"
            disabled={conclusao.isPending || !tipo || !severidade || !urgencia}
            onClick={confirmar}
            className="alvo-toque w-full rounded-xl bg-brand-green py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
          >
            {conclusao.isPending ? "Salvando…" : "Classificar e encaminhar"}
          </button>
        </div>
      </section>
    </div>
  );
}
