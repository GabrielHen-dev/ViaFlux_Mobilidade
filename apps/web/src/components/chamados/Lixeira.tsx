"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CircleAlert, RotateCcw, Trash } from "lucide-react";
import { toast } from "sonner";
import { esvaziarLixeira, excluirDefinitivamente, restaurarDaLixeira } from "@/services/api/chamados";
import { useApi } from "@/store/AuthContext";
import { invalidarListas, useLixeira } from "@/hooks/consultas";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import { Carregando, FalhaAoCarregar, mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { PERFIS_DA_LIXEIRA } from "@/utils/perfis";

function ConteudoDaLixeira() {
  const api = useApi();
  const clienteDeConsultas = useQueryClient();
  const lixeira = useLixeira();
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [confirmandoEsvaziar, setConfirmandoEsvaziar] = useState(false);
  const aoConcluir = (titulo: string, descricao?: string) => {
    setConfirmandoId(null);
    setConfirmandoEsvaziar(false);
    void invalidarListas(clienteDeConsultas);
    toast.success(titulo, { description: descricao });
  };
  const aoFalhar = (titulo: string) => (erro: unknown) => toast.error(titulo, { description: mensagemDeErro(erro) });
  const restauracao = useMutation({
    mutationFn: (codigo: string) => restaurarDaLixeira(api, codigo),
    onSuccess: (_, codigo) => aoConcluir("Chamado restaurado", `#${codigo}`),
    onError: aoFalhar("Não foi possível restaurar o chamado"),
  });
  const exclusao = useMutation({
    mutationFn: (codigo: string) => excluirDefinitivamente(api, codigo),
    onSuccess: (_, codigo) => aoConcluir("Chamado excluído definitivamente", `#${codigo}`),
    onError: aoFalhar("Não foi possível excluir o chamado"),
  });
  const esvaziamento = useMutation({
    mutationFn: () => esvaziarLixeira(api),
    onSuccess: () => aoConcluir("Lixeira esvaziada"),
    onError: aoFalhar("Não foi possível esvaziar a lixeira"),
  });
  const chamados = lixeira.data ?? [];

  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Voltar ao Dashboard" className="alvo-toque flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-all hover:bg-white">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">Lixeira</h1>
            <p className="mt-0.5 text-sm text-[#64748B]">
              {chamados.length === 0 ? "Nenhum chamado excluído" : `${chamados.length} chamado${chamados.length > 1 ? "s" : ""} excluído${chamados.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {chamados.length > 0 && (confirmandoEsvaziar ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#64748B]">Excluir todos os chamados definitivamente?</span>
            <button type="button" onClick={() => esvaziamento.mutate()} className="alvo-toque rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Confirmar</button>
            <button type="button" onClick={() => setConfirmandoEsvaziar(false)} className="alvo-toque rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#64748B]">Cancelar</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmandoEsvaziar(true)} className="alvo-toque flex items-center gap-2 rounded-xl border border-[#FECACA] px-4 py-2 text-sm font-semibold text-[#EF4444] hover:bg-[#FEF2F2]">
            <Trash size={14} aria-hidden /> Esvaziar lixeira
          </button>
        ))}
      </div>
      {lixeira.isPending ? <Carregando /> : lixeira.isError ? <FalhaAoCarregar erro={lixeira.error} aoTentarDeNovo={() => void lixeira.refetch()} /> : chamados.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white p-16 text-center">
          <Trash size={32} className="mb-4 text-[#CBD5E1]" aria-hidden />
          <div className="font-display font-semibold text-[#475569]">Lixeira vazia</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          <div className="flex items-center gap-2 border-b border-[#FEF3C7] bg-[#FFFBEB] px-5 py-3">
            <CircleAlert size={14} className="text-[#D97706]" aria-hidden />
            <span className="text-xs font-medium text-[#92400E]">Chamados restaurados mantêm o histórico completo.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-brand-light">
                  {["Protocolo", "Cliente / Veículo", "Status", "Prioridade", "Ações"].map((titulo) => <th key={titulo} scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{titulo}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {chamados.map((chamado) => (
                  <tr key={chamado.id}>
                    <td className="px-5 py-4 text-sm font-bold text-[#94A3B8]">#{chamado.id}</td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-[#475569]">{chamado.cliente}</div>
                      <div className="text-xs text-[#94A3B8]">{[chamado.modelo, chamado.placa].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={chamado.status} /></td>
                    <td className="px-5 py-4"><PrioridadeIndicador prioridade={chamado.prioridade} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => restauracao.mutate(chamado.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] hover:underline">
                          <RotateCcw size={12} aria-hidden /> Restaurar
                        </button>
                        {confirmandoId === chamado.id ? (
                          <span className="flex items-center gap-1">
                            <button type="button" onClick={() => exclusao.mutate(chamado.id)} className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Confirmar</button>
                            <button type="button" aria-label="Cancelar exclusão definitiva" onClick={() => setConfirmandoId(null)} className="text-xs text-[#94A3B8]">✕</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setConfirmandoId(chamado.id)} className="text-xs font-semibold text-[#EF4444] hover:underline">Excluir</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Lixeira() {
  return <PerfilRequerido perfis={PERFIS_DA_LIXEIRA}><ConteudoDaLixeira /></PerfilRequerido>;
}
