"use client";

import Link from "next/link";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Status, TipoChamado } from "@/types/chamado";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import { INTERVALO_DO_PAINEL_MS, useListaDeChamados, useResumoDeChamados } from "@/hooks/consultas";
import { AvisoDeErro, Carregando, FalhaAoCarregar } from "@/components/feedback/EstadoDaConsulta";
import FiltrosDoPainel, { type FiltrosDoPainel as Filtros } from "@/components/chamados/painel/FiltrosDoPainel";
import TabelaDeChamados from "@/components/chamados/painel/TabelaDeChamados";
import { AlertaDeP1, ContadoresDaOperacao } from "@/components/chamados/painel/AlertasDoPainel";
import { NOME_TIPO } from "@/utils/prioridade";
import { formatarHora } from "@/utils/date";
import { useAgora } from "@/hooks/useAgora";
import { PERFIS_COM_VISAO_GLOBAL, PERFIS_DA_LIXEIRA, PERFIS_DE_TRIAGEM, PERFIS_QUE_ABREM_CHAMADO, PERFIS_QUE_ATENDEM, usuarioTemPerfil } from "@/utils/perfis";

const TAMANHO_DA_PAGINA = 20;
const STATUS_DA_FILA: readonly { status: Status; rotulo: string }[] = [
  { status: "Aberto", rotulo: "Aberto" },
  { status: "Em triagem", rotulo: "Em triagem" },
  { status: "Na fila", rotulo: "Na fila" },
  { status: "Em atendimento", rotulo: "Em atendimento" },
  { status: "Aguardando", rotulo: "Aguardando" },
  { status: "Resolvido", rotulo: "Resolvidos" },
  { status: "Fechado", rotulo: "Fechados" },
];

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
  const visaoGlobal = usuarioTemPerfil(usuario, PERFIS_COM_VISAO_GLOBAL);
  const fazTriagem = usuarioTemPerfil(usuario, PERFIS_DE_TRIAGEM);
  const podeAbrir = usuarioTemPerfil(usuario, PERFIS_QUE_ABREM_CHAMADO);
  const departamentoDoUsuario = visaoGlobal ? undefined : (usuario.departamentos?.[0]?.codigo as TipoChamado | undefined);

  const [filtros, setFiltros] = useState<Filtros>({ ordenacao: "fila", departamento: departamentoDoUsuario });
  const [pagina, setPagina] = useState(0);

  const { ordenacao } = filtros;
  const filtrosDoResumo = { ...filtros, status: undefined, etapa: undefined };
  const lista = useListaDeChamados({ ...filtros, page: pagina, size: TAMANHO_DA_PAGINA });
  const resumo = useResumoDeChamados(filtrosDoResumo);

  function filtrar(alteracao: Partial<Filtros>) {
    setFiltros((atuais) => ({ ...atuais, ...alteracao }));
    setPagina(0);
  }

  const atualizadoEm = Math.max(lista.dataUpdatedAt, resumo.dataUpdatedAt);
  const resultado = lista.data;

  return (
    <main id="conteudo" className="min-w-0 p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-navy">{departamentoDoUsuario ? `Fila · ${NOME_TIPO[departamentoDoUsuario]}` : "Dashboard"}</h1>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-[#64748B]">
            {atualizadoEm > 0 ? <AtualizadoHa instante={atualizadoEm} /> : "Carregando…"}
            <span className="hidden sm:inline">· a cada {INTERVALO_DO_PAINEL_MS / 1000} s</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { void lista.refetch(); void resumo.refetch(); }} className="alvo-toque inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} className={lista.isFetching ? "animate-spin" : undefined} aria-hidden /> Atualizar
          </button>
          {podeAbrir && (
            <Link href="/chamados/novo" className="alvo-toque inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
              Novo chamado
            </Link>
          )}
        </div>
      </div>

      {resumo.data && <AlertaDeP1 resumo={resumo.data} />}
      {resumo.data && <ContadoresDaOperacao resumo={resumo.data} comLink={fazTriagem} />}
      {resumo.isError && <div className="mb-5"><AvisoDeErro erro={resumo.error} /></div>}

      {resumo.data && (
        <nav aria-label="Recortes da fila" className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button type="button" aria-pressed={!filtros.status && !filtros.etapa} onClick={() => filtrar({ status: undefined, etapa: undefined })} className={`alvo-toque shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${!filtros.status && !filtros.etapa ? "bg-brand-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            Fila de atendimento ({["Na fila", "Em atendimento", "Aguardando"].reduce((total, status) => total + (resumo.data?.porStatus[status as Status] ?? 0), 0)})
          </button>
          {fazTriagem && (
            <button type="button" aria-pressed={filtros.etapa === "TRIAGEM"} onClick={() => filtrar({ status: undefined, etapa: "TRIAGEM" })} className={`alvo-toque shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${filtros.etapa === "TRIAGEM" ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"}`}>
              Pendentes de análise ({(resumo.data?.triagem.aguardando ?? 0) + (resumo.data?.triagem.emAndamento ?? 0) + (resumo.data?.triagem.aguardandoRevisao ?? 0)})
            </button>
          )}
          {STATUS_DA_FILA.map(({ status, rotulo }) => (
            <button key={status} type="button" aria-pressed={filtros.status === status && !filtros.etapa} onClick={() => filtrar({ status, etapa: undefined })} className={`alvo-toque shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${filtros.status === status && !filtros.etapa ? "bg-brand-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
              {rotulo} ({resumo.data?.porStatus[status] ?? 0})
            </button>
          ))}
        </nav>
      )}

      <FiltrosDoPainel filtros={filtros} departamentoFixo={departamentoDoUsuario} comFiltroDeEtapa={visaoGlobal} aoFiltrar={filtrar} />

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white" aria-labelledby="titulo-lista">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-4">
          <h2 id="titulo-lista" className="font-display text-sm font-semibold text-brand-navy">{ordenacao === "fila" ? "Fila de atendimento" : "Chamados recentes"}</h2>
          {resultado && <span className="text-xs text-[#94A3B8]">{resultado.totalElements} resultado{resultado.totalElements !== 1 ? "s" : ""}</span>}
        </div>
        {lista.isPending ? <Carregando texto="Carregando chamados…" /> : lista.isError ? (
          <div className="p-5"><FalhaAoCarregar erro={lista.error} aoTentarDeNovo={() => void lista.refetch()} /></div>
        ) : (
          <TabelaDeChamados resultado={lista.data} pagina={pagina} podeExcluir={usuarioTemPerfil(usuario, PERFIS_DA_LIXEIRA)} podeTriar={fazTriagem} podeAtender={usuarioTemPerfil(usuario, PERFIS_QUE_ATENDEM)} aoMudarDePagina={setPagina} />
        )}
      </section>
    </main>
  );
}
