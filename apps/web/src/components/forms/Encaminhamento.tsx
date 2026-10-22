"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRightLeft, Check, ChevronLeft, ClipboardList } from "lucide-react";
import { MOTIVOS_AGUARDANDO, STATUS_DEFINIVEIS, type Chamado, type MotivoAguardando, type Status, type TipoChamado } from "@/types/chamado";
import type { DadosStatus, DadosTransferencia } from "@/services/api/contratos";
import { alterarStatus, transferirChamado } from "@/services/api/chamados";
import { useAcaoNoChamado, useDepartamentos } from "@/hooks/consultas";
import { useRascunho } from "@/hooks/useRascunho";
import ComChamado from "@/components/chamados/ComChamado";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { APARENCIA_DO_STATUS, PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { formatarDataHora } from "@/utils/date";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import { PERFIS_DE_TRIAGEM, PERFIS_QUE_ATENDEM, PERFIS_QUE_CONDUZEM, usuarioTemPerfil } from "@/utils/perfis";
import { cn } from "@/utils/cn";

const TAMANHO_MINIMO_DO_MOTIVO = 10;
const ROTULO_DO_AGUARDANDO: Record<MotivoAguardando, string> = {
  CLIENTE: "Cliente (pausa o relógio de resolução)",
  FORNECEDOR: "Fornecedor (SLA continua contando)",
  OUTRO_DEPARTAMENTO: "Outro departamento (SLA continua contando)",
};
const labelClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2";
const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10";

function EncaminhamentoConteudo({ chamado }: { chamado: Chamado }) {
  const usuario = useUsuarioAutenticado();
  const atende = usuarioTemPerfil(usuario, PERFIS_QUE_ATENDEM);
  const departamentos = useDepartamentos();
  const [destino, setDestino] = useState<TipoChamado | "">("");
  const { valor: motivo, setValor: setMotivo, descartar: descartarMotivo } = useRascunho(`transferencia:${usuario.id}:${chamado.id}`, "");
  const [status, setStatus] = useState<Status>(chamado.status);
  const [motivoAguardando, setMotivoAguardando] = useState<MotivoAguardando | "">(chamado.motivoAguardando ?? "");
  const [observacao, setObservacao] = useState("");
  const [resumoResolucao, setResumoResolucao] = useState("");
  const [confirmacao, setConfirmacao] = useState<string | null>(null);

  const transferencia = useAcaoNoChamado(chamado.id, (api, dados: DadosTransferencia) => transferirChamado(api, chamado.id, dados));
  const mudancaDeStatus = useAcaoNoChamado(chamado.id, (api, dados: DadosStatus) => alterarStatus(api, chamado.id, dados));
  const transferencias = chamado.timeline.filter((evento) => evento.tipo === "TRANSFERENCIA" || evento.tipo === "ROTEAMENTO");
  const destinosValidos = (departamentos.data ?? []).filter((departamento) => departamento.codigo !== chamado.departamento?.codigo);
  const podeTransferir = destino !== "" && motivo.trim().length >= TAMANHO_MINIMO_DO_MOTIVO;
  const precisaDeMotivoAguardando = status === "Aguardando" && motivoAguardando === "";
  const statusMudou = status !== chamado.status || (status === "Aguardando" && motivoAguardando !== chamado.motivoAguardando);

  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <Link aria-label="Voltar ao chamado" href={`/chamados/${chamado.id}`} className="alvo-toque flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-all hover:bg-white">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">Transferência — #{chamado.id}</h1>
            <p className="mt-0.5 text-sm text-[#64748B]">O histórico e os anexos acompanham o chamado. O SLA não reinicia.</p>
          </div>
        </div>

        {confirmacao && (
          <p role="status" className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            <Check size={18} aria-hidden /> {confirmacao}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Departamento responsável</div>
                <div className="font-display text-lg font-bold text-brand-navy">{chamado.departamento?.nome ?? "Não definido"}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={chamado.status} />
                <PrioridadeIndicador prioridade={chamado.prioridade} score={chamado.score} />
              </div>
            </section>

            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-brand-navy"><ArrowRightLeft size={16} aria-hidden /> Transferir para outro departamento</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="transferencia-destino" className={labelClass}>Departamento de destino *</label>
                  <select id="transferencia-destino" className={inputClass} value={destino} onChange={(evento) => setDestino(evento.target.value as TipoChamado | "")}>
                    <option value="">Selecione</option>
                    {destinosValidos.map((departamento) => <option key={departamento.codigo} value={departamento.codigo}>{departamento.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="transferencia-motivo" className={labelClass}>Motivo da transferência *</label>
                  <textarea id="transferencia-motivo" className={`${inputClass} resize-none`} rows={2} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Por que este departamento deve assumir?" />
                  <p className="mt-1 text-xs text-slate-400">Obrigatório, com pelo menos {TAMANHO_MINIMO_DO_MOTIVO} caracteres.</p>
                </div>
                {transferencia.isError && <AvisoDeErro erro={transferencia.error} />}
                <button
                  type="button"
                  disabled={!podeTransferir || transferencia.isPending}
                  onClick={() => transferencia.mutate({ departamento: destino as TipoChamado, motivo: motivo.trim() }, {
                    onSuccess: (atualizado) => {
                      setDestino("");
                      descartarMotivo("");
                      setConfirmacao(`Chamado transferido para ${atualizado.departamento?.nome}.`);
                    },
                  })}
                  className="alvo-toque w-full rounded-xl bg-brand-green py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {transferencia.isPending ? "Transferindo…" : "Transferir"}
                </button>
              </div>
            </section>

            {atende && <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">
              <h2 className="mb-4 font-display text-sm font-semibold text-brand-navy">Status do chamado</h2>
              <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Novo status">
                {STATUS_DEFINIVEIS.map((opcao) => {
                  const { texto } = APARENCIA_DO_STATUS[opcao];
                  const selecionado = status === opcao;
                  return (
                    <button key={opcao} type="button" role="radio" aria-checked={selecionado} onClick={() => setStatus(opcao)} className="alvo-toque rounded-lg border-2 px-3.5 py-2 text-xs font-semibold transition-all" style={{ borderColor: selecionado ? texto : "#E2E8F0", color: selecionado ? texto : "#64748B", background: selecionado ? `${texto}14` : "white" }}>
                      {opcao}
                    </button>
                  );
                })}
              </div>
              {status === "Aguardando" && (
                <fieldset className="mb-4">
                  <legend className={labelClass}>Aguardando quem? *</legend>
                  <div className="space-y-2">
                    {MOTIVOS_AGUARDANDO.map((opcao) => (
                      <label key={opcao} className={cn("alvo-toque flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm", motivoAguardando === opcao ? "border-brand-blue bg-blue-50" : "border-[#E2E8F0]")}>
                        <input type="radio" name="motivo-aguardando" checked={motivoAguardando === opcao} onChange={() => setMotivoAguardando(opcao)} />
                        {ROTULO_DO_AGUARDANDO[opcao]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {status === "Resolvido" && <div className="mb-4">
                <label htmlFor="status-resumo-resolucao" className={labelClass}>Resumo da solução *</label>
                <textarea id="status-resumo-resolucao" className={`${inputClass} resize-none`} rows={4} maxLength={5000} value={resumoResolucao} onChange={(evento) => setResumoResolucao(evento.target.value)} placeholder="Descreva o que foi feito para resolver o chamado…" />
              </div>}
              <label htmlFor="status-observacao" className="sr-only">Observação</label>
              <textarea id="status-observacao" className={`${inputClass} resize-none`} rows={2} placeholder="Observação (opcional)…" value={observacao} onChange={(evento) => setObservacao(evento.target.value)} />
              {mudancaDeStatus.isError && <div className="mt-3"><AvisoDeErro erro={mudancaDeStatus.error} /></div>}
              <button
                type="button"
                disabled={!statusMudou || precisaDeMotivoAguardando || (status === "Resolvido" && resumoResolucao.trim().length < 10) || mudancaDeStatus.isPending}
                onClick={() => mudancaDeStatus.mutate({ status, motivoAguardando: status === "Aguardando" ? (motivoAguardando as MotivoAguardando) : null, observacao: observacao.trim(), resumoResolucao: status === "Resolvido" ? resumoResolucao.trim() : undefined }, {
                  onSuccess: (atualizado) => { setObservacao(""); setResumoResolucao(""); setConfirmacao(`Status atualizado para ${atualizado.status}. O cliente foi notificado.`); },
                })}
                className="alvo-toque mt-4 w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {mudancaDeStatus.isPending ? "Atualizando…" : "Atualizar status"}
              </button>
            </section>}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-wide text-brand-navy">Histórico de encaminhamentos</h3>
              {transferencias.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#94A3B8]">Nenhum encaminhamento registrado</p>
              ) : (
                <ol className="space-y-4">
                  {transferencias.map((evento) => (
                    <li key={evento.id} className="border-l-2 border-[#E2E8F0] pl-3">
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
    </main>
  );
}

function AguardandoTriagem({ chamado }: { chamado: Chamado }) {
  const usuario = useUsuarioAutenticado();
  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <ClipboardList size={28} className="mx-auto mb-3 text-amber-600" aria-hidden />
        <h1 className="mb-2 text-xl font-bold text-brand-navy">Transferência — #{chamado.id}</h1>
        <p className="mb-6 text-sm text-slate-500">Este chamado ainda não passou pela triagem. Status e transferência ficam disponíveis depois que o atendente classificar e encaminhar.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/chamados/${chamado.id}`} className="alvo-toque rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#475569]">Voltar ao chamado</Link>
          {usuarioTemPerfil(usuario, PERFIS_DE_TRIAGEM) && (
            <Link href={`/chamados/${chamado.id}/triagem`} className="alvo-toque rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white">Fazer triagem</Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Encaminhamento({ id }: { id: string }) {
  return (
    <PerfilRequerido perfis={PERFIS_QUE_CONDUZEM}>
      <ComChamado id={id}>
        {(chamado) => chamado.classificacao === null ? <AguardandoTriagem chamado={chamado} /> : <EncaminhamentoConteudo key={chamado.id} chamado={chamado} />}
      </ComChamado>
    </PerfilRequerido>
  );
}
