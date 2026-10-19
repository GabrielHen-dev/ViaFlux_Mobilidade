"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Check, ChevronLeft, CircleAlert, FileText, RotateCcw, X } from "lucide-react";
import type { Chamado, Localizacao, Motivo, TipoChamado } from "@/types/chamado";
import { abrirChamado, enviarAnexo } from "@/services/api/chamados";
import { ErroApi } from "@/services/api/cliente";
import { useApi, useUsuarioAutenticado } from "@/store/AuthContext";
import { invalidarListas, useContextos, useMotivos } from "@/hooks/consultas";
import { useRascunho } from "@/hooks/useRascunho";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import SeletorDeArquivos from "@/components/forms/SeletorDeArquivos";
import CampoDeLocalizacao from "@/components/forms/CampoDeLocalizacao";
import { PrioridadeIndicador } from "@/components/ui/StatusBadge";
import { NOME_TIPO } from "@/utils/prioridade";
import { formatarDataHora } from "@/utils/date";
import { formatarTamanho } from "@/utils/anexos";
import { gerarId } from "@/utils/id";
import { PERFIS_DE_CLIENTE, PERFIS_QUE_ABREM_PELA_CENTRAL, usuarioTemPerfil } from "@/utils/perfis";
import SeletorDeSolicitante from "@/components/forms/SeletorDeSolicitante";

const esquemaDeAbertura = z.object({
  solicitanteId: z.string(),
  cliente: z.string().trim().min(1, "Informe o nome do solicitante.").max(150, "Use no máximo 150 caracteres."),
  telefone: z.string().trim().max(30, "Use no máximo 30 caracteres."),
  motivoId: z.string().min(1, "Selecione o motivo da solicitação."),
  contextoId: z.string().min(1, "Selecione o contexto situacional."),
  descricao: z.string().trim().min(10, "Descreva o problema com pelo menos 10 caracteres."),
  modelo: z.string().trim().max(120, "Use no máximo 120 caracteres."),
  placa: z.string().trim().max(20, "Use no máximo 20 caracteres."),
  endereco: z.string().trim().max(255, "Use no máximo 255 caracteres."),
});

const esquemaDaCentral = esquemaDeAbertura.extend({
  solicitanteId: z.string().min(1, "Selecione o cliente solicitante."),
});

type CampoDoFormulario = keyof z.infer<typeof esquemaDeAbertura>;

const ROTULO_DO_CAMPO: Record<CampoDoFormulario, string> = {
  solicitanteId: "Cliente solicitante",
  cliente: "Nome do solicitante",
  telefone: "Telefone",
  motivoId: "Motivo",
  contextoId: "Contexto situacional",
  descricao: "Descrição",
  modelo: "Modelo do veículo",
  placa: "Placa",
  endereco: "Localização",
};

const ID_DO_CAMPO: Record<CampoDoFormulario, string> = {
  solicitanteId: "novo-solicitante",
  cliente: "novo-cliente",
  telefone: "novo-telefone",
  motivoId: "novo-motivo",
  contextoId: "novo-contexto",
  descricao: "novo-descricao",
  modelo: "novo-modelo",
  placa: "novo-placa",
  endereco: "novo-localizacao",
};

interface CamposDoRascunho {
  solicitanteId: string;
  cliente: string;
  telefone: string;
  motivoId: string;
  contextoId: string;
  descricao: string;
  modelo: string;
  placa: string;
  localizacao: Localizacao;
}

interface Rascunho {
  campos: CamposDoRascunho;
  chaveIdempotencia: string;
}

interface ArquivoPendente {
  id: string;
  arquivo: File;
  situacao: "pendente" | "enviando" | "enviado" | "falhou";
  erro?: string;
}

const labelClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5";
const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all aria-[invalid=true]:border-red-400";

function rascunhoVazio(nome: string): Rascunho {
  return {
    campos: { solicitanteId: "", cliente: nome, telefone: "", motivoId: "", contextoId: "", descricao: "", modelo: "", placa: "", localizacao: { endereco: "", latitude: null, longitude: null } },
    chaveIdempotencia: gerarId(),
  };
}

function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">
      <h2 className="mb-5 flex items-center gap-2 font-display text-sm font-semibold text-brand-navy">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EFF6FF] text-xs font-bold text-brand-blue">{numero}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function ErroDoCampo({ campo, erros }: { campo: CampoDoFormulario; erros: Partial<Record<CampoDoFormulario, string>> }) {
  const mensagem = erros[campo];
  return mensagem ? <p id={`${ID_DO_CAMPO[campo]}-erro`} className="mt-1 text-xs font-medium text-red-600">{mensagem}</p> : null;
}

function Confirmacao({ chamado, arquivos, aoReenviarAnexos, aoNovoChamado, ehCliente }: {
  chamado: Chamado;
  arquivos: ArquivoPendente[];
  aoReenviarAnexos: () => void;
  aoNovoChamado: () => void;
  ehCliente: boolean;
}) {
  const falhas = arquivos.filter((item) => item.situacao === "falhou");
  const destino = ehCliente ? `/portal/chamados/${chamado.id}` : `/chamados/${chamado.id}`;
  return (
    <main id="conteudo" className="flex min-h-[70vh] items-center justify-center p-4 md:min-h-screen md:p-8">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm md:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5]">
          <Check size={32} color="#10B981" strokeWidth={2.5} aria-hidden />
        </div>
        <h2 className="mb-2 font-display text-xl font-bold text-brand-navy">Chamado aberto!</h2>
        <p className="mb-1 text-sm text-[#64748B]">Abertura confirmada pelo servidor. Guarde o protocolo:</p>
        <p className="mb-4 text-2xl font-bold text-brand-blue" data-testid="protocolo">{chamado.id}</p>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} />
          {chamado.departamento && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{chamado.departamento.nome}</span>}
        </div>
        {chamado.sla && (
          <p className="mb-4 text-xs text-[#64748B]">
            1ª resposta até {formatarDataHora(chamado.sla.primeiraResposta.limite)} · resolução até {formatarDataHora(chamado.sla.resolucao.limite)}
          </p>
        )}
        {arquivos.length > 0 && (
          <div className="mb-6 rounded-xl bg-slate-50 p-3 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Anexos</p>
            <ul className="space-y-1 text-xs">
              {arquivos.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2">
                  <span className="break-all text-slate-600">{item.arquivo.name}</span>
                  <span className={item.situacao === "falhou" ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>
                    {item.situacao === "enviado" ? "Enviado" : item.situacao === "falhou" ? "Não enviado" : "Enviando…"}
                  </span>
                </li>
              ))}
            </ul>
            {falhas.length > 0 && (
              <button type="button" onClick={aoReenviarAnexos} className="alvo-toque mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white py-2 text-xs font-semibold text-red-700">
                <RotateCcw size={12} aria-hidden /> Tentar enviar os anexos de novo
              </button>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={destino} className="alvo-toque flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-semibold text-[#475569] transition-colors hover:bg-brand-light">
            Acompanhar chamado
          </Link>
          <button type="button" onClick={aoNovoChamado} className="alvo-toque flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Novo chamado
          </button>
        </div>
      </div>
    </main>
  );
}

export default function NovoChamado() {
  const api = useApi();
  const usuario = useUsuarioAutenticado();
  const clienteDeConsultas = useQueryClient();
  const ehCliente = usuarioTemPerfil(usuario, PERFIS_DE_CLIENTE);
  const abrePelaCentral = !ehCliente && usuarioTemPerfil(usuario, PERFIS_QUE_ABREM_PELA_CENTRAL);
  const nomeInicial = abrePelaCentral ? "" : usuario.nome;
  const { valor: rascunho, setValor: setRascunho, restaurado, descartar } = useRascunho<Rascunho>("novo-chamado", rascunhoVazio(nomeInicial));
  const campos = rascunho.campos;
  const [arquivos, setArquivos] = useState<ArquivoPendente[]>([]);
  const [erros, setErros] = useState<Partial<Record<CampoDoFormulario, string>>>({});
  const [falhaDoEnvio, setFalhaDoEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [criado, setCriado] = useState<Chamado | null>(null);
  const resumoDosErros = useRef<HTMLDivElement>(null);
  const avisoDeFalha = useRef<HTMLDivElement>(null);

  const motivos = useMotivos();
  const motivoSelecionado = motivos.data?.find((motivo) => motivo.id === campos.motivoId) ?? null;
  const contextos = useContextos(motivoSelecionado?.tipo ?? null);
  const listaDeMotivos = motivos.data;
  const motivosPorTipo = useMemo(() => {
    const grupos = new Map<TipoChamado, Motivo[]>();
    for (const motivo of listaDeMotivos ?? []) grupos.set(motivo.tipo, [...(grupos.get(motivo.tipo) ?? []), motivo]);
    return [...grupos.entries()];
  }, [listaDeMotivos]);

  function alterar<Campo extends keyof CamposDoRascunho>(campo: Campo, valor: CamposDoRascunho[Campo]) {
    setRascunho((anterior) => ({ ...anterior, campos: { ...anterior.campos, [campo]: valor } }));
    setErros((anteriores) => ({ ...anteriores, [campo === "localizacao" ? "endereco" : campo]: undefined }));
  }

  function aoEscolherMotivo(motivoId: string) {
    const novoTipo = motivos.data?.find((motivo) => motivo.id === motivoId)?.tipo;
    setRascunho((anterior) => ({
      ...anterior,
      campos: { ...anterior.campos, motivoId, contextoId: novoTipo === motivoSelecionado?.tipo ? anterior.campos.contextoId : "" },
    }));
    setErros((anteriores) => ({ ...anteriores, motivoId: undefined }));
  }

  async function enviarAnexos(codigo: string, pendentes: ArquivoPendente[]) {
    for (const item of pendentes) {
      setArquivos((lista) => lista.map((atual) => (atual.id === item.id ? { ...atual, situacao: "enviando", erro: undefined } : atual)));
      try {
        await enviarAnexo(api, codigo, item.arquivo, item.id);
        setArquivos((lista) => lista.map((atual) => (atual.id === item.id ? { ...atual, situacao: "enviado" } : atual)));
      } catch (erro) {
        setArquivos((lista) => lista.map((atual) => (atual.id === item.id ? { ...atual, situacao: "falhou", erro: mensagemDeErro(erro) } : atual)));
      }
    }
    void invalidarListas(clienteDeConsultas);
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setFalhaDoEnvio(null);
    const validacao = (abrePelaCentral ? esquemaDaCentral : esquemaDeAbertura).safeParse({ ...campos, endereco: campos.localizacao.endereco });
    if (!validacao.success) {
      const encontrados: Partial<Record<CampoDoFormulario, string>> = {};
      for (const problema of validacao.error.issues) {
        const campo = problema.path[0] as CampoDoFormulario;
        encontrados[campo] ??= problema.message;
      }
      setErros(encontrados);
      queueMicrotask(() => resumoDosErros.current?.focus());
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const dados = validacao.data;
      const informouLocalizacao = dados.endereco !== "" || campos.localizacao.latitude !== null;
      const chamado = await abrirChamado(api, {
        solicitanteId: abrePelaCentral ? dados.solicitanteId : undefined,
        motivoId: dados.motivoId,
        contextoId: dados.contextoId,
        descricao: dados.descricao,
        cliente: dados.cliente,
        telefone: dados.telefone,
        modelo: dados.modelo,
        placa: dados.placa.toUpperCase(),
        localizacao: informouLocalizacao ? { ...campos.localizacao, endereco: dados.endereco } : null,
      }, rascunho.chaveIdempotencia);
      setCriado(chamado);
      descartar(rascunhoVazio(nomeInicial));
      void invalidarListas(clienteDeConsultas);
      await enviarAnexos(chamado.id, arquivos);
    } catch (erro) {
      if (erro instanceof ErroApi && Object.keys(erro.campos).length > 0) {
        setErros(erro.campos as Partial<Record<CampoDoFormulario, string>>);
      }
      setFalhaDoEnvio(mensagemDeErro(erro));
      queueMicrotask(() => avisoDeFalha.current?.focus());
    } finally {
      setEnviando(false);
    }
  }

  if (criado) {
    return (
      <Confirmacao
        chamado={criado}
        arquivos={arquivos}
        ehCliente={ehCliente}
        aoReenviarAnexos={() => void enviarAnexos(criado.id, arquivos.filter((item) => item.situacao === "falhou"))}
        aoNovoChamado={() => { setCriado(null); setArquivos([]); }}
      />
    );
  }

  const listaDeErros = Object.entries(erros).filter(([, mensagem]) => mensagem) as [CampoDoFormulario, string][];
  const ariaDoCampo = (campo: CampoDoFormulario) => ({
    id: ID_DO_CAMPO[campo],
    "aria-invalid": erros[campo] ? true : undefined,
    "aria-describedby": erros[campo] ? `${ID_DO_CAMPO[campo]}-erro` : undefined,
  });

  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href={ehCliente ? "/portal" : "/"} aria-label="Voltar" className="alvo-toque flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-all hover:border-[#CBD5E1] hover:bg-white">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">Novo Chamado</h1>
            <p className="text-sm text-[#64748B]">O protocolo é gerado quando o servidor confirmar a abertura.</p>
          </div>
        </div>

        {restaurado && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span>Recuperamos o rascunho que você estava preenchendo. Anexos precisam ser selecionados de novo.</span>
            <button type="button" onClick={() => descartar(rascunhoVazio(nomeInicial))} className="text-xs font-semibold underline">Descartar rascunho</button>
          </div>
        )}

        {falhaDoEnvio && (
          <div ref={avisoDeFalha} tabIndex={-1} role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none">
            <p className="flex items-center gap-2 font-semibold"><CircleAlert size={16} aria-hidden /> Envio não confirmado: a abertura não foi registrada.</p>
            <p className="mt-1">{falhaDoEnvio} Seus dados continuam preenchidos. Use “Tentar de novo”, sem risco de duplicar o chamado.</p>
          </div>
        )}

        {listaDeErros.length > 0 && (
          <div ref={resumoDosErros} tabIndex={-1} role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none">
            <p className="font-semibold">Corrija os campos antes de enviar:</p>
            <ul className="mt-1 list-disc pl-5">
              {listaDeErros.map(([campo, mensagem]) => (
                <li key={campo}><a href={`#${ID_DO_CAMPO[campo]}`} className="underline">{ROTULO_DO_CAMPO[campo]}</a>: {mensagem}</li>
              ))}
            </ul>
          </div>
        )}

        <form noValidate onSubmit={aoEnviar} className="space-y-5">
          <Secao numero={1} titulo="O que aconteceu?">
            <div className="space-y-4">
              <div>
                <label htmlFor={ID_DO_CAMPO.motivoId} className={labelClass}>Motivo *</label>
                <select {...ariaDoCampo("motivoId")} className={inputClass} value={campos.motivoId} onChange={(evento) => aoEscolherMotivo(evento.target.value)} disabled={motivos.isPending}>
                  <option value="">{motivos.isPending ? "Carregando motivos…" : "Selecione o motivo"}</option>
                  {motivosPorTipo.map(([tipo, lista]) => (
                    <optgroup key={tipo} label={NOME_TIPO[tipo]}>
                      {lista.map((motivo) => <option key={motivo.id} value={motivo.id}>{motivo.descricao}</option>)}
                    </optgroup>
                  ))}
                </select>
                <ErroDoCampo campo="motivoId" erros={erros} />
                {motivos.isError && <p className="mt-1 text-xs font-medium text-red-600">Não foi possível carregar os motivos. {mensagemDeErro(motivos.error)}</p>}
              </div>
              <div>
                <label htmlFor={ID_DO_CAMPO.contextoId} className={labelClass}>Contexto situacional *</label>
                <select {...ariaDoCampo("contextoId")} className={inputClass} value={campos.contextoId} onChange={(evento) => alterar("contextoId", evento.target.value)} disabled={!motivoSelecionado || contextos.isPending}>
                  <option value="">{motivoSelecionado ? "Selecione a situação atual" : "Escolha o motivo primeiro"}</option>
                  {(contextos.data ?? []).map((contexto) => <option key={contexto.id} value={contexto.id}>{contexto.descricao}</option>)}
                </select>
                <ErroDoCampo campo="contextoId" erros={erros} />
              </div>
              <div>
                <label htmlFor={ID_DO_CAMPO.descricao} className={labelClass}>Descrição *</label>
                <textarea {...ariaDoCampo("descricao")} className={`${inputClass} resize-none`} rows={3} placeholder="Conte o que está acontecendo, com o máximo de detalhes…" value={campos.descricao} onChange={(evento) => alterar("descricao", evento.target.value)} />
                <ErroDoCampo campo="descricao" erros={erros} />
              </div>
            </div>
          </Secao>

          <Secao numero={2} titulo="Solicitante">
            {abrePelaCentral && (
              <div className="mb-4">
                <label htmlFor={ID_DO_CAMPO.solicitanteId} className={labelClass}>Cliente solicitante *</label>
                <SeletorDeSolicitante
                  id={ID_DO_CAMPO.solicitanteId}
                  valor={campos.solicitanteId}
                  selectClassName={inputClass}
                  invalido={Boolean(erros.solicitanteId)}
                  descricaoDoErro={erros.solicitanteId ? `${ID_DO_CAMPO.solicitanteId}-erro` : undefined}
                  aoEscolher={(solicitante) => {
                    setRascunho((anterior) => ({
                      ...anterior,
                      campos: { ...anterior.campos, solicitanteId: solicitante?.id ?? "", cliente: solicitante ? solicitante.organizacao ?? solicitante.nome : anterior.campos.cliente },
                    }));
                    setErros((anteriores) => ({ ...anteriores, solicitanteId: undefined, cliente: undefined }));
                  }}
                />
                <ErroDoCampo campo="solicitanteId" erros={erros} />
                <p className="mt-1 text-xs text-slate-500">O chamado aparece no portal desse cliente, e ele recebe as notificações.</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={ID_DO_CAMPO.cliente} className={labelClass}>Nome *</label>
                <input {...ariaDoCampo("cliente")} className={inputClass} autoComplete="name" value={campos.cliente} onChange={(evento) => alterar("cliente", evento.target.value)} />
                <ErroDoCampo campo="cliente" erros={erros} />
              </div>
              <div>
                <label htmlFor={ID_DO_CAMPO.telefone} className={labelClass}>Telefone</label>
                <input {...ariaDoCampo("telefone")} className={inputClass} type="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={campos.telefone} onChange={(evento) => alterar("telefone", evento.target.value)} />
                <ErroDoCampo campo="telefone" erros={erros} />
              </div>
            </div>
          </Secao>

          <Secao numero={3} titulo="Veículo e local (quando houver)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={ID_DO_CAMPO.modelo} className={labelClass}>Modelo</label>
                <input {...ariaDoCampo("modelo")} className={inputClass} placeholder="Ex: Volvo FH 460" value={campos.modelo} onChange={(evento) => alterar("modelo", evento.target.value)} />
                <ErroDoCampo campo="modelo" erros={erros} />
              </div>
              <div>
                <label htmlFor={ID_DO_CAMPO.placa} className={labelClass}>Placa</label>
                <input {...ariaDoCampo("placa")} className={inputClass} placeholder="ABC-1D23" value={campos.placa} onChange={(evento) => alterar("placa", evento.target.value)} />
                <ErroDoCampo campo="placa" erros={erros} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={ID_DO_CAMPO.endereco} className={labelClass}>Localização</label>
                <CampoDeLocalizacao id={ID_DO_CAMPO.endereco} valor={campos.localizacao} aoAlterar={(localizacao) => alterar("localizacao", localizacao)} inputClassName={inputClass} erro={erros.endereco} />
              </div>
            </div>
          </Secao>

          <Secao numero={4} titulo="Fotos e documentos (opcional)">
            <SeletorDeArquivos aoAceitar={(novos) => setArquivos((lista) => [...lista, ...novos.map((arquivo) => ({ id: gerarId(), arquivo, situacao: "pendente" as const }))])} />
            {arquivos.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {arquivos.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="flex min-w-0 items-center gap-2"><FileText size={14} className="flex-shrink-0" aria-hidden /><span className="break-all">{item.arquivo.name}</span></span>
                    <span className="flex flex-shrink-0 items-center gap-2">
                      {formatarTamanho(item.arquivo.size)}
                      <button type="button" aria-label={`Remover ${item.arquivo.name}`} onClick={() => setArquivos((lista) => lista.filter((atual) => atual.id !== item.id))} className="alvo-toque flex items-center justify-center text-slate-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <button type="submit" disabled={enviando} className="alvo-toque w-full rounded-xl bg-brand-green py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-wait disabled:opacity-60">
            {enviando ? "Enviando…" : falhaDoEnvio ? "Tentar de novo" : "Abrir Chamado"}
          </button>
        </form>
      </div>
    </main>
  );
}
