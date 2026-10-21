"use client";

import { CircleCheck, CircleX, Clock, Pause, TriangleAlert, type LucideIcon } from "lucide-react";
import type { PrazoSla, Sla, SituacaoSla } from "@/types/chamado";
import { useAgora } from "@/hooks/useAgora";
import { descreverTempoAte, formatarDataHora, formatarDuracao } from "@/utils/date";

const APARENCIA: Record<SituacaoSla, { rotulo: string; fundo: string; texto: string; Icone: LucideIcon }> = {
  NO_PRAZO: { rotulo: "No prazo", fundo: "#F0FDF4", texto: "#15803D", Icone: Clock },
  EM_RISCO: { rotulo: "Em risco", fundo: "#FFF7ED", texto: "#C2410C", Icone: TriangleAlert },
  VIOLADO: { rotulo: "Violado", fundo: "#FEF2F2", texto: "#B91C1C", Icone: CircleX },
  CUMPRIDO: { rotulo: "Cumprido", fundo: "#F0FDF4", texto: "#15803D", Icone: CircleCheck },
  CUMPRIDO_COM_ATRASO: { rotulo: "Cumprido com atraso", fundo: "#FEF2F2", texto: "#B91C1C", Icone: CircleCheck },
};

const GRAVIDADE: Record<SituacaoSla, number> = { VIOLADO: 4, EM_RISCO: 3, CUMPRIDO_COM_ATRASO: 2, NO_PRAZO: 1, CUMPRIDO: 0 };

export function rotuloDaSituacao(situacao: SituacaoSla) {
  return APARENCIA[situacao].rotulo;
}

export function prazoMaisCritico(sla: Sla) {
  const prazos = [
    { nome: "1ª resposta", prazo: sla.primeiraResposta },
    { nome: "Resolução", prazo: sla.resolucao },
  ];
  return prazos.sort((a, b) => GRAVIDADE[b.prazo.situacao] - GRAVIDADE[a.prazo.situacao] || a.prazo.limite.localeCompare(b.prazo.limite))
    .find(({ prazo }) => prazo.cumpridoEm === null) ?? prazos[0];
}

export function SituacaoSlaBadge({ situacao }: { situacao: SituacaoSla }) {
  const { rotulo, fundo, texto, Icone } = APARENCIA[situacao];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: fundo, color: texto }}>
      <Icone size={11} strokeWidth={2.75} aria-hidden />
      {rotulo}
    </span>
  );
}

export function ContagemRegressiva({ limite }: { limite: string }) {
  const agora = useAgora();
  const vencido = new Date(limite).getTime() < agora.getTime();
  return (
    <time dateTime={limite} className={vencido ? "tabular-nums text-red-700" : "tabular-nums"} suppressHydrationWarning>
      {descreverTempoAte(limite, agora)}
    </time>
  );
}

export function SlaResumo({ sla }: { sla: Sla | null }) {
  if (!sla) return <span className="text-xs text-slate-400">—</span>;
  const { nome, prazo } = prazoMaisCritico(sla);
  return (
    <div className="flex flex-col items-start gap-1">
      <SituacaoSlaBadge situacao={prazo.situacao} />
      <span className="text-xs text-slate-500">
        {nome} · {prazo.cumpridoEm ? `em ${formatarDataHora(prazo.cumpridoEm)}` : <ContagemRegressiva limite={prazo.limite} />}
      </span>
    </div>
  );
}

function LinhaDoPrazo({ titulo, prazo, pausado }: { titulo: string; prazo: PrazoSla; pausado?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</span>
        <SituacaoSlaBadge situacao={prazo.situacao} />
      </div>
      <div className="font-display text-base font-bold text-brand-dark">
        {prazo.cumpridoEm ? `Concluído em ${formatarDataHora(prazo.cumpridoEm)}` : pausado ? "Relógio pausado" : <ContagemRegressiva limite={prazo.limite} />}
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
        {pausado && <Pause size={11} aria-hidden />}
        Prazo: {formatarDataHora(prazo.limite)}
      </div>
    </div>
  );
}

export function SlaDoChamado({ sla }: { sla: Sla }) {
  return (
    <div className="space-y-2">
      <LinhaDoPrazo titulo="1ª resposta" prazo={sla.primeiraResposta} />
      <LinhaDoPrazo titulo="Resolução" prazo={sla.resolucao} pausado={sla.pausado} />
      {sla.tempoPausadoMinutos > 0 && (
        <p className="text-xs text-slate-500">Tempo total pausado (aguardando cliente): {formatarDuracao(sla.tempoPausadoMinutos)}</p>
      )}
    </div>
  );
}
