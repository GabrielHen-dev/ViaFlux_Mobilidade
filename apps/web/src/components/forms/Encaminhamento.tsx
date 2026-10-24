"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRightLeft, Check, ChevronLeft, ClipboardList } from "lucide-react";
import { type Chamado, type TipoChamado } from "@/types/chamado";
import type { DadosTransferencia } from "@/services/api/contratos";
import { transferirChamado } from "@/services/api/chamados";
import { useAcaoNoChamado, useDepartamentos } from "@/hooks/consultas";
import { useRascunho } from "@/hooks/useRascunho";
import ComChamado from "@/components/chamados/ComChamado";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import AlteracaoDeStatus from "@/components/chamados/AlteracaoDeStatus";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { formatarDataHora } from "@/utils/date";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import { PERFIS_DE_TRIAGEM, PERFIS_QUE_ATENDEM, PERFIS_QUE_CONDUZEM, usuarioTemPerfil } from "@/utils/perfis";

const TAMANHO_MINIMO_DO_MOTIVO = 10;
const labelClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2";
const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10";

function EncaminhamentoConteudo({ chamado }: { chamado: Chamado }) {
  const usuario = useUsuarioAutenticado();
  const atende = usuarioTemPerfil(usuario, PERFIS_QUE_ATENDEM);
  const departamentos = useDepartamentos();
  const [destino, setDestino] = useState<TipoChamado | "">("");
  const { valor: motivo, setValor: setMotivo, descartar: descartarMotivo } = useRascunho(`transferencia:${usuario.id}:${chamado.id}`, "");
  const [confirmacao, setConfirmacao] = useState<string | null>(null);

  const transferencia = useAcaoNoChamado(chamado.id, (api, dados: DadosTransferencia) => transferirChamado(api, chamado.id, dados));
  const transferencias = chamado.timeline.filter((evento) => evento.tipo === "TRANSFERENCIA" || evento.tipo === "ROTEAMENTO");
  const destinosValidos = (departamentos.data ?? []).filter((departamento) => departamento.codigo !== chamado.departamento?.codigo);
  const podeTransferir = destino !== "" && motivo.trim().length >= TAMANHO_MINIMO_DO_MOTIVO;

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

            {atende && <AlteracaoDeStatus key={`${chamado.id}:${chamado.status}:${chamado.motivoAguardando ?? ""}`} chamado={chamado} />}
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
