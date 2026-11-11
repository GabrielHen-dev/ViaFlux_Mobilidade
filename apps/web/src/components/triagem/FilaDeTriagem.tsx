"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Hand, RefreshCw } from "lucide-react";
import type { ChamadoResumo } from "@/types/chamado";
import { iniciarTriagem } from "@/services/api/chamados";
import { useApi, useUsuarioAutenticado } from "@/store/AuthContext";
import { chaves, invalidarListas, useListaDeChamados } from "@/hooks/consultas";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrazoDaTriagem } from "@/components/triagem/PrazoDaTriagem";
import { SlaResumo } from "@/components/ui/SlaIndicador";
import { AvisoDeErro, Carregando, FalhaAoCarregar } from "@/components/feedback/EstadoDaConsulta";
import { NOME_TIPO } from "@/utils/prioridade";
import { formatarDataHora } from "@/utils/date";

const LIMITE_DA_FILA = 100;
const COLUNAS = ["Protocolo", "Cliente", "Classificação", "Status", "Prazo", "Responsável", "Ação"];

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
    return <Link href={destino} className="alvo-toque inline-flex rounded-lg vf-botao-primario px-3 py-1.5 text-xs font-semibold text-white">Abrir</Link>;
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={assumir.isPending}
        onClick={() => assumir.mutate()}
        aria-label={`Analisar chamado ${chamado.id}`}
        className="vf-botao-secundario alvo-toque inline-flex items-center gap-1.5 px-3 py-1.5"
      >
        <Hand size={12} aria-hidden /> {assumir.isPending ? "Assumindo…" : "Analisar"}
      </button>
      {assumir.isError && <AvisoDeErro erro={assumir.error} />}
    </div>
  );
}

export function TabelaDaFilaDeTriagem() {
  const lista = useListaDeChamados({ etapa: "TRIAGEM", ordenacao: "fila", size: LIMITE_DA_FILA });
  const chamados = lista.data?.content ?? [];

  return (
    <section className="vf-cartao overflow-hidden" aria-labelledby="titulo-fila-triagem">
      <div className="flex items-center justify-between border-b border-linha px-4 py-3">
        <h2 id="titulo-fila-triagem" className="text-sm font-medium text-tinta">Pendentes de análise</h2>
        <div className="flex items-center gap-3">
          {lista.data && <span className="text-xs text-tinta-apagada">{lista.data.totalElements} chamado{lista.data.totalElements !== 1 ? "s" : ""}</span>}
          <button type="button" onClick={() => void lista.refetch()} aria-label="Atualizar fila de análise" className="alvo-toque flex h-8 w-8 items-center justify-center rounded text-tinta-apagada hover:bg-fundo hover:text-tinta">
            <RefreshCw size={14} className={lista.isFetching ? "animate-spin" : undefined} aria-hidden />
          </button>
        </div>
      </div>
      {lista.isPending ? <Carregando texto="Carregando…" /> : lista.isError ? (
        <div className="p-4"><FalhaAoCarregar erro={lista.error} aoTentarDeNovo={() => void lista.refetch()} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="vf-tabela min-w-[880px]">
            <thead>
              <tr>
                {COLUNAS.map((titulo) => <th key={titulo} scope="col" className="px-4 py-2.5 text-left">{titulo}</th>)}
              </tr>
            </thead>
            <tbody>
              {chamados.map((chamado) => (
                <tr key={chamado.id}>
                  <td className="px-4 py-2.5"><Link href={`/chamados/${chamado.id}`} className="text-sm font-medium text-acao">#{chamado.id}</Link></td>
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-medium text-tinta">{chamado.cliente}</div>
                    <div className="mt-0.5 text-xs text-tinta-apagada">aberto em {formatarDataHora(chamado.abertura)}</div>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-tinta-suave">
                    <div>{chamado.tipo ? NOME_TIPO[chamado.tipo] : "Não classificado"}</div>
                    <div className="mt-0.5 text-xs text-tinta-apagada">{chamado.triagem.revisaoPendente ? "Automática · revisar" : "Classificação manual"}</div>
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={chamado.status} /></td>
                  <td className="px-4 py-2.5">{chamado.triagem.revisaoPendente ? <SlaResumo sla={chamado.sla} /> : <PrazoDaTriagem triagem={chamado.triagem} compacto />}</td>
                  <td className="px-4 py-2.5 text-sm text-tinta-suave">{chamado.triagem.responsavel?.nome ?? "—"}</td>
                  <td className="px-4 py-2.5"><AcaoDaLinha chamado={chamado} /></td>
                </tr>
              ))}
              {chamados.length === 0 && (
                <tr><td colSpan={COLUNAS.length} className="px-4 py-12 text-center text-sm text-tinta-apagada">Nenhum chamado pendente.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
