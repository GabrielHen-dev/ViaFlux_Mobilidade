"use client";

import Link from "next/link";
import { ChevronLeft, Truck } from "lucide-react";
import type { Chamado, ServicoTerceiro } from "@/types/chamado";
import ComChamado from "@/components/chamados/ComChamado";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatusServicoBadge } from "@/components/ui/StatusServico";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DA_CENTRAL } from "@/utils/perfis";

function AcompanhamentoConteudo({ chamado, servico }: { chamado: Chamado; servico: ServicoTerceiro }) {
  const historico = [...servico.historico].reverse();
  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <Link aria-label="Voltar ao chamado" href={`/chamados/${chamado.id}`} className="alvo-toque flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B]">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">#{chamado.id} · Serviço terceirizado</p>
            <h1 className="font-display text-xl font-bold text-brand-navy">Acompanhamento do Serviço</h1>
          </div>
        </div>

        <section className="mb-5 grid grid-cols-1 gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Fornecedor</div>
            <div className="flex items-center gap-2 font-semibold text-brand-dark"><Truck size={16} aria-hidden /> {servico.fornecedor.nome}</div>
            <div className="text-xs text-slate-500">{servico.fornecedor.especialidade} · {servico.tipoServico}</div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Último status informado</div>
            <StatusServicoBadge status={servico.status} />
            <div className="mt-1 text-xs text-slate-500">em {formatarDataHora(servico.atualizadoEm)}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Status do chamado (independente do serviço)</div>
            <StatusBadge status={chamado.status} />
          </div>
        </section>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6">
          <h2 className="mb-4 font-display text-sm font-semibold text-brand-navy">Histórico de atualizações do fornecedor</h2>
          <ol className="space-y-4">
            {historico.map((registro) => (
              <li key={`${registro.status}-${registro.registradoEm}`} className="border-l-2 border-[#E2E8F0] pl-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusServicoBadge status={registro.status} />
                  <time dateTime={registro.registradoEm} className="text-xs text-slate-400">{formatarDataHora(registro.registradoEm)}</time>
                </div>
                <p className="mt-1 text-xs text-slate-500">{registro.autor.nome}</p>
                {registro.observacao && <p className="mt-1 text-sm text-slate-600">{registro.observacao}</p>}
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
            Cada atualização do fornecedor também entra na timeline do chamado #{chamado.id}. A atualização do serviço não pausa o SLA do chamado.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function AcompanhamentoTerceiro({ id }: { id: string }) {
  return (
    <PerfilRequerido perfis={PERFIS_DA_CENTRAL}>
      <ComChamado id={id}>
        {(chamado) => chamado.servico ? <AcompanhamentoConteudo key={chamado.id} chamado={chamado} servico={chamado.servico} /> : (
          <main id="conteudo" className="p-4 md:p-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h1 className="text-xl font-bold text-brand-navy">Nenhum serviço terceirizado vinculado</h1>
              <Link className="mt-4 inline-block text-sm font-semibold text-brand-blue" href={`/chamados/${id}`}>Voltar ao chamado</Link>
            </div>
          </main>
        )}
      </ComChamado>
    </PerfilRequerido>
  );
}
