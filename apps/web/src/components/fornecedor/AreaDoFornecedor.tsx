"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, MessageSquare, Wrench } from "lucide-react";
import { toast } from "sonner";
import { STATUS_SERVICO, type AtualizacaoServico, type MensagemAoFornecedor, type ServicoDoFornecedor, type StatusServico } from "@/types/chamado";
import type { DadosAtualizacaoServico } from "@/services/api/contratos";
import { atualizarServicoDoFornecedor } from "@/services/api/operacao";
import { useApi, useUsuarioAutenticado } from "@/store/AuthContext";
import { chaves, useServicosDoFornecedor } from "@/hooks/consultas";
import { useRascunho } from "@/hooks/useRascunho";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { APARENCIA_DO_STATUS_DO_SERVICO, StatusServicoBadge } from "@/components/ui/StatusServico";
import { Carregando, FalhaAoCarregar, mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { enderecoNoMapa } from "@/components/chamados/LocalizacaoDoChamado";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DE_FORNECEDOR } from "@/utils/perfis";
import { cn } from "@/utils/cn";

const STATUS_ATUALIZAVEIS: DadosAtualizacaoServico["status"][] = ["RECEBIDO", "EM_EXECUCAO", "CONCLUIDO"];

export function proximosStatus(atual: StatusServico) {
  return STATUS_ATUALIZAVEIS.filter((opcao) => STATUS_SERVICO.indexOf(opcao) > STATUS_SERVICO.indexOf(atual));
}

const VISOES = [
  { id: "todos", rotulo: "Todos", filtro: () => true },
  { id: "solicitados", rotulo: "Solicitados", filtro: (status: StatusServico) => status === "SOLICITADO" },
  { id: "andamento", rotulo: "Em andamento", filtro: (status: StatusServico) => status === "RECEBIDO" || status === "EM_EXECUCAO" },
  { id: "concluidos", rotulo: "Concluídos", filtro: (status: StatusServico) => status === "CONCLUIDO" },
] as const;
type IdDaVisao = (typeof VISOES)[number]["id"];

function DetalheDoServico({ servico }: { servico: ServicoDoFornecedor }) {
  const api = useApi();
  const usuario = useUsuarioAutenticado();
  const clienteDeConsultas = useQueryClient();
  const [status, setStatus] = useState<DadosAtualizacaoServico["status"] | null>(null);
  const { valor: observacao, setValor: setObservacao, descartar } = useRascunho(`servico:${usuario.id}:${servico.id}`, "");
  const atualizacao = useMutation({
    mutationFn: (dados: DadosAtualizacaoServico) => atualizarServicoDoFornecedor(api, servico.id, dados),
    onSuccess: () => {
      setStatus(null);
      descartar("");
      void clienteDeConsultas.invalidateQueries({ queryKey: chaves.servicosDoFornecedor });
      toast.success("Atualização registrada", { description: `Chamado ${servico.chamadoId}` });
    },
    onError: (erro) => toast.error("Não foi possível registrar a atualização", { description: mensagemDeErro(erro) }),
  });
  const concluido = servico.status === "CONCLUIDO";
  const tramites: ({ tipo: "mensagem"; quando: string; mensagem: MensagemAoFornecedor } | { tipo: "atualizacao"; quando: string; registro: AtualizacaoServico })[] = [
    ...(servico.mensagens ?? []).map((mensagem) => ({ tipo: "mensagem" as const, quando: mensagem.enviadaEm, mensagem })),
    ...servico.historico.map((registro) => ({ tipo: "atualizacao" as const, quando: registro.registradoEm, registro })),
  ].sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime());

  return (
    <article className="vf-cartao" aria-labelledby={`servico-${servico.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linha px-4 py-3">
        <h2 id={`servico-${servico.id}`} className="text-base font-medium text-tinta">{servico.tipoServico} · {servico.chamadoId}</h2>
        <StatusServicoBadge status={servico.status} />
      </div>
      <div className="space-y-2 border-b border-linha px-4 py-3">
        {servico.local && (
          <a href={enderecoNoMapa({ endereco: servico.local, latitude: null, longitude: null })} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-acao">
            <MapPin size={14} aria-hidden /> {servico.local}
          </a>
        )}
        {servico.observacao && <p className="text-sm text-tinta-suave">Instruções da Central: {servico.observacao}</p>}
        <p className="text-xs text-tinta-apagada">Última atualização: {formatarDataHora(servico.atualizadoEm)}</p>
      </div>

      <div className="space-y-4 p-4">
        {!concluido && (
          <div className="space-y-3 rounded border border-linha bg-fundo p-3">
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-tinta-suave">Atualizar status</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {proximosStatus(servico.status).map((opcao) => (
                  <label key={opcao} className={cn("alvo-toque flex cursor-pointer items-center justify-center rounded border px-3 py-2 text-sm font-medium", status === opcao ? "border-acao bg-acao-suave text-acao" : "border-linha-forte bg-white text-tinta-suave")}>
                    <input type="radio" name={`status-${servico.id}`} className="sr-only" checked={status === opcao} onChange={() => setStatus(opcao)} />
                    {APARENCIA_DO_STATUS_DO_SERVICO[opcao].rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor={`observacao-${servico.id}`} className="block text-xs font-medium text-tinta-suave">Observação</label>
            <textarea id={`observacao-${servico.id}`} rows={2} value={observacao} onChange={(evento) => setObservacao(evento.target.value)} className="w-full resize-none rounded border border-linha-forte bg-white px-3 py-2 text-sm outline-none focus:border-acao" placeholder="Ex.: guincho a caminho, previsão 30 min" />
            <div className="flex justify-end">
              <button type="button" disabled={!status || atualizacao.isPending} onClick={() => status && atualizacao.mutate({ status, observacao: observacao.trim() })} className="vf-botao-primario alvo-toque px-4 py-2">
                {atualizacao.isPending ? "Registrando…" : "Registrar atualização"}
              </button>
            </div>
          </div>
        )}

        <section aria-label="Trâmites do serviço">
          <h3 className="mb-2 text-xs font-medium text-tinta-suave">Trâmites ({tramites.length})</h3>
          {tramites.length === 0 ? (
            <p className="rounded bg-fundo p-4 text-center text-xs text-tinta-apagada">Nenhuma atualização registrada.</p>
          ) : (
            <ol className="space-y-3">
              {tramites.map((item) => item.tipo === "mensagem" ? (
                <li key={`m-${item.mensagem.id}`} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acao text-white" aria-hidden><MessageSquare size={14} /></span>
                  <div className="min-w-0 flex-1 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm">
                    <span className="block text-xs text-tinta-apagada">{item.mensagem.autor ? `${item.mensagem.autor.nome} · ` : ""}Central ViaFlux · {formatarDataHora(item.mensagem.enviadaEm)}</span>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-tinta">{item.mensagem.texto}</p>
                  </div>
                </li>
              ) : (
                <li key={`a-${item.registro.status}-${item.registro.registradoEm}`} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-linha bg-white text-tinta-suave" aria-hidden><Wrench size={14} /></span>
                  <div className="min-w-0 flex-1 py-1 text-sm">
                    <span className="font-medium text-tinta">{APARENCIA_DO_STATUS_DO_SERVICO[item.registro.status].rotulo}</span>
                    <span className="block text-xs text-tinta-apagada">{formatarDataHora(item.registro.registradoEm)} · {item.registro.autor.nome}</span>
                    {item.registro.observacao && <span className="mt-0.5 block text-xs text-tinta-suave">{item.registro.observacao}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </article>
  );
}

function ConteudoDoFornecedor() {
  const servicos = useServicosDoFornecedor();
  const [visao, setVisao] = useState<IdDaVisao>("todos");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const lista = servicos.data ?? [];
  const filtro = VISOES.find((item) => item.id === visao)?.filtro ?? (() => true);
  const visiveis = lista.filter((servico) => filtro(servico.status));
  const atual = visiveis.find((servico) => servico.id === selecionado) ?? visiveis[0] ?? null;

  return (
    <main id="conteudo" className="min-w-0 vf-pagina">
      <div className="vf-cabecalho-pagina mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">Meus serviços</h1>
          <p className="mt-0.5 text-sm text-tinta-suave">Serviços vinculados à sua empresa.</p>
        </div>
      </div>
      {servicos.isPending ? <Carregando texto="Carregando serviços…" /> : servicos.isError ? (
        <FalhaAoCarregar erro={servicos.error} aoTentarDeNovo={() => void servicos.refetch()} />
      ) : lista.length === 0 ? (
        <p className="rounded border border-dashed border-linha-forte bg-white p-10 text-center text-sm text-tinta-suave">Nenhum serviço vinculado.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[13rem_19rem_minmax(0,1fr)]">
          <nav aria-label="Visualizações dos serviços" className="vf-cartao h-fit overflow-hidden">
            <div className="border-b border-linha px-4 py-3 text-sm font-medium text-tinta">Visualizações</div>
            <div className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-0.5">
              {VISOES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={visao === item.id}
                  onClick={() => { setVisao(item.id); setSelecionado(null); }}
                  className={cn("alvo-toque flex w-full shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded px-2.5 py-1.5 text-sm", visao === item.id ? "bg-acao-suave font-medium text-acao" : "text-tinta-suave hover:bg-fundo")}
                >
                  {item.rotulo}
                  <span className="rounded bg-fundo px-1.5 text-xs tabular-nums text-tinta-apagada">{lista.filter((servico) => item.filtro(servico.status)).length}</span>
                </button>
              ))}
            </div>
          </nav>

          <section aria-label="Lista de serviços" className="vf-cartao h-fit overflow-hidden">
            {visiveis.length === 0 ? (
              <p className="p-6 text-center text-xs text-tinta-apagada">Nenhum serviço nesta visualização.</p>
            ) : (
              <ul className="divide-y divide-linha">
                {visiveis.map((servico) => {
                  const ativo = atual?.id === servico.id;
                  return (
                    <li key={servico.id}>
                      <button
                        type="button"
                        aria-current={ativo ? "true" : undefined}
                        onClick={() => setSelecionado(servico.id)}
                        className={cn("flex w-full flex-col items-start gap-0.5 border-l-4 px-3 py-2.5 text-left", ativo ? "border-acao bg-acao-suave" : "border-transparent hover:bg-fundo")}
                      >
                        <span className="text-sm font-medium text-acao">{servico.chamadoId}</span>
                        <span className="text-xs text-tinta">{servico.tipoServico}</span>
                        <span className="text-[11px] text-tinta-apagada">{APARENCIA_DO_STATUS_DO_SERVICO[servico.status].rotulo.toLowerCase()} · {formatarDataHora(servico.atualizadoEm)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="min-w-0">{atual && <DetalheDoServico key={atual.id} servico={atual} />}</div>
        </div>
      )}
    </main>
  );
}

export default function AreaDoFornecedor() {
  return <PerfilRequerido perfis={PERFIS_DE_FORNECEDOR}><ConteudoDoFornecedor /></PerfilRequerido>;
}
