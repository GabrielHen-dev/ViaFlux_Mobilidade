"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Database, Eraser, FlaskConical, Trash } from "lucide-react";
import { ErroApi } from "@/services/api/cliente";
import { complementarComAcoesDeExemplo, consultarEstadoDosDados, limparDadosDeExemplo, popularBanco } from "@/services/api/devtools";
import { useApi } from "@/store/AuthContext";
import { invalidarListas } from "@/hooks/consultas";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { AvisoDeErro, Carregando } from "@/components/feedback/EstadoDaConsulta";

const QUANTIDADE_PADRAO = 30;
const LIMITE_POR_VEZ = 200;
const PREFIXO_DOS_DADOS_DO_NAVEGADOR = "viaflux.";
const CHAVES_PRESERVADAS = ["viaflux.refreshToken"];
const BANCO_DA_SIMULACAO_ANTIGA = "viaflux-simulacao";

function apagarDadosDoNavegador() {
  try {
    Object.keys(window.localStorage)
      .filter((chave) => chave.startsWith(PREFIXO_DOS_DADOS_DO_NAVEGADOR) && !CHAVES_PRESERVADAS.includes(chave))
      .forEach((chave) => window.localStorage.removeItem(chave));
  } catch { }
  if (typeof indexedDB !== "undefined") indexedDB.deleteDatabase(BANCO_DA_SIMULACAO_ANTIGA);
}

function Cartao({ titulo, icone, children }: { titulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-brand-navy">{icone}{titulo}</h2>
      {children}
    </section>
  );
}

function ConteudoDasFerramentas() {
  const api = useApi();
  const clienteDeConsultas = useQueryClient();
  const [quantidade, setQuantidade] = useState(QUANTIDADE_PADRAO);
  const [enriquecer, setEnriquecer] = useState(true);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState<"banco" | "navegador" | null>(null);
  const [mensagens, setMensagens] = useState<string[]>([]);

  const estado = useQuery({ queryKey: ["dev-tools", "estado"], queryFn: () => consultarEstadoDosDados(api), retry: false });
  const aposMudanca = async (linhas: string[]) => {
    setMensagens(linhas);
    setConfirmandoLimpeza(null);
    await Promise.all([estado.refetch(), invalidarListas(clienteDeConsultas)]);
  };

  const populacao = useMutation({
    mutationFn: async () => {
      const resultado = await popularBanco(api, quantidade);
      const acoes = enriquecer ? await complementarComAcoesDeExemplo(api, resultado.protocolos) : [];
      return { resultado, acoes };
    },
    onSuccess: ({ resultado, acoes }) => aposMudanca([
      `${resultado.chamadosCriados} chamados criados (${resultado.protocolos[0]} a ${resultado.protocolos.at(-1)}).`,
      `${resultado.usuariosCriados} usuários e ${resultado.organizacoesCriadas} organizações novos.`,
      ...acoes,
    ]),
  });
  const limpezaDoBanco = useMutation({
    mutationFn: () => limparDadosDeExemplo(api),
    onSuccess: (resultado) => aposMudanca([`Removidos ${resultado.chamadosRemovidos} chamados, ${resultado.usuariosRemovidos} usuários e ${resultado.organizacoesRemovidas} organizações de exemplo.`]),
  });

  const desabilitadoNaApi = estado.error instanceof ErroApi && estado.error.status === 404;
  const quantidadeValida = Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= LIMITE_POR_VEZ;
  const ocupado = populacao.isPending || limpezaDoBanco.isPending;

  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-brand-navy"><FlaskConical size={22} aria-hidden /> Dev tools</h1>
          <p className="text-sm text-slate-500">Popule e limpe dados de exemplo no ambiente local. Disponível só para ADMIN e só quando a API tem <code>DEV_TOOLS_HABILITADO=true</code>.</p>
        </div>

        {mensagens.length > 0 && (
          <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            {mensagens.map((mensagem) => <p key={mensagem} className="flex items-start gap-2"><Check size={14} className="mt-0.5 flex-shrink-0" aria-hidden />{mensagem}</p>)}
          </div>
        )}

        {estado.isPending ? <Carregando texto="Consultando a API…" /> : desabilitadoNaApi ? (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">O dev tools está desligado nesta API.</p>
            <p className="mt-1">Adicione <code>DEV_TOOLS_HABILITADO=true</code> e <code>DEV_TOOLS_SENHA=…</code> em <code>infra/.env</code> e reinicie a API.</p>
          </div>
        ) : estado.isError ? <AvisoDeErro erro={estado.error} /> : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Chamados no banco</div><div className="font-display text-2xl font-bold text-brand-navy">{estado.data.totalDeChamados}</div></div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Chamados de exemplo</div><div className="font-display text-2xl font-bold text-brand-navy">{estado.data.chamadosDeExemplo}</div></div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Usuários de exemplo</div><div className="font-display text-2xl font-bold text-brand-navy">{estado.data.usuarios.filter((usuario) => usuario.cadastrado).length} / {estado.data.usuarios.length}</div></div>
            </div>

            <Cartao titulo="Popular o banco" icone={<Database size={16} aria-hidden />}>
              {!estado.data.senhaConfigurada && (
                <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Falta <code>DEV_TOOLS_SENHA</code> em <code>infra/.env</code>: sem ela a API não cria os usuários de exemplo.</p>
              )}
              <p className="mb-4 text-sm text-slate-600">
                Cria, se ainda não existirem, 3 organizações e 10 usuários de exemplo (um por perfil), e adiciona chamados variados nos 6 tipos, com prioridades e status diferentes e aberturas espalhadas nos últimos 5 dias. Pode rodar mais de uma vez: os usuários não se repetem, os chamados se acumulam.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Quantidade de chamados
                  <input type="number" min={1} max={LIMITE_POR_VEZ} value={quantidade} onChange={(evento) => setQuantidade(Number(evento.target.value))} className="alvo-toque mt-1 block w-32 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 sm:pb-2">
                  <input type="checkbox" checked={enriquecer} onChange={(evento) => setEnriquecer(evento.target.checked)} />
                  Gerar também acionamento de fornecedor, transferência e override nos chamados já triados
                </label>
              </div>
              {!quantidadeValida && <p className="mt-2 text-xs text-red-600">Use um número entre 1 e {LIMITE_POR_VEZ}.</p>}
              {populacao.isError && <div className="mt-3"><AvisoDeErro erro={populacao.error} /></div>}
              <button type="button" disabled={!quantidadeValida || ocupado || !estado.data.senhaConfigurada} onClick={() => populacao.mutate()} className="alvo-toque mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                <Database size={14} aria-hidden /> {populacao.isPending ? "Populando…" : "Popular banco"}
              </button>
            </Cartao>

            <Cartao titulo="Usuários de exemplo" icone={<Check size={16} aria-hidden />}>
              <p className="mb-3 text-sm text-slate-600">Todos usam a senha definida em <code>DEV_TOOLS_SENHA</code> no <code>infra/.env</code>.</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="py-2 pr-3">E-mail</th><th className="py-2 pr-3">Perfil</th><th className="py-2 pr-3">Vínculo</th><th className="py-2">Situação</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {estado.data.usuarios.map((usuario) => (
                      <tr key={usuario.email}>
                        <td className="py-2 pr-3"><div className="font-medium text-brand-dark">{usuario.email}</div><div className="text-xs text-slate-400">{usuario.nome}</div></td>
                        <td className="py-2 pr-3 text-slate-600">{usuario.perfis.join(", ")}</td>
                        <td className="py-2 pr-3 text-slate-600">{[usuario.organizacao, ...usuario.departamentos].filter(Boolean).join(", ") || "—"}</td>
                        <td className="py-2">{usuario.cadastrado ? <span className="font-semibold text-emerald-700">Cadastrado</span> : <span className="text-slate-400">Não cadastrado</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Cartao>

            <Cartao titulo="Limpar" icone={<Eraser size={16} aria-hidden />}>
              {limpezaDoBanco.isError && <div className="mb-3"><AvisoDeErro erro={limpezaDoBanco.error} /></div>}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-red-100 p-4">
                  <p className="mb-3 text-sm text-slate-600">Apaga do banco os chamados abertos pelos usuários de exemplo, os próprios usuários e as organizações de exemplo. O ADMIN e os dados criados por outros usuários ficam.</p>
                  {confirmandoLimpeza === "banco" ? (
                    <div className="flex gap-2">
                      <button type="button" disabled={ocupado} onClick={() => limpezaDoBanco.mutate()} className="alvo-toque rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Confirmar exclusão</button>
                      <button type="button" onClick={() => setConfirmandoLimpeza(null)} className="alvo-toque rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancelar</button>
                    </div>
                  ) : (
                    <button type="button" disabled={ocupado} onClick={() => setConfirmandoLimpeza("banco")} className="alvo-toque inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
                      <Trash size={14} aria-hidden /> Apagar dados de exemplo do banco
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-3 text-sm text-slate-600">Apaga os rascunhos salvos neste navegador. Você continua logado.</p>
                  {confirmandoLimpeza === "navegador" ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { apagarDadosDoNavegador(); void aposMudanca(["Rascunhos deste navegador apagados."]); }} className="alvo-toque rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Confirmar</button>
                      <button type="button" onClick={() => setConfirmandoLimpeza(null)} className="alvo-toque rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancelar</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmandoLimpeza("navegador")} className="alvo-toque inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                      <Eraser size={14} aria-hidden /> Limpar rascunhos do navegador
                    </button>
                  )}
                </div>
              </div>
            </Cartao>
          </>
        )}
      </div>
    </main>
  );
}

export default function FerramentasDeDesenvolvimento() {
  return <PerfilRequerido perfis={["ADMIN"]}><ConteudoDasFerramentas /></PerfilRequerido>;
}
