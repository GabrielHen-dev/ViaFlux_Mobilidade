"use client";

import { useState } from "react";
import { Hand, Lightbulb } from "lucide-react";
import type { Chamado, Peso, TipoChamado } from "@/types/chamado";
import type { DadosConclusaoTriagem } from "@/services/api/contratos";
import { concluirTriagem, iniciarTriagem } from "@/services/api/chamados";
import { useAcaoNoChamado, useDepartamentos } from "@/hooks/consultas";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { PrazoDaTriagem } from "@/components/triagem/PrazoDaTriagem";
import { ResultadoDoScore, SeletorDePeso, SeletorDeTipo, cartaoClass, inputClass, labelClass } from "@/components/triagem/CamposDaTriagem";
import { NOME_TIPO, ROTULO_PESO } from "@/utils/prioridade";

const PELA_REGRA_DE_PLANTAO = "";

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

function ResponsavelDaTriagem({ chamado }: { chamado: Chamado }) {
  const usuario = useUsuarioAutenticado();
  const assumir = useAcaoNoChamado<void>(chamado.id, (api) => iniciarTriagem(api, chamado.id));
  const responsavel = chamado.triagem.responsavel;
  const comigo = responsavel?.id === usuario.id;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        {responsavel ? <>Em triagem com <span className="font-semibold text-brand-dark">{comigo ? "você" : responsavel.nome}</span></> : "Ninguém assumiu esta triagem ainda."}
      </p>
      {!comigo && (
        <button
          type="button"
          disabled={assumir.isPending}
          onClick={() => assumir.mutate()}
          className="alvo-toque inline-flex items-center gap-1.5 rounded-xl border border-brand-green px-4 py-2 text-sm font-semibold text-brand-green transition-all hover:bg-emerald-50 disabled:opacity-50"
        >
          <Hand size={14} aria-hidden /> {assumir.isPending ? "Assumindo…" : "Assumir triagem"}
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
  const [departamento, setDepartamento] = useState<TipoChamado | typeof PELA_REGRA_DE_PLANTAO>(PELA_REGRA_DE_PLANTAO);
  const [observacao, setObservacao] = useState("");
  const departamentos = useDepartamentos();
  const conclusao = useAcaoNoChamado(chamado.id, (api, dados: DadosConclusaoTriagem) => concluirTriagem(api, chamado.id, dados));

  const confirmar = () => conclusao.mutate(
    { tipo: tipo as TipoChamado, severidade: severidade as Peso, urgencia: urgencia as Peso, departamento: departamento || null, observacao: observacao.trim() },
    { onSuccess: (atualizado) => aoConcluir(`Triagem concluída: ${atualizado.prioridade} · encaminhado para ${atualizado.departamento?.nome ?? (tipo ? NOME_TIPO[tipo] : "Central")}.`) },
  );

  return (
    <div className="space-y-5">
      <section className={cartaoClass} aria-label="Prazo e responsável da triagem">
        <div className="space-y-3">
          <PrazoDaTriagem triagem={chamado.triagem} />
          <ResponsavelDaTriagem chamado={chamado} />
        </div>
      </section>

      <section className={cartaoClass}>
        <h2 className="mb-1 font-display text-sm font-semibold text-brand-navy">Concluir triagem</h2>
        <p className="mb-4 flex items-start gap-1.5 text-xs text-slate-500">
          <Lightbulb size={14} className="mt-0.5 flex-shrink-0 text-amber-500" aria-hidden />
          <span>
            {sugestao.tipo ? <>Os campos vêm com uma <strong>sugestão</strong> baseada no catálogo ({NOME_TIPO[sugestao.tipo]}, severidade {ROTULO_PESO[sugestao.severidade!].toLowerCase()}, urgência {ROTULO_PESO[sugestao.urgencia!].toLowerCase()}). Nada é aplicado sem a sua confirmação.</> : <>Este é um chamado de exceção. Defina tipo, severidade e urgência após revisar o relato; não há valores sugeridos.</>}
          </span>
        </p>
        <div className="space-y-4">
          <SeletorDeTipo id="conclusao-tipo" rotulo="Tipo" valor={tipo} aoAlterar={setTipo} />
          <SeletorDePeso nome="conclusao-severidade" rotulo="Severidade (impacto)" valor={severidade} aoAlterar={setSeveridade} />
          <SeletorDePeso nome="conclusao-urgencia" rotulo="Urgência (contexto)" valor={urgencia} aoAlterar={setUrgencia} />
          <ResultadoDoScore severidade={severidade} urgencia={urgencia} />
          <div>
            <label htmlFor="conclusao-departamento" className={labelClass}>Departamento de destino</label>
            <select id="conclusao-departamento" className={inputClass} value={departamento} onChange={(evento) => setDepartamento(evento.target.value as TipoChamado)} aria-describedby="conclusao-departamento-dica">
              <option value={PELA_REGRA_DE_PLANTAO}>Automático: {tipo ? NOME_TIPO[tipo] : "selecione o tipo"}</option>
              {(departamentos.data ?? []).map((opcao) => <option key={opcao.codigo} value={opcao.codigo}>{opcao.nome}</option>)}
            </select>
            <p id="conclusao-departamento-dica" className="mt-1 text-xs text-slate-400">No automático, um P1 operacional fora do horário comercial vai para a Assistência 24h (plantão).</p>
          </div>
          <div>
            <label htmlFor="conclusao-observacao" className={labelClass}>Observação da triagem</label>
            <textarea id="conclusao-observacao" className={`${inputClass} resize-none`} rows={2} maxLength={2000} value={observacao} onChange={(evento) => setObservacao(evento.target.value)} placeholder="Opcional. Fica no histórico interno do chamado." />
          </div>
          {conclusao.isError && <AvisoDeErro erro={conclusao.error} />}
          <button
            type="button"
            disabled={conclusao.isPending || !tipo || !severidade || !urgencia}
            onClick={confirmar}
            className="alvo-toque w-full rounded-xl bg-brand-green py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
          >
            {conclusao.isPending ? "Concluindo…" : "Concluir triagem e encaminhar"}
          </button>
        </div>
      </section>
    </div>
  );
}
