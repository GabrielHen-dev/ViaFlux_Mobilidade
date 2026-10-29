"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ClipboardList, ScanSearch, Siren, Timer, type LucideIcon } from "lucide-react";
import type { ContadoresSla, ResumoChamados } from "@/types/chamado";
import { ContagemRegressiva } from "@/components/ui/SlaIndicador";

export function AlertaDeP1({ resumo }: { resumo: ResumoChamados }) {
  if (resumo.p1SemPrimeiraResposta.length === 0) return null;
  return (
    <div role="alert" className="mb-5 flex flex-col gap-2 rounded-2xl border-2 border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
      <span className="flex items-center gap-2 text-sm font-bold text-red-700"><Siren size={18} aria-hidden /> P1 sem início de atendimento ({resumo.p1SemPrimeiraResposta.length})</span>
      <span className="flex flex-wrap gap-2 sm:ml-2">
        {resumo.p1SemPrimeiraResposta.map((codigo) => (
          <Link key={codigo} href={`/chamados/${codigo}`} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-red-700 underline-offset-2 hover:underline">{codigo}</Link>
        ))}
      </span>
      <span className="text-xs text-red-700 sm:ml-auto">Prazo de início: 15 min</span>
    </div>
  );
}

function Contador({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: string }) {
  return (
    <div className="min-w-[84px]">
      <div className={`font-display text-xl font-bold tabular-nums ${valor > 0 && destaque ? destaque : "text-brand-dark"}`}>{valor}</div>
      <div className="text-xs text-slate-500">{rotulo}</div>
    </div>
  );
}

function GrupoDeContadores({ titulo, Icone, children }: { titulo: string; Icone: LucideIcon; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-brand-navy"><Icone size={16} aria-hidden /> {titulo}</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-3">{children}</div>
    </section>
  );
}

function ContadoresDoSla({ titulo, contadores }: { titulo: string; contadores: ContadoresSla }) {
  return (
    <GrupoDeContadores titulo={titulo} Icone={Timer}>
      <Contador rotulo="no prazo" valor={contadores.noPrazo} />
      <Contador rotulo="em risco" valor={contadores.emRisco} destaque="text-amber-600" />
      <Contador rotulo="vencidos" valor={contadores.violado} destaque="text-red-600" />
    </GrupoDeContadores>
  );
}

export function ContadoresDaOperacao({ resumo, comLink }: { resumo: ResumoChamados; comLink: boolean }) {
  const { porStatus, sla, triagem } = resumo;
  const aClassificar = triagem.aguardando + triagem.emAndamento;
  const pendentes = aClassificar + triagem.aguardandoRevisao;
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <GrupoDeContadores titulo="Fila ativa" Icone={ClipboardList}>
        <Contador rotulo="na fila" valor={porStatus["Na fila"] ?? 0} />
        <Contador rotulo="em atendimento" valor={porStatus["Em atendimento"] ?? 0} />
        <Contador rotulo="aguardando" valor={porStatus["Aguardando"] ?? 0} />
      </GrupoDeContadores>
      <ContadoresDoSla titulo="Prazos (SLA)" contadores={sla.vigente} />
      <GrupoDeContadores titulo="Atenção" Icone={ScanSearch}>
        <Contador rotulo="a classificar" valor={aClassificar} destaque="text-amber-600" />
        <Contador rotulo="a revisar" valor={triagem.aguardandoRevisao} destaque="text-amber-600" />
        <Contador rotulo="escalonados" valor={resumo.escalonados} destaque="text-red-600" />
        {comLink && pendentes > 0 && (
          <Link href="/triagem" className="alvo-toque self-center rounded-xl bg-brand-green px-3 py-2 text-xs font-semibold text-white hover:opacity-90">Analisar</Link>
        )}
        {triagem.proximoLimite && (
          <div className="basis-full text-xs text-slate-500">
            Próximo prazo de classificação: <ContagemRegressiva limite={triagem.proximoLimite} />
          </div>
        )}
      </GrupoDeContadores>
    </div>
  );
}
