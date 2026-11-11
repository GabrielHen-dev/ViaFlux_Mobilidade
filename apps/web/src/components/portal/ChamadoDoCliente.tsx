"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Chamado } from "@/types/chamado";
import ComChamado from "@/components/chamados/ComChamado";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import ChatDoChamado from "@/components/chamados/ChatDoChamado";
import AnexosDoChamado from "@/components/chamados/AnexosDoChamado";
import LocalizacaoDoChamado from "@/components/chamados/LocalizacaoDoChamado";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import EtapasDoChamado from "@/components/portal/EtapasDoChamado";
import EncerramentoPeloSolicitante from "@/components/portal/EncerramentoPeloSolicitante";
import { AvisoDeCancelamento } from "@/components/chamados/CancelamentoDoChamado";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DE_CLIENTE } from "@/utils/perfis";

function ConteudoDoChamado({ chamado }: { chamado: Chamado }) {
  return (
    <main id="conteudo" className="vf-pagina">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="vf-cabecalho-pagina !mx-0 !mt-0 flex items-start gap-4 rounded border border-linha">
          <Link href="/portal" aria-label="Voltar aos meus chamados" className="alvo-toque flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-linha text-tinta-suave hover:bg-fundo">
            <ChevronLeft size={16} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-tinta">Chamado {chamado.id}</h1>
              <StatusBadge status={chamado.status} />
            </div>
            <p className="text-sm text-tinta-suave">Aberto em {formatarDataHora(chamado.abertura)}</p>
          </div>
        </div>

        <AvisoDeCancelamento chamado={chamado} podeReabrir visaoDeCliente />
        <EtapasDoChamado chamado={chamado} />
        <EncerramentoPeloSolicitante chamado={chamado} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4 lg:order-2">
            <ChatDoChamado chamado={chamado} visaoDeCliente eventos={chamado.timeline.filter((evento) => evento.tipo !== "ATUALIZACAO")} />
          </div>
          <div className="min-w-0 space-y-4 lg:order-1">
            <section className="vf-cartao" aria-labelledby="resumo-do-chamado">
              <div className="border-b border-linha px-4 py-3"><h2 id="resumo-do-chamado" className="text-sm font-medium text-tinta">Resumo</h2></div>
              <dl className="space-y-3 p-4 text-sm">
                <div>
                  <dt className="mb-1 text-xs text-tinta-apagada">Status</dt>
                  <dd><StatusBadge status={chamado.status} /></dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs text-tinta-apagada">Prioridade</dt>
                  <dd><PrioridadeIndicador prioridade={chamado.prioridade} /></dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs text-tinta-apagada">Última atualização</dt>
                  <dd className="font-medium text-tinta">{formatarDataHora(chamado.atualizadoEm)}</dd>
                </div>
                {chamado.motivo && (
                  <div>
                    <dt className="mb-1 text-xs text-tinta-apagada">Motivo</dt>
                    <dd className="text-tinta-suave">{chamado.motivo.descricao}</dd>
                  </div>
                )}
              </dl>
            </section>
            <LocalizacaoDoChamado chamado={chamado} somenteLeitura={chamado.status === "Cancelado"} />
            <AnexosDoChamado chamado={chamado} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ChamadoDoCliente({ id }: { id: string }) {
  return (
    <PerfilRequerido perfis={PERFIS_DE_CLIENTE}>
      <ComChamado id={id}>{(chamado) => <ConteudoDoChamado key={chamado.id} chamado={chamado} />}</ComChamado>
    </PerfilRequerido>
  );
}
