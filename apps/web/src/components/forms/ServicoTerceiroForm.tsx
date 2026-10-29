"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, CirclePlus, Truck, X } from "lucide-react";
import { toast } from "sonner";
import type { Chamado } from "@/types/chamado";
import type { DadosVinculoServico } from "@/services/api/contratos";
import { cancelarServico, vincularServico } from "@/services/api/operacao";
import { useApi } from "@/store/AuthContext";
import { chaves, invalidarListas, useAcaoNoChamado, useFornecedores } from "@/hooks/consultas";
import { StatusServicoBadge } from "@/components/ui/StatusServico";
import { AvisoDeErro, mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import Select from "@/components/ui/Select";
import { formatarDataHora } from "@/utils/date";
import { cn } from "@/utils/cn";

const TIPOS_DE_SERVICO = ["Remoção do veículo", "Reparo mecânico", "Reparo elétrico", "Troca de pneu", "Abastecimento", "Chaveiro", "Outro"];
const labelClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5";
const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10";

function FormularioDeVinculo({ chamado, aoFechar }: { chamado: Chamado; aoFechar: () => void }) {
  const fornecedores = useFornecedores();
  const [dados, setDados] = useState<DadosVinculoServico>({ fornecedorId: "", tipoServico: "", local: chamado.localizacao, observacao: "" });
  const vinculo = useAcaoNoChamado(chamado.id, (api, variaveis: DadosVinculoServico) => vincularServico(api, chamado.id, variaveis));
  const completo = dados.fornecedorId !== "" && dados.tipoServico !== "";

  function acionar() {
    vinculo.mutateAsync(dados)
      .then((atualizado) => {
        toast.success("Fornecedor acionado", { description: atualizado.servico?.fornecedor.nome });
        aoFechar();
      })
      .catch(() => undefined);
  }

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-brand-navy"><Truck size={16} aria-hidden /> Acionar serviço terceirizado</h3>
        <button type="button" onClick={aoFechar} aria-label="Fechar formulário do fornecedor" className="alvo-toque flex items-center justify-center text-[#94A3B8] hover:text-[#475569]"><X size={16} /></button>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor={`fornecedor-${chamado.id}`} className={labelClass}>Fornecedor credenciado *</label>
          <Select
            id={`fornecedor-${chamado.id}`}
            value={dados.fornecedorId}
            onChange={(valor) => setDados({ ...dados, fornecedorId: valor })}
            opcoes={(fornecedores.data ?? []).map((fornecedor) => ({ valor: fornecedor.id, rotulo: fornecedor.nome, descricao: fornecedor.especialidade }))}
            placeholder={fornecedores.isPending ? "Carregando fornecedores…" : "Selecione"}
            disabled={fornecedores.isPending}
          />
        </div>
        <fieldset>
          <legend className={labelClass}>Tipo de serviço *</legend>
          <div className="flex flex-wrap gap-2">
            {TIPOS_DE_SERVICO.map((tipo) => (
              <button key={tipo} type="button" aria-pressed={dados.tipoServico === tipo} onClick={() => setDados({ ...dados, tipoServico: tipo })} className={cn("alvo-toque rounded-lg border-2 px-3.5 py-1.5 text-xs font-semibold transition-all", dados.tipoServico === tipo ? "border-brand-blue bg-blue-50 text-blue-700" : "border-[#E2E8F0] text-[#475569]")}>
                {tipo}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`servico-local-${chamado.id}`} className={labelClass}>Local do atendimento</label>
          <input id={`servico-local-${chamado.id}`} className={inputClass} value={dados.local} onChange={(evento) => setDados({ ...dados, local: evento.target.value })} />
        </div>
        <div>
          <label htmlFor={`servico-obs-${chamado.id}`} className={labelClass}>Instruções ao fornecedor</label>
          <textarea id={`servico-obs-${chamado.id}`} className={`${inputClass} resize-none`} rows={2} value={dados.observacao} onChange={(evento) => setDados({ ...dados, observacao: evento.target.value })} placeholder="Não inclua dados pessoais do cliente." />
        </div>
        {vinculo.isError && <AvisoDeErro erro={vinculo.error} />}
        <div className="flex gap-3">
          <button type="button" onClick={aoFechar} className="alvo-toque flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-semibold text-[#475569] hover:bg-brand-light">Cancelar</button>
          <button type="button" disabled={!completo || vinculo.isPending} onClick={acionar} className="alvo-toque flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
            {vinculo.isPending ? "Acionando…" : "Acionar fornecedor"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServicoTerceiroForm({ chamado }: { chamado: Chamado }) {
  const api = useApi();
  const clienteDeConsultas = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const servico = chamado.servico;
  const cancelamento = useMutation({
    mutationFn: (servicoId: string) => cancelarServico(api, chamado.id, servicoId),
    onSuccess: () => {
      void clienteDeConsultas.invalidateQueries({ queryKey: chaves.detalhe(chamado.id) });
      void invalidarListas(clienteDeConsultas);
      toast.success("Serviço cancelado");
    },
    onError: (erro) => toast.error("Não foi possível cancelar o serviço", { description: mensagemDeErro(erro) }),
  });

  if (!servico) {
    if (mostrarFormulario) return <FormularioDeVinculo chamado={chamado} aoFechar={() => setMostrarFormulario(false)} />;
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#CBD5E1] p-6 text-center">
        <Truck size={22} className="text-[#94A3B8]" aria-hidden />
        <div>
          <div className="text-sm font-semibold text-[#475569]">Nenhum serviço terceirizado vinculado</div>
          <div className="mt-0.5 text-xs text-[#94A3B8]">Acione um fornecedor para guincho, mecânica, elétrica ou outro serviço externo.</div>
        </div>
        <button type="button" onClick={() => setMostrarFormulario(true)} className="alvo-toque flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          <CirclePlus size={14} strokeWidth={2.5} aria-hidden /> Incluir serviço terceirizado
        </button>
      </div>
    );
  }

  const ultima = servico.historico[servico.historico.length - 1];
  return (
    <div className="rounded-2xl border-2 border-brand-blue/20 bg-gradient-to-br from-blue-50 to-emerald-50 p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-brand-navy"><Truck size={16} aria-hidden /> Serviço terceirizado</h3>
        <div className="flex items-center gap-2">
          <StatusServicoBadge status={servico.status} />
          <button type="button" disabled={cancelamento.isPending} onClick={() => cancelamento.mutate(servico.id)} title="Cancelar serviço" aria-label="Cancelar serviço terceirizado" className="alvo-toque flex items-center justify-center px-1 text-xs text-[#94A3B8] hover:text-[#EF4444]">
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/70 p-3.5">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Fornecedor</div>
          <div className="text-sm font-bold text-brand-dark">{servico.fornecedor.nome}</div>
          <div className="mt-0.5 text-xs text-[#64748B]">{servico.fornecedor.especialidade}</div>
        </div>
        <div className="rounded-xl bg-white/70 p-3.5">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Serviço</div>
          <div className="text-sm font-bold text-brand-dark">{servico.tipoServico}</div>
          <div className="mt-0.5 break-words text-xs text-[#64748B]">{servico.local || "Local não informado"}</div>
        </div>
        <div className="rounded-xl bg-white/70 p-3.5 sm:col-span-2">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Última atualização do fornecedor</div>
          <div className="text-sm font-bold text-brand-dark">{formatarDataHora(servico.atualizadoEm)}</div>
          {ultima?.observacao && <div className="mt-0.5 text-xs text-[#64748B]">“{ultima.observacao}”</div>}
        </div>
      </div>
      <Link href={`/chamados/${chamado.id}/acompanhamento`} className="alvo-toque flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-white hover:opacity-90">
        Ver histórico do serviço <ChevronRight size={14} strokeWidth={2.5} aria-hidden />
      </Link>
    </div>
  );
}
