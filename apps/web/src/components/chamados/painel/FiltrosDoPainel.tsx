"use client";

import { Search } from "lucide-react";
import { CODIGOS_PRIORIDADE, STATUS_CHAMADO, TIPOS_CHAMADO, type CodigoPrioridade, type Etapa, type Status, type TipoChamado } from "@/types/chamado";
import type { FiltrosChamados, SituacaoSlaFiltravel } from "@/services/api/contratos";
import { rotuloDaSituacao } from "@/components/ui/SlaIndicador";
import Select, { type OpcaoDoSelect } from "@/components/ui/Select";
import { NOME_TIPO, ROTULO_PRIORIDADE } from "@/utils/prioridade";
import { cn } from "@/utils/cn";

export type FiltrosDoPainel = Required<Pick<FiltrosChamados, "ordenacao">> & Omit<FiltrosChamados, "page" | "size" | "ordenacao">;

const SITUACOES_DE_SLA: SituacaoSlaFiltravel[] = ["NO_PRAZO", "EM_RISCO", "VIOLADO"];
const ROTULO_DA_ETAPA: Record<Etapa, string> = { TRIAGEM: "Pendentes de análise", ATENDIMENTO: "Classificados" };
const OPCOES_DE_ETAPA: OpcaoDoSelect[] = [
  { valor: "", rotulo: "Todas as etapas" },
  ...(Object.keys(ROTULO_DA_ETAPA) as Etapa[]).map((etapa) => ({ valor: etapa, rotulo: ROTULO_DA_ETAPA[etapa] })),
];
const OPCOES_DE_STATUS: OpcaoDoSelect[] = [{ valor: "", rotulo: "Todos os status" }, ...STATUS_CHAMADO.map((status) => ({ valor: status, rotulo: status }))];
const OPCOES_DE_PRIORIDADE: OpcaoDoSelect[] = [
  { valor: "", rotulo: "Todas as prioridades" },
  ...CODIGOS_PRIORIDADE.map((codigo) => ({ valor: codigo, rotulo: `${codigo} · ${ROTULO_PRIORIDADE[codigo]}` })),
];
const OPCOES_DE_DEPARTAMENTO: OpcaoDoSelect[] = [{ valor: "", rotulo: "Todos os departamentos" }, ...TIPOS_CHAMADO.map((tipo) => ({ valor: tipo, rotulo: NOME_TIPO[tipo] }))];
const OPCOES_DE_TIPO: OpcaoDoSelect[] = [{ valor: "", rotulo: "Todos os tipos" }, ...TIPOS_CHAMADO.map((tipo) => ({ valor: tipo, rotulo: NOME_TIPO[tipo] }))];
const OPCOES_DE_SLA: OpcaoDoSelect[] = [{ valor: "", rotulo: "Qualquer SLA" }, ...SITUACOES_DE_SLA.map((situacao) => ({ valor: situacao, rotulo: rotuloDaSituacao(situacao) }))];

interface Props {
  filtros: FiltrosDoPainel;
  departamentoFixo?: TipoChamado;
  comFiltroDeEtapa: boolean;
  aoFiltrar: (alteracao: Partial<FiltrosDoPainel>) => void;
}

export function filtrosEstaoAtivos(filtros: FiltrosDoPainel, departamentoFixo?: TipoChamado) {
  return Boolean(filtros.busca || filtros.status || filtros.prioridade || filtros.sla || filtros.etapa || filtros.tipo || (filtros.departamento && filtros.departamento !== departamentoFixo));
}

export default function FiltrosDoPainel({ filtros, departamentoFixo, comFiltroDeEtapa, aoFiltrar }: Props) {
  const { ordenacao } = filtros;
  return (
    <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", comFiltroDeEtapa ? "lg:grid-cols-8" : "lg:grid-cols-7")}>
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
          <Select aria-label="Filtrar por etapa" className="alvo-toque px-3 py-2" value={filtros.etapa ?? ""} onChange={(valor) => aoFiltrar({ etapa: (valor || undefined) as Etapa | undefined })} opcoes={OPCOES_DE_ETAPA} />
        )}
        <Select aria-label="Filtrar por status" className="alvo-toque px-3 py-2" value={filtros.status ?? ""} onChange={(valor) => aoFiltrar({ status: (valor || undefined) as Status | undefined })} opcoes={OPCOES_DE_STATUS} />
        <Select aria-label="Filtrar por prioridade" className="alvo-toque px-3 py-2" value={filtros.prioridade ?? ""} onChange={(valor) => aoFiltrar({ prioridade: (valor || undefined) as CodigoPrioridade | undefined })} opcoes={OPCOES_DE_PRIORIDADE} />
        <Select aria-label="Filtrar por departamento" className="alvo-toque px-3 py-2" value={filtros.departamento ?? ""} onChange={(valor) => aoFiltrar({ departamento: (valor || undefined) as TipoChamado | undefined })} opcoes={OPCOES_DE_DEPARTAMENTO} />
        <Select aria-label="Filtrar por tipo de chamado" className="alvo-toque px-3 py-2" value={filtros.tipo ?? ""} onChange={(valor) => aoFiltrar({ tipo: (valor || undefined) as TipoChamado | undefined })} opcoes={OPCOES_DE_TIPO} />
        <Select aria-label="Filtrar por situação do SLA" className="alvo-toque px-3 py-2" value={filtros.sla ?? ""} onChange={(valor) => aoFiltrar({ sla: (valor || undefined) as SituacaoSlaFiltravel | undefined })} opcoes={OPCOES_DE_SLA} />
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
            onClick={() => aoFiltrar({ busca: undefined, status: undefined, prioridade: undefined, sla: undefined, etapa: undefined, departamento: departamentoFixo, tipo: undefined })}
            className="ml-auto font-semibold text-brand-blue hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
