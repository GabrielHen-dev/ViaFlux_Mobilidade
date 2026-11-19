"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Paginacao from "@/components/ui/Paginacao";
import type { ChamadoResumo, PaginaChamados, Status } from "@/types/chamado";
import { APARENCIA_DA_PRIORIDADE, PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { SlaResumo } from "@/components/ui/SlaIndicador";
import { BotaoDeEscalonamento, SeloDeEscalonamento } from "@/components/chamados/EscalonamentoDoChamado";
import { PrazoDaTriagem } from "@/components/triagem/PrazoDaTriagem";
import { cn } from "@/utils/cn";
import { NOME_TIPO } from "@/utils/prioridade";

const STATUS_SEM_PRAZO_CORRENDO: readonly Status[] = ["Fechado", "Cancelado"];
const COLUNAS = ["Protocolo", "Cliente / Veículo", "Departamento / Tipo", "Status", "Prioridade", "Prazo", "Ações"];

function slaCritico(chamado: ChamadoResumo) {
  return chamado.sla !== null && [chamado.sla.primeiraResposta.situacao, chamado.sla.resolucao.situacao].some((situacao) => situacao === "VIOLADO" || situacao === "EM_RISCO");
}

function PrazoDoChamado({ chamado }: { chamado: ChamadoResumo }) {
  if (chamado.prioridade === null) return <PrazoDaTriagem triagem={chamado.triagem} compacto />;
  return (
    <div className="flex flex-col items-start gap-1">
      <SlaResumo sla={STATUS_SEM_PRAZO_CORRENDO.includes(chamado.status) ? null : chamado.sla} />
      <SeloDeEscalonamento chamado={chamado} />
    </div>
  );
}

interface Props {
  resultado: PaginaChamados;
  pagina: number;
  podeTriar: boolean;
  podeAtender: boolean;
  aoMudarDePagina: (pagina: number) => void;
  tamanho: number;
  aoMudarDeTamanho: (tamanho: number) => void;
}

export const TAMANHOS_DE_PAGINA = [10, 20, 50] as const;

export default function TabelaDeChamados({ resultado, pagina, podeTriar, podeAtender, aoMudarDePagina, tamanho, aoMudarDeTamanho }: Props) {
  const router = useRouter();
  return (
    <>
      <div className="overflow-x-auto">
        <table className="vf-tabela min-w-[960px]">
          <thead>
            <tr>
              {COLUNAS.map((titulo) => (
                <th key={titulo} scope="col" className="px-4 py-2.5 text-left">{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resultado.content.map((chamado) => (
              <tr key={chamado.id} className={cn("cursor-pointer transition-colors", slaCritico(chamado) && "bg-orange-50/60")} onClick={() => router.push(`/chamados/${chamado.id}`)}>
                <td className="px-4 py-2.5">
                  <div className="flex items-stretch gap-2.5">
                    <span className="vf-marcador" style={{ background: chamado.prioridade ? APARENCIA_DA_PRIORIDADE[chamado.prioridade].texto : "#C9CED6" }} aria-hidden />
                    <Link href={`/chamados/${chamado.id}`} onClick={(evento) => evento.stopPropagation()} className="self-center text-sm font-medium text-acao">#{chamado.id}</Link>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-sm font-medium text-tinta">{chamado.cliente}</div>
                  <div className="mt-0.5 text-xs text-[#94A3B8]">{[chamado.modelo, chamado.placa].filter(Boolean).join(" · ")}</div>
                </td>
                <td className="px-4 py-2.5 text-sm text-[#475569]">
                  <div>{chamado.departamento?.nome ?? (chamado.prioridade === null ? "Central" : "—")}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#94A3B8]">
                    {chamado.tipo ? `Tipo: ${NOME_TIPO[chamado.tipo]}` : "Aguardando classificação"}
                    {chamado.triagem.revisaoPendente && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">revisar</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={chamado.status} />
                  {chamado.atendimento && <div className="mt-1 text-xs text-[#94A3B8]">com {chamado.atendimento.responsavel.nome}</div>}
                </td>
                <td className="px-4 py-2.5"><PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} /></td>
                <td className="px-4 py-2.5"><PrazoDoChamado chamado={chamado} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                    {podeTriar && (chamado.prioridade === null || chamado.triagem.revisaoPendente) ? (
                      <Link href={`/chamados/${chamado.id}/triagem`} className="text-xs font-medium text-acao hover:underline">{chamado.prioridade === null ? "Classificar" : "Revisar"}</Link>
                    ) : (
                      <Link href={`/chamados/${chamado.id}`} className="text-xs font-medium text-acao hover:underline">Ver</Link>
                    )}
                    {podeAtender && <BotaoDeEscalonamento chamado={chamado} compacto />}
                  </div>
                </td>
              </tr>
            ))}
            {resultado.content.length === 0 && (
              <tr><td colSpan={COLUNAS.length} className="px-5 py-12 text-center text-sm text-[#94A3B8]">Nenhum chamado encontrado com os filtros aplicados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Paginacao
        rotulo="Paginação da lista de chamados"
        pagina={pagina}
        totalDePaginas={resultado.totalPages}
        totalDeItens={resultado.totalElements}
        tamanho={tamanho}
        opcoesDeTamanho={TAMANHOS_DE_PAGINA}
        aoMudarDePagina={aoMudarDePagina}
        aoMudarDeTamanho={aoMudarDeTamanho}
        className="border-t border-linha px-4 py-3"
      />
    </>
  );
}
