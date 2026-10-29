"use client";

import { PESOS, TIPOS_CHAMADO, type Peso, type TipoChamado } from "@/types/chamado";
import { PrioridadeIndicador } from "@/components/ui/StatusBadge";
import Select from "@/components/ui/Select";
import { NOME_TIPO, ROTULO_PESO, calcularScore, prioridadePorScore } from "@/utils/prioridade";
import { cn } from "@/utils/cn";

export const TAMANHO_MINIMO_DA_JUSTIFICATIVA = 10;
export const labelClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2";
export const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10";
export const cartaoClass = "rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6";

const OPCOES_DE_TIPO = TIPOS_CHAMADO.map((tipo) => ({ valor: tipo, rotulo: NOME_TIPO[tipo] }));

export function justificativaValida(texto: string) {
  return texto.trim().length >= TAMANHO_MINIMO_DA_JUSTIFICATIVA;
}

export function SeletorDeTipo({ id, rotulo, valor, aoAlterar }: { id: string; rotulo: string; valor: TipoChamado | ""; aoAlterar: (tipo: TipoChamado | "") => void }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{rotulo}</label>
      <Select id={id} value={valor} onChange={(novo) => aoAlterar(novo as TipoChamado | "")} opcoes={OPCOES_DE_TIPO} placeholder="Selecione o tipo" />
    </div>
  );
}

export function SeletorDePeso({ nome, rotulo, valor, aoAlterar }: { nome: string; rotulo: string; valor: Peso | ""; aoAlterar: (peso: Peso) => void }) {
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

export function ResultadoDoScore({ severidade, urgencia, children }: { severidade: Peso | ""; urgencia: Peso | ""; children?: React.ReactNode }) {
  if (!severidade || !urgencia) return <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Defina severidade e urgência.</div>;
  const score = calcularScore(severidade, urgencia);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm" aria-live="polite">
      <span className="text-slate-500">Resultado:</span>
      <span className="font-semibold">{severidade} + {urgencia} = score {score}</span>
      <PrioridadeIndicador prioridade={prioridadePorScore(score)} />
      {children}
    </div>
  );
}

export function Justificativa({ id, valor, aoAlterar }: { id: string; valor: string; aoAlterar: (texto: string) => void }) {
  const curta = valor.trim().length > 0 && !justificativaValida(valor);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>Justificativa *</label>
      <textarea id={id} className={`${inputClass} resize-none`} rows={2} value={valor} onChange={(evento) => aoAlterar(evento.target.value)} aria-describedby={`${id}-dica`} placeholder="Motivo da alteração" />
      <p id={`${id}-dica`} className={cn("mt-1 text-xs", curta ? "text-red-600" : "text-slate-400")}>Mínimo de {TAMANHO_MINIMO_DA_JUSTIFICATIVA} caracteres. Registrada no histórico.</p>
    </div>
  );
}
