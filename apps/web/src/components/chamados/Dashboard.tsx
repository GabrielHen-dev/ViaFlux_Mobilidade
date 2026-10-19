"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw, Search, Siren, Trash } from "lucide-react";
import { CODIGOS_PRIORIDADE, STATUS_CHAMADO, TIPOS_CHAMADO, type CodigoPrioridade, type Status, type TipoChamado } from "@/types/chamado";
import type { FiltrosChamados, SituacaoSlaFiltravel } from "@/services/api/contratos";
import { moverParaLixeira } from "@/services/api/chamados";
import { useApi, useUsuarioAutenticado } from "@/store/AuthContext";
import { INTERVALO_DO_PAINEL_MS, invalidarListas, useListaDeChamados, useResumoDeChamados } from "@/hooks/consultas";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { SlaResumo, rotuloDaSituacao } from "@/components/ui/SlaIndicador";
import { AvisoDeErro, Carregando, FalhaAoCarregar } from "@/components/feedback/EstadoDaConsulta";
import { NOME_TIPO, ROTULO_PRIORIDADE } from "@/utils/prioridade";
import { formatarHora } from "@/utils/date";
import { useAgora } from "@/hooks/useAgora";
import { PERFIS_COM_VISAO_GLOBAL, PERFIS_QUE_ABREM_CHAMADO, usuarioTemPerfil } from "@/utils/perfis";
import { cn } from "@/utils/cn";

const TAMANHO_DA_PAGINA = 20;
const SITUACOES_DE_SLA: SituacaoSlaFiltravel[] = ["NO_PRAZO", "EM_RISCO", "VIOLADO"];
const selectClass = "alvo-toque rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-brand-dark outline-none focus:border-brand-blue";

type FiltrosDoPainel = Required<Pick<FiltrosChamados, "ordenacao">> & Omit<FiltrosChamados, "page" | "size" | "ordenacao">;

function AtualizadoHa({ instante }: { instante: number }) {
  const agora = useAgora();
  const segundos = Math.max(0, Math.floor((agora.getTime() - instante) / 1000));
  return (
    <time dateTime={new Date(instante).toISOString()} title={`Atualizado às ${formatarHora(new Date(instante).toISOString())}`} className="tabular-nums" suppressHydrationWarning>
      {segundos < 2 ? "Atualizado agora" : `Atualizado há ${segundos} s`}
    </time>
  );
}

export default function Dashboard() {
  const usuario = useUsuarioAutenticado();
  const api = useApi();
  const router = useRouter();
  const clienteDeConsultas = useQueryClient();
  const visaoGlobal = usuarioTemPerfil(usuario, PERFIS_COM_VISAO_GLOBAL);
  const podeAbrir = usuarioTemPerfil(usuario, PERFIS_QUE_ABREM_CHAMADO);
  const departamentoDoUsuario = visaoGlobal ? undefined : (usuario.departamentos?.[0]?.codigo as TipoChamado | undefined);

  const [filtros, setFiltros] = useState<FiltrosDoPainel>({ ordenacao: "fila", departamento: departamentoDoUsuario });
  const [pagina, setPagina] = useState(0);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);

  const { ordenacao, ...filtrosDoResumo } = filtros;
  const lista = useListaDeChamados({ ...filtros, page: pagina, size: TAMANHO_DA_PAGINA });
  const resumo = useResumoDeChamados(filtrosDoResumo);
  const exclusao = useMutation({
    mutationFn: (codigo: string) => moverParaLixeira(api, codigo),
    onSuccess: () => { setConfirmandoExclusao(null); void invalidarListas(clienteDeConsultas); },
  });

  function filtrar(alteracao: Partial<FiltrosDoPainel>) {
    setFiltros((atuais) => ({ ...atuais, ...alteracao }));
    setPagina(0);
  }

  const atualizadoEm = Math.max(lista.dataUpdatedAt, resumo.dataUpdatedAt);
  const dadosDoResumo = resumo.data;
  const resultado = lista.data;
  const filtrosAtivos = Boolean(filtros.busca || filtros.status || filtros.prioridade || filtros.sla || (filtros.departamento && filtros.departamento !== departamentoDoUsuario));

  return (
    <main id="conteudo" className="min-w-0 p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-navy">{departamentoDoUsuario ? `Fila · ${NOME_TIPO[departamentoDoUsuario]}` : "Dashboard"}</h1>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-[#64748B]">
            {atualizadoEm > 0 ? <AtualizadoHa instante={atualizadoEm} /> : "Carregando…"}
            <span className="hidden sm:inline">· atualização automática a cada {INTERVALO_DO_PAINEL_MS / 1000} s</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { void lista.refetch(); void resumo.refetch(); }} className="alvo-toque inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} className={lista.isFetching ? "animate-spin" : undefined} aria-hidden /> Atualizar
          </button>
          {podeAbrir && (
            <Link href="/chamados/novo" className="alvo-toque inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
              Novo Chamado
            </Link>
          )}
        </div>
      </div>

      {dadosDoResumo && dadosDoResumo.p1SemPrimeiraResposta.length > 0 && (
        <div role="alert" className="mb-5 flex flex-col gap-2 rounded-2xl border-2 border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2 text-sm font-bold text-red-700"><Siren size={18} aria-hidden /> P1 sem 1ª resposta ({dadosDoResumo.p1SemPrimeiraResposta.length})</span>
          <span className="flex flex-wrap gap-2 sm:ml-2">
            {dadosDoResumo.p1SemPrimeiraResposta.map((codigo) => (
              <Link key={codigo} href={`/chamados/${codigo}`} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-red-700 underline-offset-2 hover:underline">{codigo}</Link>
            ))}
          </span>
          <span className="text-xs text-red-700 sm:ml-auto">Acione a Central de Assistência / Plantão se o prazo de 15 min estiver estourado.</span>
        </div>
      )}

      {resumo.isError && <div className="mb-5"><AvisoDeErro erro={resumo.error} /></div>}

      <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} aria-hidden />
            <input
              type="search"
              aria-label="Buscar chamados"
              placeholder="Buscar por protocolo, cliente ou veículo…"
              value={filtros.busca ?? ""}
              onChange={(evento) => filtrar({ busca: evento.target.value || undefined })}
              className="alvo-toque w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-brand-blue"
            />
          </div>
          <select aria-label="Filtrar por status" className={selectClass} value={filtros.status ?? ""} onChange={(evento) => filtrar({ status: (evento.target.value || undefined) as Status | undefined })}>
            <option value="">Todos os status</option>
            {STATUS_CHAMADO.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select aria-label="Filtrar por prioridade" className={selectClass} value={filtros.prioridade ?? ""} onChange={(evento) => filtrar({ prioridade: (evento.target.value || undefined) as CodigoPrioridade | undefined })}>
            <option value="">Todas as prioridades</option>
            {CODIGOS_PRIORIDADE.map((codigo) => <option key={codigo} value={codigo}>{codigo} · {ROTULO_PRIORIDADE[codigo]}</option>)}
          </select>
          <select aria-label="Filtrar por departamento" className={selectClass} value={filtros.departamento ?? ""} onChange={(evento) => filtrar({ departamento: (evento.target.value || undefined) as TipoChamado | undefined })}>
            <option value="">Todos os departamentos</option>
            {TIPOS_CHAMADO.map((tipo) => <option key={tipo} value={tipo}>{NOME_TIPO[tipo]}</option>)}
          </select>
          <select aria-label="Filtrar por situação do SLA" className={selectClass} value={filtros.sla ?? ""} onChange={(evento) => filtrar({ sla: (evento.target.value || undefined) as SituacaoSlaFiltravel | undefined })}>
            <option value="">Qualquer SLA</option>
            {SITUACOES_DE_SLA.map((situacao) => <option key={situacao} value={situacao}>{rotuloDaSituacao(situacao)}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-medium text-slate-500">Ordenar:</span>
          {([["fila", "Fila (prioridade, score e antiguidade)"], ["recentes", "Mais recentes"]] as const).map(([valor, rotulo]) => (
            <button key={valor} type="button" aria-pressed={ordenacao === valor} onClick={() => filtrar({ ordenacao: valor })} className={cn("alvo-toque rounded-lg px-3 py-1.5 font-semibold", ordenacao === valor ? "bg-brand-navy text-white" : "bg-slate-100 text-slate-600")}>
              {rotulo}
            </button>
          ))}
          {filtrosAtivos && (
            <button type="button" onClick={() => filtrar({ busca: undefined, status: undefined, prioridade: undefined, sla: undefined, departamento: departamentoDoUsuario })} className="ml-auto font-semibold text-brand-blue hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white" aria-labelledby="titulo-lista">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-4">
          <h2 id="titulo-lista" className="font-display text-sm font-semibold text-brand-navy">{ordenacao === "fila" ? "Fila de atendimento" : "Chamados recentes"}</h2>
          {resultado && <span className="text-xs text-[#94A3B8]">{resultado.totalElements} resultado{resultado.totalElements !== 1 ? "s" : ""}</span>}
        </div>
        {exclusao.isError && <div className="px-5 pt-4"><AvisoDeErro erro={exclusao.error} /></div>}
        {lista.isPending ? <Carregando texto="Carregando chamados…" /> : lista.isError ? (
          <div className="p-5"><FalhaAoCarregar erro={lista.error} aoTentarDeNovo={() => void lista.refetch()} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="bg-brand-light">
                  {["Protocolo", "Cliente / Veículo", "Departamento", "Status", "Prioridade", "SLA", "Ações"].map((titulo) => (
                    <th key={titulo} scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{titulo}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {resultado?.content.map((chamado) => {
                  const critico = chamado.sla && [chamado.sla.primeiraResposta.situacao, chamado.sla.resolucao.situacao].some((situacao) => situacao === "VIOLADO" || situacao === "EM_RISCO");
                  return (
                    <tr key={chamado.id} className={cn("cursor-pointer transition-colors hover:bg-brand-light", critico && "bg-orange-50/40")} onClick={() => router.push(`/chamados/${chamado.id}`)}>
                      <td className="px-5 py-4">
                        <Link href={`/chamados/${chamado.id}`} onClick={(evento) => evento.stopPropagation()} className="text-sm font-bold text-brand-blue">#{chamado.id}</Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-brand-dark">{chamado.cliente}</div>
                        <div className="mt-0.5 text-xs text-[#94A3B8]">{[chamado.modelo, chamado.placa].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#475569]">{chamado.departamento?.nome ?? "—"}</td>
                      <td className="px-5 py-4"><StatusBadge status={chamado.status} /></td>
                      <td className="px-5 py-4"><PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} /></td>
                      <td className="px-5 py-4"><SlaResumo sla={chamado.status === "Fechado" ? null : chamado.sla} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                          <Link href={`/chamados/${chamado.id}`} className="text-xs font-semibold text-brand-blue hover:underline">Ver</Link>
                          {confirmandoExclusao === chamado.id ? (
                            <span className="flex items-center gap-1">
                              <button type="button" disabled={exclusao.isPending} onClick={() => exclusao.mutate(chamado.id)} className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Confirmar</button>
                              <button type="button" aria-label="Cancelar exclusão" onClick={() => setConfirmandoExclusao(null)} className="text-xs text-[#94A3B8] hover:text-[#64748B]">✕</button>
                            </span>
                          ) : (
                            <button type="button" onClick={() => setConfirmandoExclusao(chamado.id)} title="Mover para a lixeira" aria-label={`Excluir chamado ${chamado.id}`} className="text-[#CBD5E1] transition-colors hover:text-[#EF4444]">
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {resultado?.content.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[#94A3B8]">Nenhum chamado encontrado com os filtros aplicados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {resultado && resultado.totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-[#F1F5F9] px-5 py-3 text-xs text-slate-500">
            <button type="button" aria-label="Página anterior" disabled={pagina === 0} onClick={() => setPagina((atual) => atual - 1)} className="alvo-toque flex items-center justify-center rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"><ChevronLeft size={14} /></button>
            Página {pagina + 1} de {resultado.totalPages}
            <button type="button" aria-label="Próxima página" disabled={pagina + 1 >= resultado.totalPages} onClick={() => setPagina((atual) => atual + 1)} className="alvo-toque flex items-center justify-center rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"><ChevronRight size={14} /></button>
          </div>
        )}
      </section>
    </main>
  );
}
