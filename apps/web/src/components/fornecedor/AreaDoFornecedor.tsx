"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import type { ServicoDoFornecedor } from "@/types/chamado";
import type { DadosAtualizacaoServico } from "@/services/api/contratos";
import { atualizarServicoDoFornecedor } from "@/services/api/operacao";
import { useApi } from "@/store/AuthContext";
import { chaves, useServicosDoFornecedor } from "@/hooks/consultas";
import { useRascunho } from "@/hooks/useRascunho";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { APARENCIA_DO_STATUS_DO_SERVICO, StatusServicoBadge } from "@/components/ui/StatusServico";
import { AvisoDeErro, Carregando, FalhaAoCarregar } from "@/components/feedback/EstadoDaConsulta";
import { enderecoNoMapa } from "@/components/chamados/LocalizacaoDoChamado";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DE_FORNECEDOR } from "@/utils/perfis";
import { cn } from "@/utils/cn";

const PROXIMOS_STATUS: DadosAtualizacaoServico["status"][] = ["RECEBIDO", "EM_EXECUCAO", "CONCLUIDO"];

function CartaoDoServico({ servico }: { servico: ServicoDoFornecedor }) {
  const api = useApi();
  const clienteDeConsultas = useQueryClient();
  const [status, setStatus] = useState<DadosAtualizacaoServico["status"] | null>(null);
  const { valor: observacao, setValor: setObservacao, descartar } = useRascunho(`servico-${servico.id}`, "");
  const atualizacao = useMutation({
    mutationFn: (dados: DadosAtualizacaoServico) => atualizarServicoDoFornecedor(api, servico.id, dados),
    onSuccess: () => {
      setStatus(null);
      descartar("");
      void clienteDeConsultas.invalidateQueries({ queryKey: chaves.servicosDoFornecedor });
    },
  });
  const concluido = servico.status === "CONCLUIDO";

  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5" aria-labelledby={`servico-${servico.id}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`servico-${servico.id}`} className="font-display text-base font-bold text-brand-navy">{servico.tipoServico} · {servico.chamadoId}</h2>
        <StatusServicoBadge status={servico.status} />
      </div>
      {servico.local && (
        <a href={enderecoNoMapa({ endereco: servico.local, latitude: null, longitude: null })} target="_blank" rel="noreferrer" className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue">
          <MapPin size={14} aria-hidden /> {servico.local}
        </a>
      )}
      {servico.observacao && <p className="mb-2 text-sm text-slate-600">Instruções da Central: {servico.observacao}</p>}
      <p className="mb-4 text-xs text-slate-400">Última atualização: {formatarDataHora(servico.atualizadoEm)}</p>

      {!concluido && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Atualizar status</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PROXIMOS_STATUS.map((opcao) => (
                <label key={opcao} className={cn("alvo-toque flex cursor-pointer items-center justify-center rounded-xl border-2 px-3 py-2 text-sm font-semibold", status === opcao ? "border-brand-blue bg-blue-50 text-blue-700" : "border-[#E2E8F0] text-slate-600")}>
                  <input type="radio" name={`status-${servico.id}`} className="sr-only" checked={status === opcao} onChange={() => setStatus(opcao)} />
                  {APARENCIA_DO_STATUS_DO_SERVICO[opcao].rotulo}
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor={`observacao-${servico.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Observação</label>
          <textarea id={`observacao-${servico.id}`} rows={2} value={observacao} onChange={(evento) => setObservacao(evento.target.value)} className="w-full resize-none rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-brand-blue" placeholder="Ex.: guincho a caminho, previsão 30 min" />
          {atualizacao.isError && <AvisoDeErro erro={atualizacao.error} />}
          <button type="button" disabled={!status || atualizacao.isPending} onClick={() => status && atualizacao.mutate({ status, observacao: observacao.trim() })} className="alvo-toque w-full rounded-xl bg-brand-green py-3 text-sm font-semibold text-white disabled:opacity-40">
            {atualizacao.isPending ? "Enviando…" : "Registrar atualização"}
          </button>
        </div>
      )}

      {servico.historico.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500">Histórico ({servico.historico.length})</summary>
          <ol className="mt-2 space-y-2">
            {[...servico.historico].reverse().map((registro) => (
              <li key={`${registro.status}-${registro.registradoEm}`} className="border-l-2 border-slate-200 pl-3 text-xs text-slate-600">
                <span className="font-semibold">{APARENCIA_DO_STATUS_DO_SERVICO[registro.status].rotulo}</span> · {formatarDataHora(registro.registradoEm)}
                {registro.observacao && <span className="block">{registro.observacao}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </article>
  );
}

function ConteudoDoFornecedor() {
  const servicos = useServicosDoFornecedor();
  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-brand-navy">Meus serviços</h1>
        <p className="mb-6 text-sm text-slate-500">Somente os serviços vinculados à sua empresa. Cada atualização fica registrada com data, hora e fornecedor.</p>
        {servicos.isPending ? <Carregando texto="Carregando serviços…" /> : servicos.isError ? (
          <FalhaAoCarregar erro={servicos.error} aoTentarDeNovo={() => void servicos.refetch()} />
        ) : servicos.data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Nenhum serviço vinculado à sua empresa no momento.</p>
        ) : (
          <div className="space-y-4">{servicos.data.map((servico) => <CartaoDoServico key={servico.id} servico={servico} />)}</div>
        )}
      </div>
    </main>
  );
}

export default function AreaDoFornecedor() {
  return <PerfilRequerido perfis={PERFIS_DE_FORNECEDOR}><ConteudoDoFornecedor /></PerfilRequerido>;
}
