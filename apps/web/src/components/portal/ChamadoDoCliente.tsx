"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Chamado } from "@/types/chamado";
import ComChamado from "@/components/chamados/ComChamado";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import TimelineChamado from "@/components/chamados/TimelineChamado";
import AnexosDoChamado from "@/components/chamados/AnexosDoChamado";
import LocalizacaoDoChamado from "@/components/chamados/LocalizacaoDoChamado";
import { PrioridadeIndicador, StatusBadge } from "@/components/ui/StatusBadge";
import EtapasDoChamado from "@/components/portal/EtapasDoChamado";
import EncerramentoPeloSolicitante from "@/components/portal/EncerramentoPeloSolicitante";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DE_CLIENTE } from "@/utils/perfis";

function ConteudoDoChamado({ chamado }: { chamado: Chamado }) {
  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-start gap-4">
          <Link href="/portal" aria-label="Voltar aos meus chamados" className="alvo-toque flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B]">
            <ChevronLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-brand-navy">Chamado {chamado.id}</h1>
            <p className="text-sm text-slate-500">Aberto em {formatarDataHora(chamado.abertura)}</p>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:grid-cols-3">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Status atual</div>
            <StatusBadge status={chamado.status} />
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Prioridade</div>
            <PrioridadeIndicador prioridade={chamado.prioridade} />
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Última atualização</div>
            <div className="text-sm font-semibold text-brand-dark">{formatarDataHora(chamado.atualizadoEm)}</div>
          </div>
          {chamado.motivo && (
            <p className="text-sm text-slate-600 sm:col-span-3"><span className="font-semibold">Motivo:</span> {chamado.motivo.descricao}</p>
          )}
        </section>

        <EtapasDoChamado chamado={chamado} />
        <EncerramentoPeloSolicitante chamado={chamado} />
        <TimelineChamado chamado={chamado} visaoDeCliente />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <LocalizacaoDoChamado chamado={chamado} />
          <AnexosDoChamado chamado={chamado} />
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
