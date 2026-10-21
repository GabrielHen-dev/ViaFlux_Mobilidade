"use client";

import { Search } from "lucide-react";
import { CODIGOS_PRIORIDADE, STATUS_CHAMADO, TIPOS_CHAMADO, type CodigoPrioridade, type Etapa, type Status, type TipoChamado } from "@/types/chamado";
import type { FiltrosChamados, SituacaoSlaFiltravel } from "@/services/api/contratos";
import { rotuloDaSituacao } from "@/components/ui/SlaIndicador";
import { NOME_TIPO, ROTULO_PRIORIDADE } from "@/utils/prioridade";
import { cn } from "@/utils/cn";

export type FiltrosDoPainel = Required<Pick<FiltrosChamados, "ordenacao">> & Omit<FiltrosChamados, "page" | "size" | "ordenacao">;

const SITUACOES_DE_SLA: SituacaoSlaFiltravel[] = ["NO_PRAZO", "EM_RISCO", "VIOLADO"];
const ROTULO_DA_ETAPA: Record<Etapa, string> = { TRIAGEM: "Aguardando triagem", ATENDIMENTO: "Já triados" };
const selectClass = "alvo-toque rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-brand-dark outline-none focus:border-brand-blue";

interface Props {
  filtros: FiltrosDoPainel;
  departamentoFixo?: TipoChamado;
  comFiltroDeEtapa: boolean;
  aoFiltrar: (alteracao: Partial<FiltrosDoPainel>) => void;
}

export function filtrosEstaoAtivos(filtros: FiltrosDoPainel, departamentoFixo?: TipoChamado) {
  return Boolean(filtros.busca || filtros.status || filtros.prioridade || filtros.sla || filtros.etapa || (filtros.departamento && filtros.departamento !== departamentoFixo));
}

export default function FiltrosDoPainel({ filtros, departamentoFixo, comFiltroDeEtapa, aoFiltrar }: Props) {
  const { ordenacao } = filtros;
  return (
    <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", comFiltroDeEtapa ? "lg:grid-cols-7" : "lg:grid-cols-6")}>
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} aria-hidden />
          <input
            type="search"
            aria-label="Buscar chamados"
            placeholder="Buscar por protocolo, cliente ou veículo…"
            value={filtros.busca ?? ""}
            onChange={(evento) => aoFiltrar({ busca: evento.target.value || undefined })}
            className="alvo-toque w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-brand-blue"
          />
        </div>
        {comFiltroDeEtapa && (
          <select aria-label="Filtrar por etapa" className={selectClass} value={filtros.etapa ?? ""} onChange={(evento) => aoFiltrar({ etapa: (evento.target.value || undefined) as Etapa | undefined })}>
            <option value="">Todas as etapas</option>
            {(Object.keys(ROTULO_DA_ETAPA) as Etapa[]).map((etapa) => <option key={etapa} value={etapa}>{ROTULO_DA_ETAPA[etapa]}</option>)}
          </select>
        )}
        <select aria-label="Filtrar por status" className={selectClass} value={filtros.status ?? ""} onChange={(evento) => aoFiltrar({ status: (evento.target.value || undefined) as Status | undefined })}>
          <option value="">Todos os status</option>
          {STATUS_CHAMADO.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select aria-label="Filtrar por prioridade" className={selectClass} value={filtros.prioridade ?? ""} onChange={(evento) => aoFiltrar({ prioridade: (evento.target.value || undefined) as CodigoPrioridade | undefined })}>
          <option value="">Todas as prioridades</option>
          {CODIGOS_PRIORIDADE.map((codigo) => <option key={codigo} value={codigo}>{codigo} · {ROTULO_PRIORIDADE[codigo]}</option>)}
        </select>
        <select aria-label="Filtrar por departamento" className={selectClass} value={filtros.departamento ?? ""} onChange={(evento) => aoFiltrar({ departamento: (evento.target.value || undefined) as TipoChamado | undefined })}>
          <option value="">Todos os departamentos</option>
          {TIPOS_CHAMADO.map((tipo) => <option key={tipo} value={tipo}>{NOME_TIPO[tipo]}</option>)}
        </select>
        <select aria-label="Filtrar por situação do SLA" className={selectClass} value={filtros.sla ?? ""} onChange={(evento) => aoFiltrar({ sla: (evento.target.value || undefined) as SituacaoSlaFiltravel | undefined })}>
          <option value="">Qualquer SLA</option>
          {SITUACOES_DE_SLA.map((situacao) => <option key={situacao} value={situacao}>{rotuloDaSituacao(situacao)}</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="font-medium text-slate-500">Ordenar:</span>
        {([["fila", "Fila (prioridade, score e antiguidade)"], ["recentes", "Mais recentes"]] as const).map(([valor, rotulo]) => (
          <button key={valor} type="button" aria-pressed={ordenacao === valor} onClick={() => aoFiltrar({ ordenacao: valor })} className={cn("alvo-toque rounded-lg px-3 py-1.5 font-semibold", ordenacao === valor ? "bg-brand-navy text-white" : "bg-slate-100 text-slate-600")}>
            {rotulo}
          </button>
        ))}
        {filtrosEstaoAtivos(filtros, departamentoFixo) && (
          <button
            type="button"
            onClick={() => aoFiltrar({ busca: undefined, status: undefined, prioridade: undefined, sla: undefined, etapa: undefined, departamento: departamentoFixo })}
            className="ml-auto font-semibold text-brand-blue hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
