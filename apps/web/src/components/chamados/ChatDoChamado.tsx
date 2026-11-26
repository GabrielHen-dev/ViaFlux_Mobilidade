"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Paperclip, Send, Truck } from "lucide-react";
import { toast } from "sonner";
import type { Chamado, EventoTimeline, Mensagem } from "@/types/chamado";
import IconeDoEvento from "@/components/ui/IconeDoEvento";
import type { DadosArquivoNaConversa, DadosAtualizacao } from "@/services/api/contratos";
import { enviarArquivoNaConversa, marcarConversaComoLida, registrarAtualizacao } from "@/services/api/chamados";
import { chaves, useAcaoNoChamado, useConversa } from "@/hooks/consultas";
import { useRascunho } from "@/hooks/useRascunho";
import { BotaoDeDownload } from "@/components/chamados/AnexosDoChamado";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { useApi, useUsuarioAutenticado } from "@/store/AuthContext";
import { EXTENSOES_PERMITIDAS, formatarTamanho, motivoDeRejeicao } from "@/utils/anexos";
import { formatarDataHora } from "@/utils/date";
import { gerarId } from "@/utils/id";
import { cn } from "@/utils/cn";

const LIMITE_DO_TEXTO = 5000;
const DISTANCIA_PARA_ACOMPANHAR_O_FIM_PX = 48;

type Destino = "SOLICITANTE" | "INTERNO" | "FORNECEDOR";

const RASCUNHO_VAZIO: { texto: string; destino: Destino } = { texto: "", destino: "SOLICITANTE" };

interface Props {
  chamado: Chamado;
  visaoDeCliente?: boolean;
  somenteLeitura?: boolean;
  eventos?: EventoTimeline[];
}


function EventoNoFeed({ evento, visaoDeCliente }: { evento: EventoTimeline; visaoDeCliente: boolean }) {
  return (
    <li className="flex gap-3">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white", evento.tipo === "SLA" ? "border-orange-200 text-orange-600" : "border-linha text-tinta-suave")} aria-hidden>
        <IconeDoEvento tipo={evento.tipo} size={14} />
      </span>
      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-tinta">{evento.acao}</span>
          {!visaoDeCliente && (
            <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", evento.visivelCliente ? "bg-[var(--vf-sucesso-fundo)] text-[var(--vf-sucesso)]" : "bg-slate-100 text-tinta-apagada")}>
              {evento.visivelCliente ? <Eye size={10} aria-hidden /> : <EyeOff size={10} aria-hidden />}
              {evento.visivelCliente ? "Público" : "Só equipe"}
            </span>
          )}
        </div>
        <p className="text-xs text-tinta-apagada">
          <time dateTime={evento.ocorridoEm}>{formatarDataHora(evento.ocorridoEm)}</time> · {evento.autor?.nome ?? "Sistema"}
        </p>
        {evento.detalhe && <p className="mt-0.5 break-words text-xs text-tinta-suave">{evento.detalhe}</p>}
      </div>
    </li>
  );
}

function posterior(data: string, referencia: string) {
  return new Date(data).getTime() > new Date(referencia).getTime();
}

function identificacaoDoAutor(mensagem: Mensagem, minha: boolean, visaoDeCliente: boolean) {
  if (minha) return "Você";
  const nome = mensagem.autor?.nome ?? "Sistema";
  if (visaoDeCliente) return mensagem.origem === "EQUIPE" ? `${nome} · Equipe ViaFlux` : nome;
  return mensagem.origem === "SOLICITANTE" ? `${nome} · Solicitante` : nome;
}

function BalaoDaMensagem({ codigo, mensagem, minha, visaoDeCliente }: { codigo: string; mensagem: Mensagem; minha: boolean; visaoDeCliente: boolean }) {
  const interna = !mensagem.visivelCliente;
  return (
    <li className={cn("flex", minha ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
        interna ? "border border-amber-200 bg-amber-50 text-amber-950" : minha ? "bg-acao text-white" : "bg-slate-100 text-brand-dark",
      )}>
        <p className={cn("mb-0.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold", !interna && minha ? "text-white/90" : "text-slate-600")}>
          {identificacaoDoAutor(mensagem, minha, visaoDeCliente)}
          {interna && mensagem.visibilidade === "FORNECEDOR" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sky-800">
              <Truck size={10} aria-hidden /> Fornecedor
            </span>
          )}
          {interna && mensagem.visibilidade !== "FORNECEDOR" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-900">
              <EyeOff size={10} aria-hidden /> Interno
            </span>
          )}
        </p>
        <p className="whitespace-pre-wrap break-words">{mensagem.texto}</p>
        {mensagem.anexo && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-600">
            <span className="min-w-0 break-all">{mensagem.anexo.nome} · {formatarTamanho(mensagem.anexo.tamanho)}</span>
            <BotaoDeDownload codigo={codigo} anexo={mensagem.anexo} />
          </div>
        )}
        <time dateTime={mensagem.enviadaEm} className={cn("mt-1 block text-[11px]", !interna && minha ? "text-white/75" : "text-slate-500")}>
          {formatarDataHora(mensagem.enviadaEm)}
        </time>
      </div>
    </li>
  );
}

export default function ChatDoChamado({ chamado, visaoDeCliente = false, somenteLeitura = false, eventos }: Props) {
  const api = useApi();
  const usuario = useUsuarioAutenticado();
  const clienteDeConsultas = useQueryClient();
  const conversa = useConversa(chamado.id);
  const { valor: rascunho, setValor: setRascunho, descartar } = useRascunho(`conversa:${usuario.id}:${chamado.id}`, RASCUNHO_VAZIO);
  const { texto, destino } = rascunho;
  const [marcoDeLeitura, setMarcoDeLeitura] = useState<{ lidoAte: string | null } | null>(null);
  const lista = useRef<HTMLOListElement>(null);
  const seletorDeArquivo = useRef<HTMLInputElement>(null);
  const acompanhandoOFim = useRef(true);
  const quantidadeAnterior = useRef<number | null>(null);
  const [mostrarNotas, setMostrarNotas] = useState(true);

  const dados = conversa.data;
  const todasAsMensagens = dados?.mensagens ?? [];
  const quantidade = todasAsMensagens.length;
  const mensagens = visaoDeCliente || mostrarNotas ? todasAsMensagens : todasAsMensagens.filter((mensagem) => mensagem.visivelCliente);
  const fechado = chamado.status === "Fechado";
  const cancelado = chamado.status === "Cancelado";
  const podeEnviar = !somenteLeitura && !fechado && !cancelado;
  const temFornecedor = !visaoDeCliente && chamado.servico !== null && chamado.servico !== undefined;
  const destinoEfetivo: Destino = destino === "FORNECEDOR" && !temFornecedor ? "SOLICITANTE" : destino;
  const interna = !visaoDeCliente && destinoEfetivo === "INTERNO";
  const paraFornecedor = !visaoDeCliente && destinoEfetivo === "FORNECEDOR";
  const visivelCliente = !interna && !paraFornecedor;

  if (marcoDeLeitura === null && dados) setMarcoDeLeitura({ lidoAte: dados.lidoAte });

  const envio = useAcaoNoChamado(chamado.id, (cliente, corpo: DadosAtualizacao) => registrarAtualizacao(cliente, chamado.id, corpo));
  const envioDeArquivo = useAcaoNoChamado(chamado.id, (cliente, corpo: DadosArquivoNaConversa) => enviarArquivoNaConversa(cliente, chamado.id, corpo, gerarId()));
  const ocupado = envio.isPending || envioDeArquivo.isPending;
  const leitura = useMutation({
    mutationFn: (ate: string) => marcarConversaComoLida(api, chamado.id, ate),
    onSuccess: () => {
      void clienteDeConsultas.invalidateQueries({ queryKey: chaves.conversa(chamado.id) });
      void clienteDeConsultas.invalidateQueries({ queryKey: chaves.notificacoes });
    },
  });
  const lerAte = leitura.mutate;

  const ultimaDeOutros = [...todasAsMensagens].reverse().find((mensagem) => mensagem.autor?.id !== usuario.id);
  const pendenteDeLeitura = ultimaDeOutros && (!dados?.lidoAte || posterior(ultimaDeOutros.enviadaEm, dados.lidoAte)) ? ultimaDeOutros.enviadaEm : null;
  const marcoAnterior = marcoDeLeitura?.lidoAte ?? null;
  const primeiraNova = marcoAnterior === null
    ? undefined
    : todasAsMensagens.find((mensagem) => mensagem.autor?.id !== usuario.id && posterior(mensagem.enviadaEm, marcoAnterior))?.id;

  useEffect(() => {
    if (!pendenteDeLeitura) return;
    const marcarSeVisivel = () => { if (document.visibilityState === "visible") lerAte(pendenteDeLeitura); };
    marcarSeVisivel();
    document.addEventListener("visibilitychange", marcarSeVisivel);
    return () => document.removeEventListener("visibilitychange", marcarSeVisivel);
  }, [pendenteDeLeitura, lerAte]);

  useEffect(() => {
    if (!dados) return;
    if (quantidadeAnterior.current !== null && quantidade > quantidadeAnterior.current) {
      void clienteDeConsultas.invalidateQueries({ queryKey: chaves.detalhe(chamado.id) });
    }
    quantidadeAnterior.current = quantidade;
    if (acompanhandoOFim.current && lista.current) lista.current.scrollTop = lista.current.scrollHeight;
  }, [dados, quantidade, clienteDeConsultas, chamado.id]);

  function acompanharRolagem() {
    const elemento = lista.current;
    if (!elemento) return;
    acompanhandoOFim.current = elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight < DISTANCIA_PARA_ACOMPANHAR_O_FIM_PX;
  }

  function enviarTexto() {
    const conteudo = texto.trim();
    if (!conteudo || ocupado) return;
    envio.mutate({ texto: conteudo, visivelCliente, ...(paraFornecedor ? { destino: "FORNECEDOR" as const } : {}) }, {
      onSuccess: () => {
        acompanhandoOFim.current = true;
        descartar({ texto: "", destino });
      },
      onError: (erro) => toast.error("Não foi possível enviar a mensagem", { description: mensagemDeErro(erro) }),
    });
  }

  function aoTeclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault();
      enviarTexto();
    }
  }

  function enviarArquivo(arquivo: File) {
    if (seletorDeArquivo.current) seletorDeArquivo.current.value = "";
    const rejeicao = motivoDeRejeicao(arquivo);
    if (rejeicao) {
      toast.error(rejeicao.mensagem);
      return;
    }
    envioDeArquivo.mutate({ arquivo, texto: texto.trim(), visivelCliente }, {
      onSuccess: () => {
        acompanhandoOFim.current = true;
        descartar({ texto: "", destino });
      },
      onError: (erro) => toast.error("Não foi possível enviar o arquivo", { description: mensagemDeErro(erro) }),
    });
  }

  const compositor = podeEnviar ? (
        <div className={cn("border-t p-3", interna ? "border-amber-200 bg-amber-50" : paraFornecedor ? "border-sky-200 bg-sky-50" : "border-linha bg-fundo")}>
          {!visaoDeCliente && (
            <div role="radiogroup" aria-label="Destino da mensagem" className="-mx-3 -mt-3 mb-3 flex border-b border-linha px-2">
              <button type="button" role="radio" aria-checked={!interna && !paraFornecedor} disabled={ocupado} onClick={() => setRascunho((atual) => ({ ...atual, destino: "SOLICITANTE" }))} className="vf-aba alvo-toque px-3 py-2.5">
                Para o solicitante
              </button>
              <button type="button" role="radio" aria-checked={interna} disabled={ocupado} onClick={() => setRascunho((atual) => ({ ...atual, destino: "INTERNO" }))} className="vf-aba alvo-toque px-3 py-2.5">
                Nota interna
              </button>
              {temFornecedor && (
                <button type="button" role="radio" aria-checked={paraFornecedor} disabled={ocupado} onClick={() => setRascunho((atual) => ({ ...atual, destino: "FORNECEDOR" }))} className="vf-aba alvo-toque px-3 py-2.5">
                  Fornecedor
                </button>
              )}
            </div>
          )}
          <label htmlFor={`nova-mensagem-${chamado.id}`} className="sr-only">{interna ? "Escrever nota interna" : paraFornecedor ? "Escrever mensagem ao fornecedor" : "Escrever mensagem"}</label>
          <textarea
            id={`nova-mensagem-${chamado.id}`}
            rows={2}
            maxLength={LIMITE_DO_TEXTO}
            value={texto}
            readOnly={envioDeArquivo.isPending}
            onChange={(evento) => { const novoTexto = evento.target.value; setRascunho((atual) => ({ ...atual, texto: novoTexto })); }}
            onKeyDown={aoTeclar}
            placeholder={interna ? "Escreva uma nota para a equipe" : paraFornecedor ? "Escreva uma mensagem para o fornecedor" : "Escreva sua mensagem"}
            className="w-full resize-none rounded-lg border border-linha bg-white px-3.5 py-2.5 text-sm text-brand-dark outline-none transition-all focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className={cn("min-w-0 flex-1 basis-48 text-xs", interna ? "text-amber-900" : paraFornecedor ? "text-sky-900" : "text-slate-500")}>
              {interna ? "Só a equipe vê esta nota. Ninguém é avisado." : paraFornecedor ? "Só a equipe e o fornecedor acionado veem esta mensagem." : visaoDeCliente ? "A equipe recebe um aviso da sua mensagem." : "O solicitante recebe um aviso. A mensagem conta como início do atendimento."}
            </p>
            <div className="flex items-center gap-2">
              <input
                ref={seletorDeArquivo}
                type="file"
                accept={EXTENSOES_PERMITIDAS}
                className="sr-only"
                tabIndex={-1}
                aria-label="Selecionar arquivo da mensagem"
                onChange={(evento) => { const arquivo = evento.target.files?.[0]; if (arquivo) enviarArquivo(arquivo); }}
              />
              <button type="button" disabled={ocupado || paraFornecedor} onClick={() => seletorDeArquivo.current?.click()} className="alvo-toque inline-flex items-center gap-1.5 rounded-xl border border-linha bg-white px-3 py-2 text-sm font-semibold text-[#475569] disabled:opacity-40">
                <Paperclip size={14} aria-hidden /> {envioDeArquivo.isPending ? "Enviando…" : "Anexar"}
              </button>
              <button type="button" disabled={!texto.trim() || ocupado} onClick={enviarTexto} className={cn("alvo-toque inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40", interna ? "bg-amber-600" : "vf-botao-primario")}>
                <Send size={14} aria-hidden /> {interna ? "Salvar nota" : paraFornecedor ? "Enviar ao fornecedor" : visaoDeCliente ? "Enviar" : "Enviar ao solicitante"}
              </button>
            </div>
          </div>
        </div>
  ) : null;

  const avisos = (
    <>
      {fechado && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          {visaoDeCliente ? "Chamado fechado. Reabra o chamado para continuar a conversa." : "Chamado fechado. A conversa volta a funcionar se o solicitante reabrir o chamado."}
        </p>
      )}
      {cancelado && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Chamado cancelado. A conversa volta a funcionar quando o chamado for reaberto.</p>
      )}
      {!fechado && !cancelado && somenteLeitura && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Seu perfil só acompanha esta conversa.</p>}

    </>
  );

  const historico = eventos ? [...eventos].sort((a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime()) : null;

  return (
    <>
      <section className="vf-cartao overflow-hidden" aria-labelledby={`conversa-${chamado.id}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linha px-4 py-3">
          <h2 id={`conversa-${chamado.id}`} className="text-sm font-medium text-tinta">Conversa</h2>
          {!visaoDeCliente && (
            <label className="flex items-center gap-1.5 text-xs text-tinta-suave">
              <input type="checkbox" className="accent-acao" checked={mostrarNotas} onChange={(evento) => setMostrarNotas(evento.target.checked)} />
              Mostrar notas internas
            </label>
          )}
        </div>
        <div className="bg-fundo/60 px-4">
          {!dados && conversa.isPending && <p className="py-4 text-xs text-tinta-apagada">Carregando conversa…</p>}
          {conversa.isError && <p role="alert" className="pt-3 text-xs text-red-600">Não foi possível atualizar a conversa. Vamos tentar de novo em instantes.</p>}
          {dados && mensagens.length === 0 && (
            <p className="py-6 text-center text-xs text-tinta-apagada">
              {podeEnviar ? "Nenhuma mensagem ainda. Escreva abaixo para começar a conversa." : "Nenhuma mensagem nesta conversa."}
            </p>
          )}
          {mensagens.length > 0 && (
            <ol ref={lista} onScroll={acompanharRolagem} role="log" aria-live="polite" aria-label="Mensagens do chamado" tabIndex={0} className="max-h-96 space-y-3 overflow-y-auto py-4 pr-1">
              {mensagens.map((mensagem) => (
                <Fragment key={mensagem.id}>
                  {mensagem.id === primeiraNova && (
                    <li className="flex items-center gap-2 text-[11px] font-medium text-acao">
                      <span className="h-px flex-1 bg-blue-200" aria-hidden /> Novas mensagens <span className="h-px flex-1 bg-blue-200" aria-hidden />
                    </li>
                  )}
                  <BalaoDaMensagem codigo={chamado.id} mensagem={mensagem} minha={mensagem.autor?.id === usuario.id} visaoDeCliente={visaoDeCliente} />
                </Fragment>
              ))}
            </ol>
          )}
          {(fechado || cancelado || somenteLeitura) && <div className="pb-4 [&>p]:mt-0">{avisos}</div>}
        </div>
        {compositor}
      </section>

      {historico && (
        <section className="vf-cartao" aria-labelledby={`historico-${chamado.id}`}>
          <div className="border-b border-linha px-4 py-3">
            <h2 id={`historico-${chamado.id}`} className="text-sm font-medium text-tinta">Histórico</h2>
          </div>
          <div className="p-4">
            {historico.length === 0 ? (
              <p className="rounded bg-fundo p-4 text-center text-xs text-tinta-apagada">Nenhuma alteração registrada.</p>
            ) : (
              <ol aria-label="Histórico do chamado" tabIndex={0} className="max-h-96 space-y-3 overflow-y-auto pr-1">
                {historico.map((evento) => <EventoNoFeed key={`e-${evento.id}`} evento={evento} visaoDeCliente={visaoDeCliente} />)}
              </ol>
            )}
          </div>
        </section>
      )}
    </>
  );
}
