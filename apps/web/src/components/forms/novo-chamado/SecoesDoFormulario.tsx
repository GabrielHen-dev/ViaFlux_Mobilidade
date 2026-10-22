"use client";

import { useMemo, type ReactNode } from "react";
import { FileText, X } from "lucide-react";
import type { Motivo, TipoChamado } from "@/types/chamado";
import { useContextos, useMotivos } from "@/hooks/consultas";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import SeletorDeArquivos from "@/components/forms/SeletorDeArquivos";
import SeletorDeSolicitante from "@/components/forms/SeletorDeSolicitante";
import CampoDeLocalizacao from "@/components/forms/CampoDeLocalizacao";
import { NOME_TIPO } from "@/utils/prioridade";
import { formatarTamanho } from "@/utils/anexos";
import {
  type AlterarCampo, type ArquivoPendente, type CampoDoFormulario, type CamposDoRascunho, type ErrosDoFormulario,
  ID_DO_CAMPO, inputClass, labelClass, propriedadesDoCampo,
} from "@/components/forms/novo-chamado/formulario";

interface PropsDaSecao {
  campos: CamposDoRascunho;
  erros: ErrosDoFormulario;
  alterar: AlterarCampo;
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

export function ErroDoCampo({ campo, erros }: { campo: CampoDoFormulario; erros: ErrosDoFormulario }) {
  const mensagem = erros[campo];
  return mensagem ? <p id={`${ID_DO_CAMPO[campo]}-erro`} className="mt-1 text-xs font-medium text-red-600">{mensagem}</p> : null;
}

export function SecaoDoProblema({ campos, erros, alterar, escolherMotivo }: PropsDaSecao & { escolherMotivo: (motivoId: string, manterContexto: boolean) => void }) {
  const motivos = useMotivos();
  const motivoSelecionado = motivos.data?.find((motivo) => motivo.id === campos.motivoId) ?? null;
  const outroSelecionado = campos.motivoId === "OUTRO";
  const contextos = useContextos(motivoSelecionado?.tipo ?? null);
  const listaDeMotivos = motivos.data;
  const motivosPorTipo = useMemo(() => {
    const grupos = new Map<TipoChamado, Motivo[]>();
    for (const motivo of listaDeMotivos ?? []) grupos.set(motivo.tipo, [...(grupos.get(motivo.tipo) ?? []), motivo]);
    return [...grupos.entries()];
  }, [listaDeMotivos]);

  const aoEscolherMotivo = (motivoId: string) => {
    const novoTipo = motivos.data?.find((motivo) => motivo.id === motivoId)?.tipo;
    escolherMotivo(motivoId, novoTipo === motivoSelecionado?.tipo);
  };

  return (
    <Secao numero={1} titulo="O que aconteceu?">
      <div className="space-y-4">
        <div>
          <label htmlFor={ID_DO_CAMPO.motivoId} className={labelClass}>Motivo *</label>
          <select {...propriedadesDoCampo("motivoId", erros)} className={inputClass} value={campos.motivoId} onChange={(evento) => aoEscolherMotivo(evento.target.value)} disabled={motivos.isPending}>
            <option value="">{motivos.isPending ? "Carregando motivos…" : "Selecione o motivo"}</option>
            {motivosPorTipo.map(([tipo, lista]) => (
              <optgroup key={tipo} label={NOME_TIPO[tipo]}>
                {lista.map((motivo) => <option key={motivo.id} value={motivo.id}>{motivo.descricao}</option>)}
              </optgroup>
            ))}
            <option value="OUTRO">Outro motivo</option>
          </select>
          <ErroDoCampo campo="motivoId" erros={erros} />
          {motivos.isError && <p className="mt-1 text-xs font-medium text-red-600">Não foi possível carregar os motivos. {mensagemDeErro(motivos.error)}</p>}
        </div>
        <div>
          <label htmlFor={ID_DO_CAMPO.contextoId} className={labelClass}>Contexto situacional {outroSelecionado ? "(não se aplica)" : "*"}</label>
          <select {...propriedadesDoCampo("contextoId", erros)} className={inputClass} value={campos.contextoId} onChange={(evento) => alterar("contextoId", evento.target.value)} disabled={!motivoSelecionado || contextos.isPending || outroSelecionado}>
            <option value="">{outroSelecionado ? "A Central classificará este chamado" : motivoSelecionado ? "Selecione a situação atual" : "Escolha o motivo primeiro"}</option>
            {(contextos.data ?? []).map((contexto) => <option key={contexto.id} value={contexto.id}>{contexto.descricao}</option>)}
          </select>
          <ErroDoCampo campo="contextoId" erros={erros} />
        </div>
        {outroSelecionado && <div>
          <label htmlFor={ID_DO_CAMPO.motivoOutro} className={labelClass}>Descreva brevemente o outro motivo *</label>
          <input {...propriedadesDoCampo("motivoOutro", erros)} className={inputClass} maxLength={200} value={campos.motivoOutro} onChange={(evento) => alterar("motivoOutro", evento.target.value)} />
          <ErroDoCampo campo="motivoOutro" erros={erros} />
          <p className="mt-1 text-xs text-slate-500">A Central fará a classificação. Em risco imediato à vida ou segurança, ligue para a Central 24h.</p>
        </div>}
        <div>
          <label htmlFor={ID_DO_CAMPO.descricao} className={labelClass}>Descrição *</label>
          <textarea {...propriedadesDoCampo("descricao", erros)} className={`${inputClass} resize-none`} rows={3} placeholder="Conte o que está acontecendo, com o máximo de detalhes…" value={campos.descricao} onChange={(evento) => alterar("descricao", evento.target.value)} />
          <ErroDoCampo campo="descricao" erros={erros} />
        </div>
      </div>
    </Secao>
  );
}

interface PropsDoSolicitante extends PropsDaSecao {
  abrePelaCentral: boolean;
  gestorFrota: boolean;
  escolherSolicitante: (solicitante: { id: string; nome: string; organizacao: string | null } | null) => void;
}

export function SecaoDoSolicitante({ campos, erros, alterar, abrePelaCentral, gestorFrota, escolherSolicitante }: PropsDoSolicitante) {
  return (
    <Secao numero={2} titulo="Solicitante">
      {(abrePelaCentral || gestorFrota) && (
        <div className="mb-4">
          <label htmlFor={ID_DO_CAMPO.solicitanteId} className={labelClass}>Motorista da frota {abrePelaCentral ? "*" : "(opcional)"}</label>
          <SeletorDeSolicitante
            id={ID_DO_CAMPO.solicitanteId}
            valor={campos.solicitanteId}
            selectClassName={inputClass}
            invalido={Boolean(erros.solicitanteId)}
            descricaoDoErro={erros.solicitanteId ? `${ID_DO_CAMPO.solicitanteId}-erro` : undefined}
            aoEscolher={escolherSolicitante}
          />
          <ErroDoCampo campo="solicitanteId" erros={erros} />
          <p className="mt-1 text-xs text-slate-500">A lista é limitada à organização vinculada à sua conta.</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ID_DO_CAMPO.cliente} className={labelClass}>Nome *</label>
          <input {...propriedadesDoCampo("cliente", erros)} className={inputClass} autoComplete="name" value={campos.cliente} readOnly={!abrePelaCentral} onChange={(evento) => alterar("cliente", evento.target.value)} />
          <ErroDoCampo campo="cliente" erros={erros} />
        </div>
        <div>
          <label htmlFor={ID_DO_CAMPO.telefone} className={labelClass}>Telefone</label>
          <input {...propriedadesDoCampo("telefone", erros)} className={inputClass} type="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={campos.telefone} onChange={(evento) => alterar("telefone", evento.target.value)} />
          <ErroDoCampo campo="telefone" erros={erros} />
        </div>
      </div>
    </Secao>
  );
}

export function SecaoDoVeiculoELocal({ campos, erros, alterar }: PropsDaSecao) {
  return (
    <Secao numero={3} titulo="Veículo e local (quando houver)">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ID_DO_CAMPO.modelo} className={labelClass}>Modelo</label>
          <input {...propriedadesDoCampo("modelo", erros)} className={inputClass} placeholder="Ex: Volvo FH 460" value={campos.modelo} onChange={(evento) => alterar("modelo", evento.target.value)} />
          <ErroDoCampo campo="modelo" erros={erros} />
        </div>
        <div>
          <label htmlFor={ID_DO_CAMPO.placa} className={labelClass}>Placa</label>
          <input {...propriedadesDoCampo("placa", erros)} className={inputClass} placeholder="ABC-1D23" value={campos.placa} onChange={(evento) => alterar("placa", evento.target.value)} />
          <ErroDoCampo campo="placa" erros={erros} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={ID_DO_CAMPO.endereco} className={labelClass}>Localização</label>
          <CampoDeLocalizacao id={ID_DO_CAMPO.endereco} valor={campos.localizacao} aoAlterar={(localizacao) => alterar("localizacao", localizacao)} inputClassName={inputClass} erro={erros.endereco} />
        </div>
      </div>
    </Secao>
  );
}

export function SecaoDeAnexos({ arquivos, aoAdicionar, aoRemover }: { arquivos: ArquivoPendente[]; aoAdicionar: (novos: File[]) => void; aoRemover: (id: string) => void }) {
  return (
    <Secao numero={4} titulo="Fotos e documentos (opcional)">
      <SeletorDeArquivos aoAceitar={aoAdicionar} />
      {arquivos.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {arquivos.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="flex min-w-0 items-center gap-2"><FileText size={14} className="flex-shrink-0" aria-hidden /><span className="break-all">{item.arquivo.name}</span></span>
              <span className="flex flex-shrink-0 items-center gap-2">
                {formatarTamanho(item.arquivo.size)}
                <button type="button" aria-label={`Remover ${item.arquivo.name}`} onClick={() => aoRemover(item.id)} className="alvo-toque flex items-center justify-center text-slate-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}
