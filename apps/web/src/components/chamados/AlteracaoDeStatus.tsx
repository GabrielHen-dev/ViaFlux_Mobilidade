"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MOTIVOS_AGUARDANDO, type Chamado, type MotivoAguardando, type Status } from "@/types/chamado";
import type { DadosStatus } from "@/services/api/contratos";
import { alterarStatus } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import Select, { type OpcaoDoSelect } from "@/components/ui/Select";

const STATUS_ATIVOS: Status[] = ["Na fila", "Em atendimento", "Aguardando", "Resolvido"];
const OPCOES_DO_AGUARDANDO: Record<MotivoAguardando, Omit<OpcaoDoSelect, "valor">> = {
  CLIENTE: { rotulo: "Cliente", descricao: "SLA de resolução pausado" },
  FORNECEDOR: { rotulo: "Fornecedor", descricao: "SLA segue contando" },
  OUTRO_DEPARTAMENTO: { rotulo: "Outro departamento", descricao: "SLA segue contando" },
};
const OPCOES_DE_MOTIVO_AGUARDANDO: OpcaoDoSelect[] = MOTIVOS_AGUARDANDO.map((motivo) => ({ valor: motivo, ...OPCOES_DO_AGUARDANDO[motivo] }));
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-wide text-[#475569]";
const inputClass = "w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10";

export default function AlteracaoDeStatus({ chamado }: { chamado: Chamado }) {
  const [status, setStatus] = useState<Status>(chamado.status);
  const [motivoAguardando, setMotivoAguardando] = useState<MotivoAguardando | "">(chamado.motivoAguardando ?? "");
  const [observacao, setObservacao] = useState("");
  const [resumoResolucao, setResumoResolucao] = useState("");
  const mudanca = useAcaoNoChamado(chamado.id, (api, dados: DadosStatus) => alterarStatus(api, chamado.id, dados));

  const opcoes: Status[] = chamado.status === "Resolvido" ? ["Resolvido", "Fechado"] : STATUS_ATIVOS;
  const statusMudou = status !== chamado.status || (status === "Aguardando" && motivoAguardando !== chamado.motivoAguardando);
  const formularioValido = statusMudou && (status !== "Aguardando" || motivoAguardando !== "")
    && (status !== "Resolvido" || resumoResolucao.trim().length >= 10);

  function atualizar() {
    mudanca.mutateAsync({ status, motivoAguardando: status === "Aguardando" ? motivoAguardando as MotivoAguardando : null, observacao: observacao.trim(), resumoResolucao: status === "Resolvido" ? resumoResolucao.trim() : undefined })
      .then((atualizado) => toast.success("Status atualizado", { description: `Novo status: ${atualizado.status}.` }))
      .catch(() => undefined);
  }

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6" aria-labelledby="titulo-alteracao-status">
      <h2 id="titulo-alteracao-status" className="mb-4 font-display text-sm font-semibold text-brand-navy">Status do chamado</h2>
      {chamado.status === "Fechado" ? (
        <p className="text-sm text-slate-500">Este chamado está fechado.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor={`novo-status-${chamado.id}`} className={labelClass}>Alterar status</label>
            <Select
              id={`novo-status-${chamado.id}`}
              value={status}
              onChange={(valor) => { setStatus(valor as Status); mudanca.reset(); }}
              opcoes={opcoes.map((opcao) => ({ valor: opcao, rotulo: opcao }))}
            />
            {chamado.status === "Resolvido" && <p className="mt-2 text-xs text-slate-500">Chamado resolvido. Pode ser fechado.</p>}
          </div>
          {status === "Aguardando" && (
            <div>
              <label htmlFor={`motivo-aguardando-${chamado.id}`} className={labelClass}>Aguardando quem? *</label>
              <Select
                id={`motivo-aguardando-${chamado.id}`}
                value={motivoAguardando}
                onChange={(valor) => setMotivoAguardando(valor as MotivoAguardando | "")}
                opcoes={OPCOES_DE_MOTIVO_AGUARDANDO}
              />
            </div>
          )}
          {status === "Resolvido" && chamado.status !== "Resolvido" && (
            <div>
              <label htmlFor={`resumo-resolucao-${chamado.id}`} className={labelClass}>Resumo da solução *</label>
              <textarea id={`resumo-resolucao-${chamado.id}`} className={`${inputClass} resize-none`} rows={4} maxLength={5000} value={resumoResolucao} onChange={(evento) => setResumoResolucao(evento.target.value)} placeholder="Descreva a solução aplicada…" />
              <p className="mt-1 text-xs text-slate-500">Mínimo de 10 caracteres.</p>
            </div>
          )}
          {status !== chamado.status && (
            <div>
              <label htmlFor={`observacao-status-${chamado.id}`} className={labelClass}>Observação (opcional)</label>
              <textarea id={`observacao-status-${chamado.id}`} className={`${inputClass} resize-none`} rows={2} value={observacao} onChange={(evento) => setObservacao(evento.target.value)} />
            </div>
          )}
          {mudanca.isError && <AvisoDeErro erro={mudanca.error} />}
          <button type="button" disabled={!formularioValido || mudanca.isPending} onClick={atualizar} className="alvo-toque w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40">
            {mudanca.isPending ? "Atualizando…" : "Atualizar status"}
          </button>
        </div>
      )}
    </section>
  );
}
