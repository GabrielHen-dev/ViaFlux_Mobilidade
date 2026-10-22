"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Hand, RefreshCw } from "lucide-react";
import type { ChamadoResumo } from "@/types/chamado";
import { iniciarTriagem } from "@/services/api/chamados";
import { useApi, useUsuarioAutenticado } from "@/store/AuthContext";
import { chaves, invalidarListas, useListaDeChamados } from "@/hooks/consultas";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrazoDaTriagem } from "@/components/triagem/PrazoDaTriagem";
import { AvisoDeErro, Carregando, FalhaAoCarregar } from "@/components/feedback/EstadoDaConsulta";
import { NOME_TIPO } from "@/utils/prioridade";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DE_TRIAGEM } from "@/utils/perfis";

const LIMITE_DA_FILA = 100;
const COLUNAS = ["Protocolo", "Cliente", "Tipo informado", "Status", "Prazo da triagem", "Responsável", "Ação"];

function AcaoDaLinha({ chamado }: { chamado: ChamadoResumo }) {
  const api = useApi();
  const usuario = useUsuarioAutenticado();
  const router = useRouter();
  const clienteDeConsultas = useQueryClient();
  const destino = `/chamados/${chamado.id}/triagem`;
  const assumir = useMutation({
    mutationFn: () => iniciarTriagem(api, chamado.id),
    onSuccess: (atualizado) => {
      clienteDeConsultas.setQueryData(chaves.detalhe(chamado.id), atualizado);
      void invalidarListas(clienteDeConsultas);
      router.push(destino);
    },
  });

  if (chamado.triagem.responsavel?.id === usuario.id) {
    return <Link href={destino} className="alvo-toque inline-flex rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Continuar</Link>;
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={assumir.isPending}
        onClick={() => assumir.mutate()}
        aria-label={`Assumir triagem do chamado ${chamado.id}`}
        className="alvo-toque inline-flex items-center gap-1.5 rounded-lg border border-brand-green px-3 py-1.5 text-xs font-semibold text-brand-green hover:bg-emerald-50 disabled:opacity-50"
      >
        <Hand size={12} aria-hidden /> {assumir.isPending ? "Assumindo…" : "Assumir"}
      </button>
      {assumir.isError && <AvisoDeErro erro={assumir.error} />}
    </div>
  );
}

function ConteudoDaFila() {
  const lista = useListaDeChamados({ etapa: "TRIAGEM", ordenacao: "fila", size: LIMITE_DA_FILA });
  const chamados = lista.data?.content ?? [];

  return (
    <main id="conteudo" className="min-w-0 p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-brand-navy"><ClipboardList size={22} aria-hidden /> Fila de triagem</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">
            Chamados que ainda não foram classificados, do prazo mais curto para o mais longo. O prazo segue a urgência informada pelo cliente.
          </p>
        </div>
        <button type="button" onClick={() => void lista.refetch()} className="alvo-toque inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={14} className={lista.isFetching ? "animate-spin" : undefined} aria-hidden /> Atualizar
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white" aria-labelledby="titulo-fila-triagem">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-4">
          <h2 id="titulo-fila-triagem" className="font-display text-sm font-semibold text-brand-navy">Aguardando triagem</h2>
          {lista.data && <span className="text-xs text-[#94A3B8]">{lista.data.totalElements} chamado{lista.data.totalElements !== 1 ? "s" : ""}</span>}
        </div>
        {lista.isPending ? <Carregando texto="Carregando a fila de triagem…" /> : lista.isError ? (
          <div className="p-5"><FalhaAoCarregar erro={lista.error} aoTentarDeNovo={() => void lista.refetch()} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="bg-brand-light">
                  {COLUNAS.map((titulo) => <th key={titulo} scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{titulo}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {chamados.map((chamado) => (
                  <tr key={chamado.id}>
                    <td className="px-5 py-4"><Link href={`/chamados/${chamado.id}`} className="text-sm font-bold text-brand-blue">#{chamado.id}</Link></td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-brand-dark">{chamado.cliente}</div>
                      <div className="mt-0.5 text-xs text-[#94A3B8]">aberto em {formatarDataHora(chamado.abertura)}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#475569]">{chamado.tipo ? NOME_TIPO[chamado.tipo] : "Exceção · Central"}</td>
                    <td className="px-5 py-4"><StatusBadge status={chamado.status} /></td>
                    <td className="px-5 py-4"><PrazoDaTriagem triagem={chamado.triagem} compacto /></td>
                    <td className="px-5 py-4 text-sm text-[#475569]">{chamado.triagem.responsavel?.nome ?? "—"}</td>
                    <td className="px-5 py-4"><AcaoDaLinha chamado={chamado} /></td>
                  </tr>
                ))}
                {chamados.length === 0 && (
                  <tr><td colSpan={COLUNAS.length} className="px-5 py-12 text-center text-sm text-[#94A3B8]">Nenhum chamado aguardando triagem.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default function FilaDeTriagem() {
  return (
    <PerfilRequerido perfis={PERFIS_DE_TRIAGEM}>
      <ConteudoDaFila />
    </PerfilRequerido>
  );
}
