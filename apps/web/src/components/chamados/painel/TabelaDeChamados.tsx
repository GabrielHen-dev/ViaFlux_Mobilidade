"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash } from "lucide-react";
import type { ChamadoResumo, PaginaChamados } from "@/types/chamado";
import { moverParaLixeira } from "@/services/api/chamados";
import { useApi } from "@/store/AuthContext";
import { invalidarListas } from "@/hooks/consultas";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { SlaResumo } from "@/components/ui/SlaIndicador";
import { PrazoDaTriagem } from "@/components/triagem/PrazoDaTriagem";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { cn } from "@/utils/cn";
import { NOME_TIPO } from "@/utils/prioridade";

const COLUNAS = ["Protocolo", "Cliente / Veículo", "Departamento / Tipo", "Status", "Prioridade", "Prazo", "Ações"];

function slaCritico(chamado: ChamadoResumo) {
  return chamado.sla !== null && [chamado.sla.primeiraResposta.situacao, chamado.sla.resolucao.situacao].some((situacao) => situacao === "VIOLADO" || situacao === "EM_RISCO");
}

function PrazoDoChamado({ chamado }: { chamado: ChamadoResumo }) {
  if (chamado.prioridade === null) return <PrazoDaTriagem triagem={chamado.triagem} compacto />;
  return <SlaResumo sla={chamado.status === "Fechado" ? null : chamado.sla} />;
}

function ExclusaoDaLinha({ chamado }: { chamado: ChamadoResumo }) {
  const api = useApi();
  const clienteDeConsultas = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const exclusao = useMutation({
    mutationFn: () => moverParaLixeira(api, chamado.id),
    onSuccess: () => { setConfirmando(false); void invalidarListas(clienteDeConsultas); },
  });
  if (exclusao.isError) return <AvisoDeErro erro={exclusao.error} />;
  if (confirmando) {
    return (
      <span className="flex items-center gap-1">
        <button type="button" disabled={exclusao.isPending} onClick={() => exclusao.mutate()} className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Confirmar</button>
        <button type="button" aria-label="Cancelar exclusão" onClick={() => setConfirmando(false)} className="text-xs text-[#94A3B8] hover:text-[#64748B]">✕</button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirmando(true)} title="Mover para a lixeira" aria-label={`Excluir chamado ${chamado.id}`} className="text-[#CBD5E1] transition-colors hover:text-[#EF4444]">
      <Trash size={14} />
    </button>
  );
}

interface Props {
  resultado: PaginaChamados;
  pagina: number;
  podeExcluir: boolean;
  podeTriar: boolean;
  aoMudarDePagina: (pagina: number) => void;
}

export default function TabelaDeChamados({ resultado, pagina, podeExcluir, podeTriar, aoMudarDePagina }: Props) {
  const router = useRouter();
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="bg-brand-light">
              {COLUNAS.map((titulo) => (
                <th key={titulo} scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {resultado.content.map((chamado) => (
              <tr key={chamado.id} className={cn("cursor-pointer transition-colors hover:bg-brand-light", slaCritico(chamado) && "bg-orange-50/40")} onClick={() => router.push(`/chamados/${chamado.id}`)}>
                <td className="px-5 py-4">
                  <Link href={`/chamados/${chamado.id}`} onClick={(evento) => evento.stopPropagation()} className="text-sm font-bold text-brand-blue">#{chamado.id}</Link>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm font-semibold text-brand-dark">{chamado.cliente}</div>
                  <div className="mt-0.5 text-xs text-[#94A3B8]">{[chamado.modelo, chamado.placa].filter(Boolean).join(" · ")}</div>
                </td>
                <td className="px-5 py-4 text-sm text-[#475569]">
                  <div>{chamado.departamento?.nome ?? (chamado.prioridade === null ? "Exceção · Central" : "—")}</div>
                  <div className="mt-0.5 text-xs text-[#94A3B8]">{chamado.tipo ? `Tipo: ${NOME_TIPO[chamado.tipo]}` : "A classificar — revisão da Central"}</div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={chamado.status} />
                  {chamado.atendimento && <div className="mt-1 text-xs text-[#94A3B8]">com {chamado.atendimento.responsavel.nome}</div>}
                </td>
                <td className="px-5 py-4"><PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} /></td>
                <td className="px-5 py-4"><PrazoDoChamado chamado={chamado} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                    {podeTriar && chamado.prioridade === null ? (
                      <Link href={`/chamados/${chamado.id}/triagem`} className="text-xs font-semibold text-brand-green hover:underline">Triar</Link>
                    ) : (
                      <Link href={`/chamados/${chamado.id}`} className="text-xs font-semibold text-brand-blue hover:underline">Ver</Link>
                    )}
                    {podeExcluir && <ExclusaoDaLinha chamado={chamado} />}
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
      {resultado.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-[#F1F5F9] px-5 py-3 text-xs text-slate-500">
          <button type="button" aria-label="Página anterior" disabled={pagina === 0} onClick={() => aoMudarDePagina(pagina - 1)} className="alvo-toque flex items-center justify-center rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"><ChevronLeft size={14} /></button>
          Página {pagina + 1} de {resultado.totalPages}
          <button type="button" aria-label="Próxima página" disabled={pagina + 1 >= resultado.totalPages} onClick={() => aoMudarDePagina(pagina + 1)} className="alvo-toque flex items-center justify-center rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      )}
    </>
  );
}
