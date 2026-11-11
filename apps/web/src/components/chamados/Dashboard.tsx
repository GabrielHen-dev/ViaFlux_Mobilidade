"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Columns3, List, MapPinned, RefreshCw } from "lucide-react";
import type { CodigoPrioridade, Etapa, ResumoChamados, Status, TipoChamado } from "@/types/chamado";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import { INTERVALO_DO_PAINEL_MS, useListaDeChamados, useResumoDeChamados } from "@/hooks/consultas";
import { AvisoDeErro, Carregando, FalhaAoCarregar } from "@/components/feedback/EstadoDaConsulta";
import FiltrosDoPainel, { type FiltrosDoPainel as Filtros } from "@/components/chamados/painel/FiltrosDoPainel";
import TabelaDeChamados from "@/components/chamados/painel/TabelaDeChamados";
import QuadroKanban from "@/components/chamados/painel/QuadroKanban";
import MapaDeOcorrencias from "@/components/chamados/painel/MapaDeOcorrencias";
import { AlertaDeP1, ContadoresDaOperacao } from "@/components/chamados/painel/AlertasDoPainel";
import { TabelaDaFilaDeTriagem } from "@/components/triagem/FilaDeTriagem";
import { NOME_TIPO } from "@/utils/prioridade";
import { formatarHora } from "@/utils/date";
import { useAgora } from "@/hooks/useAgora";
import { cn } from "@/utils/cn";
import { PERFIS_COM_VISAO_GLOBAL, PERFIS_DE_TRIAGEM, PERFIS_QUE_ATENDEM, usuarioTemPerfil } from "@/utils/perfis";

const TAMANHO_DA_PAGINA = 20;
const TAMANHO_DO_QUADRO = 100;

type ModoDoPainel = "lista" | "kanban" | "mapa";
const STATUS_DA_FILA: readonly { status: Status; rotulo: string }[] = [
  { status: "Aberto", rotulo: "Aberto" },
  { status: "Em triagem", rotulo: "Em triagem" },
  { status: "Na fila", rotulo: "Na fila" },
  { status: "Em atendimento", rotulo: "Em atendimento" },
  { status: "Aguardando", rotulo: "Aguardando" },
  { status: "Resolvido", rotulo: "Resolvidos" },
  { status: "Fechado", rotulo: "Fechados" },
  { status: "Cancelado", rotulo: "Cancelados" },
];

interface Recorte {
  status?: Status;
  etapa?: Etapa;
  prioridade?: CodigoPrioridade;
  sla?: Filtros["sla"];
  responsavel?: Filtros["responsavel"];
}

interface Visualizacao {
  id: string;
  rotulo: string;
  href: string;
  recorte: Recorte;
  contagem: (resumo: ResumoChamados) => number | null;
  grupo: "operacao" | "status";
}

function visualizacoesPara(fazTriagem: boolean, atende: boolean): Visualizacao[] {
  const visoes: Visualizacao[] = [
    { id: "fila", rotulo: "Fila de atendimento", href: "/", recorte: {}, grupo: "operacao", contagem: (resumo) => (["Na fila", "Em atendimento", "Aguardando"] as Status[]).reduce((total, status) => total + (resumo.porStatus[status] ?? 0), 0) },
  ];
  if (atende) {
    visoes.push({ id: "meus", rotulo: "Meus chamados", href: "/?visao=meus", recorte: { responsavel: "eu" }, grupo: "operacao", contagem: () => null });
  }
  if (fazTriagem) {
    visoes.push({ id: "analise", rotulo: "Pendentes de análise", href: "/triagem", recorte: { etapa: "TRIAGEM" }, grupo: "operacao", contagem: (resumo) => resumo.triagem.aguardando + resumo.triagem.emAndamento + resumo.triagem.aguardandoRevisao });
  }
  visoes.push(
    { id: "p1", rotulo: "P1 · Crítica", href: "/?visao=p1", recorte: { prioridade: "P1" }, grupo: "operacao", contagem: (resumo) => resumo.porPrioridade.P1 ?? 0 },
    { id: "sla-vencido", rotulo: "SLA vencido", href: "/?visao=sla-vencido", recorte: { sla: "VIOLADO" }, grupo: "operacao", contagem: (resumo) => resumo.sla.vigente.violado },
    { id: "sla-em-risco", rotulo: "SLA em risco", href: "/?visao=sla-em-risco", recorte: { sla: "EM_RISCO" }, grupo: "operacao", contagem: (resumo) => resumo.sla.vigente.emRisco },
  );
  for (const { status, rotulo } of STATUS_DA_FILA) {
    visoes.push({ id: `status-${status}`, rotulo, href: `/?visao=${encodeURIComponent(`status-${status}`)}`, recorte: { status }, grupo: "status", contagem: (resumo) => resumo.porStatus[status] ?? 0 });
  }
  return visoes;
}

function AtualizadoHa({ instante }: { instante: number }) {
  const agora = useAgora();
  const segundos = Math.max(0, Math.floor((agora.getTime() - instante) / 1000));
  return (
    <time dateTime={new Date(instante).toISOString()} title={`Atualizado às ${formatarHora(new Date(instante).toISOString())}`} className="tabular-nums" suppressHydrationWarning>
      {segundos < 2 ? "Atualizado agora" : `Atualizado há ${segundos} s`}
    </time>
  );
}

function ListaDeVisualizacoes({ visoes, atual, resumo }: { visoes: Visualizacao[]; atual: string; resumo: ResumoChamados | undefined }) {
  const grupos: { titulo: string; itens: Visualizacao[] }[] = [
    { titulo: "Operação", itens: visoes.filter((visao) => visao.grupo === "operacao") },
    { titulo: "Por status", itens: visoes.filter((visao) => visao.grupo === "status") },
  ];
  return (
    <nav aria-label="Visualizações" className="vf-cartao overflow-hidden lg:sticky lg:top-[calc(var(--vf-altura-topo)+1rem)]">
      <div className="border-b border-linha px-4 py-3 text-sm font-medium text-tinta">Visualizações</div>
      <div className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-3 lg:overflow-visible">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="flex shrink-0 gap-1 lg:block">
            <div className="hidden px-2 pb-1 pt-1 text-xs text-tinta-apagada lg:block">{grupo.titulo}</div>
            {grupo.itens.map((visao) => {
              const ativa = visao.id === atual;
              return (
                <Link
                  key={visao.id}
                  href={visao.href}
                  aria-current={ativa ? "page" : undefined}
                  className={cn(
                    "alvo-toque flex shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded px-2.5 py-1.5 text-sm",
                    ativa ? "bg-acao-suave font-medium text-acao" : "text-tinta-suave hover:bg-fundo hover:text-tinta",
                  )}
                >
                  <span>{visao.rotulo}</span>
                  {resumo && visao.contagem(resumo) !== null && <span className={cn("rounded px-1.5 text-xs tabular-nums", ativa ? "bg-white text-acao" : "bg-fundo text-tinta-apagada")}>{visao.contagem(resumo)}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

export default function Dashboard({ visaoInicial }: { visaoInicial?: "analise" }) {
  const usuario = useUsuarioAutenticado();
  const visaoGlobal = usuarioTemPerfil(usuario, PERFIS_COM_VISAO_GLOBAL);
  const fazTriagem = usuarioTemPerfil(usuario, PERFIS_DE_TRIAGEM);
  const departamentoDoUsuario = visaoGlobal ? undefined : (usuario.departamentos?.[0]?.codigo as TipoChamado | undefined);
  const parametros = useSearchParams();
  const buscaDaUrl = parametros.get("busca") ?? undefined;
  const visoes = visualizacoesPara(fazTriagem, usuarioTemPerfil(usuario, PERFIS_QUE_ATENDEM));
  const idDaVisao = visaoInicial ?? parametros.get("visao") ?? "fila";
  const visao = visoes.find((item) => item.id === idDaVisao) ?? visoes[0];
  const naAnalise = visao.id === "analise";

  const { status, etapa, prioridade, sla, responsavel } = visao.recorte;
  const [filtros, setFiltros] = useState<Filtros>({ ordenacao: "fila", departamento: departamentoDoUsuario, busca: buscaDaUrl, status, etapa, prioridade, sla, responsavel });
  const [pagina, setPagina] = useState(0);
  const [modo, setModo] = useState<ModoDoPainel>("lista");
  const chaveDaUrl = `${visao.id}|${buscaDaUrl ?? ""}`;
  const [chaveAplicada, setChaveAplicada] = useState(chaveDaUrl);

  if (chaveAplicada !== chaveDaUrl) {
    setChaveAplicada(chaveDaUrl);
    setFiltros((atuais) => ({ ...atuais, busca: buscaDaUrl, status, etapa, prioridade, sla, responsavel }));
    setPagina(0);
  }

  const { ordenacao } = filtros;
  const filtrosDoResumo = { ...filtros, status: undefined, etapa: undefined, prioridade: undefined, sla: undefined, responsavel: undefined };
  const lista = useListaDeChamados({ ...filtros, page: pagina, size: TAMANHO_DA_PAGINA }, modo === "lista");
  const quadro = useListaDeChamados({ ...filtros, status: undefined, page: 0, size: TAMANHO_DO_QUADRO }, modo !== "lista" && !naAnalise);
  const resumo = useResumoDeChamados(filtrosDoResumo);

  function filtrar(alteracao: Partial<Filtros>) {
    setFiltros((atuais) => ({ ...atuais, ...alteracao }));
    setPagina(0);
  }

  const atualizadoEm = Math.max(lista.dataUpdatedAt, quadro.dataUpdatedAt, resumo.dataUpdatedAt);
  const consultaAtual = modo === "lista" ? lista : quadro;
  const resultado = lista.data;
  const titulo = naAnalise ? "Classificação" : departamentoDoUsuario ? `Fila · ${NOME_TIPO[departamentoDoUsuario]}` : "Dashboard";

  return (
    <main id="conteudo" className="min-w-0 vf-pagina">
      <div className="vf-cabecalho-pagina mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">{titulo}</h1>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-[#64748B]">
            <span className="font-medium text-tinta-suave">{visao.rotulo}</span>
            <span aria-hidden>·</span>
            {atualizadoEm > 0 ? <AtualizadoHa instante={atualizadoEm} /> : "Carregando…"}
            <span className="hidden sm:inline">· a cada {INTERVALO_DO_PAINEL_MS / 1000} s</span>
          </p>
        </div>
        <button type="button" onClick={() => { void consultaAtual.refetch(); void resumo.refetch(); }} className="vf-botao-secundario alvo-toque inline-flex items-center gap-2 px-4 py-2">
          <RefreshCw size={14} className={consultaAtual.isFetching ? "animate-spin" : undefined} aria-hidden /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="min-w-0">
          <ListaDeVisualizacoes visoes={visoes} atual={visao.id} resumo={resumo.data} />
        </div>

        <div className="min-w-0">
          {resumo.data && <AlertaDeP1 resumo={resumo.data} />}
          {resumo.data && <ContadoresDaOperacao resumo={resumo.data} comLink={fazTriagem} />}
          {resumo.isError && <div className="mb-4"><AvisoDeErro erro={resumo.error} /></div>}

          {naAnalise ? <TabelaDaFilaDeTriagem /> : (
            <>
              <FiltrosDoPainel filtros={filtros} departamentoFixo={departamentoDoUsuario} comFiltroDeEtapa={visaoGlobal} aoFiltrar={filtrar} />

              <section className="vf-cartao overflow-hidden" aria-labelledby="titulo-lista">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linha px-4 py-2">
                  <h2 id="titulo-lista" className="text-sm font-medium text-tinta">{modo === "kanban" ? "Quadro por status" : modo === "mapa" ? "Mapa de ocorrências" : ordenacao === "fila" ? "Fila de atendimento" : "Chamados recentes"}</h2>
                  <div className="flex items-center gap-3">
                    {modo === "lista" && resultado && <span className="text-xs text-tinta-apagada">{resultado.totalElements} resultado{resultado.totalElements !== 1 ? "s" : ""}</span>}
                    {modo !== "lista" && quadro.data && <span className="text-xs text-tinta-apagada">{quadro.data.content.length} de {quadro.data.totalElements}</span>}
                    <div role="group" aria-label="Modo de visualização" className="flex rounded border border-linha">
                      {([["lista", "Lista", List], ["kanban", "Kanban", Columns3], ["mapa", "Mapa", MapPinned]] as const).map(([valor, rotulo, Icone]) => (
                        <button
                          key={valor}
                          type="button"
                          aria-pressed={modo === valor}
                          onClick={() => setModo(valor)}
                          className={cn("alvo-toque inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium first:rounded-l last:rounded-r", modo === valor ? "bg-acao-suave text-acao" : "bg-white text-tinta-suave hover:bg-fundo")}
                        >
                          <Icone size={13} aria-hidden /> {rotulo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {consultaAtual.isPending ? <Carregando texto="Carregando chamados…" /> : consultaAtual.isError ? (
                  <div className="p-4"><FalhaAoCarregar erro={consultaAtual.error} aoTentarDeNovo={() => void consultaAtual.refetch()} /></div>
                ) : modo === "mapa" ? (
                  <MapaDeOcorrencias chamados={quadro.data?.content ?? []} />
                ) : modo === "kanban" ? (
                  <QuadroKanban chamados={quadro.data?.content ?? []} podeMover={usuarioTemPerfil(usuario, PERFIS_QUE_ATENDEM)} />
                ) : (
                  <TabelaDeChamados resultado={lista.data!} pagina={pagina} podeTriar={fazTriagem} podeAtender={usuarioTemPerfil(usuario, PERFIS_QUE_ATENDEM)} aoMudarDePagina={setPagina} />
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
