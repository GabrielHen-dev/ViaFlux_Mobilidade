"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRightLeft, Ban, ChevronLeft, ClipboardList, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { type Chamado, type TipoChamado } from "@/types/chamado";
import type { DadosTransferencia, DadosTransferenciaDeResponsavel } from "@/services/api/contratos";
import { transferirChamado, transferirResponsavel } from "@/services/api/chamados";
import { useAcaoNoChamado, useDepartamentos, usePessoasDoSetor } from "@/hooks/consultas";
import { useRascunho } from "@/hooks/useRascunho";
import ComChamado from "@/components/chamados/ComChamado";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import AlteracaoDeStatus from "@/components/chamados/AlteracaoDeStatus";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import Select from "@/components/ui/Select";
import { formatarDataHora } from "@/utils/date";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import { PERFIS_DE_TRIAGEM, PERFIS_QUE_ATENDEM, PERFIS_QUE_CONDUZEM, usuarioTemPerfil } from "@/utils/perfis";
import RaizDaPagina from "@/components/layout/RaizDaPagina";

const TAMANHO_MINIMO_DO_MOTIVO = 10;
const labelClass = "block text-xs font-medium text-[#475569] mb-2";
const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-linha bg-white text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10";
const STATUS_SEM_TROCA_DE_RESPONSAVEL = ["Resolvido", "Fechado"];

function TransferenciaParaPessoa({ chamado }: { chamado: Chamado }) {
  const usuario = useUsuarioAutenticado();
  const encerrado = STATUS_SEM_TROCA_DE_RESPONSAVEL.includes(chamado.status);
  const pessoas = usePessoasDoSetor(chamado.id, !encerrado);
  const [pessoaId, setPessoaId] = useState("");
  const [observacao, setObservacao] = useState("");
  const transferencia = useAcaoNoChamado(chamado.id, (api, dados: DadosTransferenciaDeResponsavel) => transferirResponsavel(api, chamado.id, dados));
  const responsavelAtual = chamado.atendimento?.responsavel ?? null;
  const opcoes = (pessoas.data ?? [])
    .filter((pessoa) => pessoa.id !== null && pessoa.id !== responsavelAtual?.id)
    .map((pessoa) => ({ valor: pessoa.id as string, rotulo: pessoa.id === usuario.id ? `${pessoa.nome} (você)` : pessoa.nome }));
  const setor = chamado.departamento?.nome ?? "do chamado";

  return (
    <section className="rounded-2xl border border-linha bg-white p-5 md:p-6" aria-labelledby="titulo-transferencia-pessoa">
      <h2 id="titulo-transferencia-pessoa" className="mb-1 flex items-center gap-2 font-display text-sm font-semibold text-tinta"><UserRoundCheck size={16} aria-hidden /> Transferir para outra pessoa do setor</h2>
      <p className="mb-4 text-xs text-slate-500">
        O chamado continua em {setor}; só muda quem está com ele.{" "}
        {responsavelAtual ? <>Hoje está com <span className="font-semibold text-brand-dark">{responsavelAtual.id === usuario.id ? "você" : responsavelAtual.nome}</span>.</> : "Ninguém assumiu ainda."}
      </p>
      {encerrado ? (
        <p className="text-sm text-slate-500">Chamados resolvidos ou fechados não mudam de responsável.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="transferencia-pessoa" className={labelClass}>Pessoa de destino *</label>
            <Select
              id="transferencia-pessoa"
              value={pessoaId}
              onChange={setPessoaId}
              opcoes={opcoes}
              placeholder={pessoas.isPending ? "Carregando pessoas…" : opcoes.length === 0 ? `Nenhuma outra pessoa ativa em ${setor}` : "Selecione"}
              disabled={pessoas.isPending || opcoes.length === 0}
            />
            {pessoas.isError && <div className="mt-2"><AvisoDeErro erro={pessoas.error} /></div>}
          </div>
          <div>
            <label htmlFor="transferencia-pessoa-observacao" className={labelClass}>Observação</label>
            <textarea id="transferencia-pessoa-observacao" className={`${inputClass} resize-none`} rows={2} maxLength={2000} value={observacao} onChange={(evento) => setObservacao(evento.target.value)} placeholder="Contexto para quem vai assumir (opcional)" />
          </div>
          {transferencia.isError && <AvisoDeErro erro={transferencia.error} />}
          <button
            type="button"
            disabled={pessoaId === "" || transferencia.isPending}
            onClick={() => transferencia.mutate({ usuarioId: pessoaId, observacao: observacao.trim() || undefined }, {
              onSuccess: (atualizado) => {
                setPessoaId("");
                setObservacao("");
                toast.success(`Chamado transferido para ${atualizado.atendimento?.responsavel.nome ?? "a pessoa escolhida"}.`);
              },
            })}
            className="alvo-toque w-full rounded-xl vf-botao-primario py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {transferencia.isPending ? "Transferindo…" : "Transferir para a pessoa"}
          </button>
        </div>
      )}
    </section>
  );
}

function EncaminhamentoConteudo({ chamado }: { chamado: Chamado }) {
  const usuario = useUsuarioAutenticado();
  const atende = usuarioTemPerfil(usuario, PERFIS_QUE_ATENDEM);
  const departamentos = useDepartamentos();
  const [destino, setDestino] = useState<TipoChamado | "">("");
  const { valor: motivo, setValor: setMotivo, descartar: descartarMotivo } = useRascunho(`transferencia:${usuario.id}:${chamado.id}`, "");

  const transferencia = useAcaoNoChamado(chamado.id, (api, dados: DadosTransferencia) => transferirChamado(api, chamado.id, dados));
  const transferencias = chamado.timeline.filter((evento) => evento.tipo === "TRANSFERENCIA" || evento.tipo === "ROTEAMENTO");
  const destinosValidos = (departamentos.data ?? []).filter((departamento) => departamento.codigo !== chamado.departamento?.codigo);
  const podeTransferir = destino !== "" && motivo.trim().length >= TAMANHO_MINIMO_DO_MOTIVO;

  return (
    <RaizDaPagina className="vf-pagina">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <Link aria-label="Voltar ao chamado" href={`/chamados/${chamado.id}`} className="alvo-toque flex h-9 w-9 items-center justify-center rounded-xl border border-linha text-[#64748B] transition-all hover:bg-white">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-tinta">Transferência — #{chamado.id}</h1>
            <p className="mt-0.5 text-sm text-[#64748B]">Histórico, anexos e SLA são mantidos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-linha bg-white p-5">
              <div>
                <div className="text-xs text-slate-400">Departamento responsável</div>
                <div className="font-display text-lg font-bold text-tinta">{chamado.departamento?.nome ?? "Não definido"}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={chamado.status} />
                <PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} />
              </div>
            </section>

            <section className="rounded-2xl border border-linha bg-white p-5 md:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-tinta"><ArrowRightLeft size={16} aria-hidden /> Transferir para outro departamento</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="transferencia-destino" className={labelClass}>Departamento de destino *</label>
                  <Select
                    id="transferencia-destino"
                    value={destino}
                    onChange={(valor) => setDestino(valor as TipoChamado | "")}
                    opcoes={destinosValidos.map((departamento) => ({ valor: departamento.codigo, rotulo: departamento.nome }))}
                    placeholder={departamentos.isPending ? "Carregando departamentos…" : "Selecione"}
                    disabled={departamentos.isPending}
                  />
                </div>
                <div>
                  <label htmlFor="transferencia-motivo" className={labelClass}>Motivo da transferência *</label>
                  <textarea id="transferencia-motivo" className={`${inputClass} resize-none`} rows={2} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Por que este departamento deve assumir?" />
                  <p className="mt-1 text-xs text-slate-400">Mínimo de {TAMANHO_MINIMO_DO_MOTIVO} caracteres.</p>
                </div>
                {transferencia.isError && <AvisoDeErro erro={transferencia.error} />}
                <button
                  type="button"
                  disabled={!podeTransferir || transferencia.isPending}
                  onClick={() => transferencia.mutate({ departamento: destino as TipoChamado, motivo: motivo.trim() }, {
                    onSuccess: (atualizado) => {
                      setDestino("");
                      descartarMotivo("");
                      toast.success(`Chamado transferido para ${atualizado.departamento?.nome}.`);
                    },
                  })}
                  className="alvo-toque w-full rounded-xl vf-botao-primario py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                >
                  {transferencia.isPending ? "Transferindo…" : "Transferir"}
                </button>
              </div>
            </section>

            {atende && <TransferenciaParaPessoa chamado={chamado} />}

            {atende && <AlteracaoDeStatus key={`${chamado.id}:${chamado.status}:${chamado.motivoAguardando ?? ""}`} chamado={chamado} />}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-linha bg-white p-5">
              <h3 className="mb-4 font-display text-sm font-medium text-tinta">Histórico de encaminhamentos</h3>
              {transferencias.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#94A3B8]">Nenhum encaminhamento registrado</p>
              ) : (
                <ol className="space-y-4">
                  {transferencias.map((evento) => (
                    <li key={evento.id} className="border-l-2 border-linha pl-3">
                      <div className="text-xs font-semibold text-brand-dark">{evento.acao}</div>
                      <div className="text-[11px] text-[#94A3B8]">{formatarDataHora(evento.ocorridoEm)} · {evento.autor?.nome ?? "Sistema"}</div>
                      <div className="mt-1 break-words text-xs text-[#64748B]">{evento.detalhe}</div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </div>
    </RaizDaPagina>
  );
}

function ChamadoCancelado({ chamado }: { chamado: Chamado }) {
  return (
    <RaizDaPagina className="vf-pagina">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Ban size={28} className="mx-auto mb-3 text-red-600" aria-hidden />
        <h1 className="mb-2 text-xl font-bold text-tinta">Transferência — #{chamado.id}</h1>
        <p className="mb-6 text-sm text-slate-500">Este chamado está cancelado. Reabra o chamado para transferir.</p>
        <Link href={`/chamados/${chamado.id}`} className="alvo-toque inline-flex rounded-xl border border-linha px-4 py-2.5 text-sm font-semibold text-[#475569]">Voltar ao chamado</Link>
      </div>
    </RaizDaPagina>
  );
}

function AguardandoTriagem({ chamado }: { chamado: Chamado }) {
  const usuario = useUsuarioAutenticado();
  return (
    <RaizDaPagina className="vf-pagina">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <ClipboardList size={28} className="mx-auto mb-3 text-amber-600" aria-hidden />
        <h1 className="mb-2 text-xl font-bold text-tinta">Transferência — #{chamado.id}</h1>
        <p className="mb-6 text-sm text-slate-500">Disponível após a classificação do chamado.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/chamados/${chamado.id}`} className="alvo-toque rounded-xl border border-linha px-4 py-2.5 text-sm font-semibold text-[#475569]">Voltar ao chamado</Link>
          {usuarioTemPerfil(usuario, PERFIS_DE_TRIAGEM) && (
            <Link href={`/chamados/${chamado.id}/triagem`} className="alvo-toque rounded-xl vf-botao-primario px-4 py-2.5 text-sm font-semibold text-white">Classificar</Link>
          )}
        </div>
      </div>
    </RaizDaPagina>
  );
}

export default function Encaminhamento({ id }: { id: string }) {
  return (
    <PerfilRequerido perfis={PERFIS_QUE_CONDUZEM}>
      <ComChamado id={id}>
        {(chamado) => chamado.status === "Cancelado" ? <ChamadoCancelado chamado={chamado} />
          : chamado.classificacao === null ? <AguardandoTriagem chamado={chamado} />
          : <EncaminhamentoConteudo key={chamado.id} chamado={chamado} />}
      </ComChamado>
    </PerfilRequerido>
  );
}
