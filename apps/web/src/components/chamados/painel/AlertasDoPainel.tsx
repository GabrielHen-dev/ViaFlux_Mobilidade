"use client";

import Link from "next/link";
import { ClipboardList, Siren } from "lucide-react";
import type { ResumoChamados } from "@/types/chamado";
import { ContagemRegressiva } from "@/components/ui/SlaIndicador";

export function AlertaDeP1({ resumo }: { resumo: ResumoChamados }) {
  if (resumo.p1SemPrimeiraResposta.length === 0) return null;
  return (
    <div role="alert" className="mb-5 flex flex-col gap-2 rounded-2xl border-2 border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
      <span className="flex items-center gap-2 text-sm font-bold text-red-700"><Siren size={18} aria-hidden /> P1 sem 1ª resposta ({resumo.p1SemPrimeiraResposta.length})</span>
      <span className="flex flex-wrap gap-2 sm:ml-2">
        {resumo.p1SemPrimeiraResposta.map((codigo) => (
          <Link key={codigo} href={`/chamados/${codigo}`} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-red-700 underline-offset-2 hover:underline">{codigo}</Link>
        ))}
      </span>
      <span className="text-xs text-red-700 sm:ml-auto">Acione a Central de Assistência / Plantão se o prazo de 15 min estiver estourado.</span>
    </div>
  );
}

function Contador({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: string }) {
  return (
    <div className="min-w-[96px]">
      <div className={`font-display text-xl font-bold tabular-nums ${valor > 0 && destaque ? destaque : "text-brand-dark"}`}>{valor}</div>
      <div className="text-xs text-slate-500">{rotulo}</div>
    </div>
  );
}

export function ContadoresDaTriagem({ resumo, comLink }: { resumo: ResumoChamados; comLink: boolean }) {
  const { triagem } = resumo;
  const total = triagem.aguardando + triagem.emAndamento;
  return (
    <section aria-label="Fila de triagem" className="mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-brand-navy"><ClipboardList size={16} aria-hidden /> Triagem</h2>
      <Contador rotulo="aguardando" valor={triagem.aguardando} />
      <Contador rotulo="em andamento" valor={triagem.emAndamento} />
      <Contador rotulo="na metade do prazo" valor={triagem.emRisco} destaque="text-amber-600" />
      <Contador rotulo="atrasados" valor={triagem.atrasados} destaque="text-red-600" />
      {triagem.proximoLimite && (
        <div className="text-xs text-slate-500">
          Próximo limite: <ContagemRegressiva limite={triagem.proximoLimite} />
        </div>
      )}
      {comLink && total > 0 && (
        <Link href="/triagem" className="alvo-toque ml-auto rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Abrir fila de triagem</Link>
      )}
    </section>
  );
}
