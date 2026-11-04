"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import type { Chamado, Mensagem } from "@/types/chamado";
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

type Destino = "SOLICITANTE" | "INTERNO";

const RASCUNHO_VAZIO: { texto: string; destino: Destino } = { texto: "", destino: "SOLICITANTE" };

interface Props {
  chamado: Chamado;
  visaoDeCliente?: boolean;
  somenteLeitura?: boolean;
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
        interna ? "border border-amber-200 bg-amber-50 text-amber-950" : minha ? "bg-brand-blue text-white" : "bg-slate-100 text-brand-dark",
      )}>
        <p className={cn("mb-0.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold", !interna && minha ? "text-white/90" : "text-slate-600")}>
          {identificacaoDoAutor(mensagem, minha, visaoDeCliente)}
          {interna && (
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

export default function ChatDoChamado({ chamado, visaoDeCliente = false, somenteLeitura = false }: Props) {
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

  const dados = conversa.data;
  const mensagens = dados?.mensagens ?? [];
  const quantidade = mensagens.length;
  const fechado = chamado.status === "Fechado";
  const podeEnviar = !somenteLeitura && !fechado;
  const interna = !visaoDeCliente && destino === "INTERNO";
  const visivelCliente = !interna;

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

  const ultimaDeOutros = [...mensagens].reverse().find((mensagem) => mensagem.autor?.id !== usuario.id);
  const pendenteDeLeitura = ultimaDeOutros && (!dados?.lidoAte || posterior(ultimaDeOutros.enviadaEm, dados.lidoAte)) ? ultimaDeOutros.enviadaEm : null;
  const marcoAnterior = marcoDeLeitura?.lidoAte ?? null;
  const primeiraNova = marcoAnterior === null
    ? undefined
    : mensagens.find((mensagem) => mensagem.autor?.id !== usuario.id && posterior(mensagem.enviadaEm, marcoAnterior))?.id;

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
    envio.mutate({ texto: conteudo, visivelCliente }, {
      onSuccess: () => {
        acompanhandoOFim.current = true;
        descartar({ texto: "", destino });
      },
      onError: (erro) => toast.error("Não foi possível enviar a mensagem", { description: mensagemDeErro(erro) }),
    });
  }

  function aoTeclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (visaoDeCliente && evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
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

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6" aria-labelledby={`conversa-${chamado.id}`}>
      <h2 id={`conversa-${chamado.id}`} className="mb-4 font-display text-sm font-semibold text-brand-navy">Conversa</h2>

      {!dados && conversa.isPending && <p className="text-xs text-slate-500">Carregando conversa…</p>}
      {conversa.isError && <p role="alert" className="mb-3 text-xs text-red-600">Não foi possível atualizar a conversa. Vamos tentar de novo em instantes.</p>}
      {dados && quantidade === 0 && (
        <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
          {podeEnviar ? "Nenhuma mensagem ainda. Escreva abaixo para começar a conversa." : "Nenhuma mensagem nesta conversa."}
        </p>
      )}
      {quantidade > 0 && (
        <ol ref={lista} onScroll={acompanharRolagem} role="log" aria-live="polite" aria-label="Mensagens do chamado" tabIndex={0} className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {mensagens.map((mensagem) => (
            <Fragment key={mensagem.id}>
              {mensagem.id === primeiraNova && (
                <li className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-blue">
                  <span className="h-px flex-1 bg-blue-200" aria-hidden /> Novas mensagens <span className="h-px flex-1 bg-blue-200" aria-hidden />
                </li>
              )}
              <BalaoDaMensagem codigo={chamado.id} mensagem={mensagem} minha={mensagem.autor?.id === usuario.id} visaoDeCliente={visaoDeCliente} />
            </Fragment>
          ))}
        </ol>
      )}

      {fechado && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          {visaoDeCliente ? "Chamado fechado. Reabra o chamado para continuar a conversa." : "Chamado fechado. A conversa volta a funcionar se o solicitante reabrir o chamado."}
        </p>
      )}
      {!fechado && somenteLeitura && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Seu perfil só acompanha esta conversa.</p>}

      {podeEnviar && (
        <div className={cn("mt-4 rounded-xl border p-3", interna ? "border-amber-200 bg-amber-50" : "border-[#E2E8F0]")}>
          {!visaoDeCliente && (
            <div role="radiogroup" aria-label="Destino da mensagem" className="mb-2 inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
              <button type="button" role="radio" aria-checked={!interna} disabled={ocupado} onClick={() => setRascunho((atual) => ({ ...atual, destino: "SOLICITANTE" }))} className={cn("alvo-toque rounded-md px-3 py-1.5", !interna ? "bg-white text-brand-navy shadow-sm" : "text-slate-600")}>
                Para o solicitante
              </button>
              <button type="button" role="radio" aria-checked={interna} disabled={ocupado} onClick={() => setRascunho((atual) => ({ ...atual, destino: "INTERNO" }))} className={cn("alvo-toque rounded-md px-3 py-1.5", interna ? "bg-amber-200 text-amber-950 shadow-sm" : "text-slate-600")}>
                Nota interna
              </button>
            </div>
          )}
          <label htmlFor={`nova-mensagem-${chamado.id}`} className="sr-only">{interna ? "Escrever nota interna" : "Escrever mensagem"}</label>
          <textarea
            id={`nova-mensagem-${chamado.id}`}
            rows={2}
            maxLength={LIMITE_DO_TEXTO}
            value={texto}
            readOnly={envioDeArquivo.isPending}
            onChange={(evento) => { const novoTexto = evento.target.value; setRascunho((atual) => ({ ...atual, texto: novoTexto })); }}
            onKeyDown={aoTeclar}
            placeholder={interna ? "Escreva uma nota para a equipe" : "Escreva sua mensagem"}
            className="w-full resize-none rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-brand-dark outline-none transition-all focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className={cn("min-w-0 flex-1 basis-48 text-xs", interna ? "text-amber-900" : "text-slate-500")}>
              {interna ? "Só a equipe vê esta nota. Ninguém é avisado." : visaoDeCliente ? "A equipe recebe um aviso da sua mensagem." : "O solicitante recebe um aviso. A mensagem conta como início do atendimento."}
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
              <button type="button" disabled={ocupado} onClick={() => seletorDeArquivo.current?.click()} className="alvo-toque inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#475569] disabled:opacity-40">
                <Paperclip size={14} aria-hidden /> {envioDeArquivo.isPending ? "Enviando…" : "Anexar"}
              </button>
              <button type="button" disabled={!texto.trim() || ocupado} onClick={enviarTexto} className={cn("alvo-toque inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40", interna ? "bg-amber-600" : "bg-brand-green")}>
                <Send size={14} aria-hidden /> {interna ? "Salvar nota" : visaoDeCliente ? "Enviar" : "Enviar ao solicitante"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
