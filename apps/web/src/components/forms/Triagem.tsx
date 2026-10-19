"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { CODIGOS_PRIORIDADE, PESOS, TIPOS_CHAMADO, type Chamado, type CodigoPrioridade, type Peso, type TipoChamado } from "@/types/chamado";
import type { DadosOverride, DadosReclassificacao } from "@/services/api/contratos";
import { definirOverride, reclassificarChamado, removerOverride } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import ComChamado from "@/components/chamados/ComChamado";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { NOME_TIPO, ROTULO_PESO, ROTULO_PRIORIDADE, calcularScore, prioridadePorScore } from "@/utils/prioridade";
import { PERFIS_DE_TRIAGEM } from "@/utils/perfis";
import { cn } from "@/utils/cn";

const TAMANHO_MINIMO_DA_JUSTIFICATIVA = 10;
const labelClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2";
const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10";

function SeletorDePeso({ nome, rotulo, valor, aoAlterar }: { nome: string; rotulo: string; valor: Peso; aoAlterar: (peso: Peso) => void }) {
  return (
    <fieldset>
      <legend className={labelClass}>{rotulo}</legend>
      <div className="grid grid-cols-3 gap-2">
        {PESOS.map((peso) => (
          <label key={peso} className={cn("alvo-toque flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-xs font-semibold transition", valor === peso ? "border-brand-blue bg-blue-50 text-blue-700" : "border-[#E2E8F0] text-slate-600")}>
            <input type="radio" name={nome} className="sr-only" checked={valor === peso} onChange={() => aoAlterar(peso)} />
            {ROTULO_PESO[peso]} ({peso})
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Justificativa({ id, valor, aoAlterar }: { id: string; valor: string; aoAlterar: (texto: string) => void }) {
  const curta = valor.trim().length > 0 && valor.trim().length < TAMANHO_MINIMO_DA_JUSTIFICATIVA;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>Justificativa *</label>
      <textarea id={id} className={`${inputClass} resize-none`} rows={2} value={valor} onChange={(evento) => aoAlterar(evento.target.value)} aria-describedby={`${id}-dica`} placeholder="Explique o que foi identificado na triagem…" />
      <p id={`${id}-dica`} className={cn("mt-1 text-xs", curta ? "text-red-600" : "text-slate-400")}>Obrigatória, com pelo menos {TAMANHO_MINIMO_DA_JUSTIFICATIVA} caracteres. Fica registrada no histórico com autor e data/hora.</p>
    </div>
  );
}

function TriagemConteudo({ chamado }: { chamado: Chamado }) {
  const vigente = chamado.classificacao;
  const [tipo, setTipo] = useState<TipoChamado>(vigente.tipo);
  const [severidade, setSeveridade] = useState<Peso>(vigente.severidade);
  const [urgencia, setUrgencia] = useState<Peso>(vigente.urgencia);
  const [justificativaDaReclassificacao, setJustificativaDaReclassificacao] = useState("");
  const [prioridadeManual, setPrioridadeManual] = useState<CodigoPrioridade>(chamado.prioridade);
  const [justificativaDoOverride, setJustificativaDoOverride] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const reclassificacao = useAcaoNoChamado(chamado.id, (api, dados: DadosReclassificacao) => reclassificarChamado(api, chamado.id, dados));
  const override = useAcaoNoChamado(chamado.id, (api, dados: DadosOverride) => definirOverride(api, chamado.id, dados));
  const remocao = useAcaoNoChamado<void>(chamado.id, (api) => removerOverride(api, chamado.id));

  const scoreProposto = calcularScore(severidade, urgencia);
  const prioridadeProposta = prioridadePorScore(scoreProposto);
  const classificacaoMudou = tipo !== vigente.tipo || severidade !== vigente.severidade || urgencia !== vigente.urgencia;
  const reclassificacaoValida = classificacaoMudou && justificativaDaReclassificacao.trim().length >= TAMANHO_MINIMO_DA_JUSTIFICATIVA;
  const overrideValido = prioridadeManual !== chamado.prioridade && justificativaDoOverride.trim().length >= TAMANHO_MINIMO_DA_JUSTIFICATIVA;

  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link aria-label="Voltar ao chamado" href={`/chamados/${chamado.id}`} className="alvo-toque flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-all hover:bg-white">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">Triagem — #{chamado.id}</h1>
            <p className="mt-0.5 text-sm text-[#64748B]">Revise a classificação automática e, se preciso, ajuste a prioridade.</p>
          </div>
        </div>

        {aviso && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{aviso}</p>}

        <div className="space-y-5">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-brand-navy">Classificação automática vigente</h2>
              <StatusBadge status={chamado.status} />
            </div>
            {chamado.motivo && <p className="text-sm text-slate-600"><span className="font-semibold">Motivo:</span> {chamado.motivo.descricao}</p>}
            {chamado.contexto && <p className="mt-1 text-sm text-slate-600"><span className="font-semibold">Contexto:</span> {chamado.contexto.descricao}</p>}
            {chamado.descricao && <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">{chamado.descricao}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><div className="text-xs text-slate-400">Tipo</div><div className="font-semibold">{NOME_TIPO[vigente.tipo]}</div></div>
              <div><div className="text-xs text-slate-400">Severidade</div><div className="font-semibold">{ROTULO_PESO[vigente.severidade]} ({vigente.severidade})</div></div>
              <div><div className="text-xs text-slate-400">Urgência</div><div className="font-semibold">{ROTULO_PESO[vigente.urgencia]} ({vigente.urgencia})</div></div>
              <div><div className="text-xs text-slate-400">Calculada</div><PrioridadeIndicador prioridade={vigente.prioridade} score={vigente.score} /></div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">
            <h2 className="mb-4 font-display text-sm font-semibold text-brand-navy">Reclassificar</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="triagem-tipo" className={labelClass}>Tipo</label>
                <select id="triagem-tipo" className={inputClass} value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoChamado)}>
                  {TIPOS_CHAMADO.map((opcao) => <option key={opcao} value={opcao}>{NOME_TIPO[opcao]}</option>)}
                </select>
              </div>
              <SeletorDePeso nome="severidade" rotulo="Severidade (impacto)" valor={severidade} aoAlterar={setSeveridade} />
              <SeletorDePeso nome="urgencia" rotulo="Urgência (contexto)" valor={urgencia} aoAlterar={setUrgencia} />
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm" aria-live="polite">
                <span className="text-slate-500">Resultado:</span>
                <span className="font-semibold">{severidade} + {urgencia} = score {scoreProposto}</span>
                <PrioridadeIndicador prioridade={prioridadeProposta} />
                {tipo !== vigente.tipo && <span className="text-xs text-slate-500">· o encaminhamento será reavaliado</span>}
              </div>
              <Justificativa id="triagem-justificativa" valor={justificativaDaReclassificacao} aoAlterar={setJustificativaDaReclassificacao} />
              {reclassificacao.isError && <AvisoDeErro erro={reclassificacao.error} />}
              <button
                type="button"
                disabled={!reclassificacaoValida || reclassificacao.isPending}
                onClick={() => reclassificacao.mutate({ tipo, severidade, urgencia, justificativa: justificativaDaReclassificacao.trim() }, {
                  onSuccess: (atualizado) => {
                    setJustificativaDaReclassificacao("");
                    setPrioridadeManual(atualizado.prioridade);
                    setAviso(`Chamado reclassificado: score ${atualizado.classificacao.score} · ${atualizado.classificacao.prioridade}.`);
                  },
                })}
                className="alvo-toque w-full rounded-xl bg-brand-green py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
              >
                {reclassificacao.isPending ? "Salvando…" : "Confirmar reclassificação"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">
            <h2 className="mb-1 font-display text-sm font-semibold text-brand-navy">Override manual de prioridade</h2>
            <p className="mb-4 text-xs text-slate-500">O score calculado continua registrado. O SLA passa a seguir a prioridade efetiva.</p>
            {chamado.override && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                <span>Prioridade efetiva {chamado.override.prioridade} definida por {chamado.override.autor.nome}: “{chamado.override.justificativa}”</span>
                <button type="button" disabled={remocao.isPending} onClick={() => remocao.mutate(undefined, { onSuccess: (atualizado) => { setPrioridadeManual(atualizado.prioridade); setAviso("Override removido: vale a prioridade calculada."); } })} className="font-semibold underline">
                  Voltar à prioridade calculada
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
            <Justificativa id="override-justificativa" valor={justificativaDoOverride} aoAlterar={setJustificativaDoOverride} />
            {(override.isError || remocao.isError) && <div className="mt-3"><AvisoDeErro erro={override.error ?? remocao.error} /></div>}
            <button
              type="button"
              disabled={!overrideValido || override.isPending}
              onClick={() => override.mutate({ prioridade: prioridadeManual, justificativa: justificativaDoOverride.trim() }, {
                onSuccess: (atualizado) => { setJustificativaDoOverride(""); setAviso(`Prioridade efetiva alterada para ${atualizado.prioridade}.`); },
              })}
              className="alvo-toque mt-4 w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
            >
              {override.isPending ? "Salvando…" : "Aplicar override"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function Triagem({ id }: { id: string }) {
  return (
    <PerfilRequerido perfis={PERFIS_DE_TRIAGEM}>
      <ComChamado id={id}>{(chamado) => <TriagemConteudo key={chamado.id} chamado={chamado} />}</ComChamado>
    </PerfilRequerido>
  );
}
