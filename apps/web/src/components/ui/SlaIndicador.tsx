"use client";

import { Check, CircleCheck, CircleX, Clock, Pause, TriangleAlert, type LucideIcon } from "lucide-react";
import type { PrazoSla, Sla, SituacaoSla } from "@/types/chamado";
import { useAgora } from "@/hooks/useAgora";
import { cn } from "@/utils/cn";
import { descreverTempoAte, formatarDataHora, formatarDuracao } from "@/utils/date";

const APARENCIA: Record<SituacaoSla, { rotulo: string; fundo: string; texto: string; barra: string; Icone: LucideIcon }> = {
  NO_PRAZO: { rotulo: "No prazo", fundo: "#F0FDF4", texto: "#15803D", barra: "bg-brand-green", Icone: Clock },
  EM_RISCO: { rotulo: "Em risco", fundo: "#FFF7ED", texto: "#C2410C", barra: "bg-amber-500", Icone: TriangleAlert },
  VIOLADO: { rotulo: "Vencido", fundo: "#FEF2F2", texto: "#B91C1C", barra: "bg-red-500", Icone: CircleX },
  CUMPRIDO: { rotulo: "Cumprido", fundo: "#F0FDF4", texto: "#15803D", barra: "bg-brand-green", Icone: CircleCheck },
  CUMPRIDO_COM_ATRASO: { rotulo: "Cumprido com atraso", fundo: "#FEF2F2", texto: "#B91C1C", barra: "bg-red-500", Icone: CircleCheck },
};

export type EtapaDoSla = "INICIO" | "SOLUCAO";

export const NOME_DA_ETAPA: Record<EtapaDoSla, string> = {
  INICIO: "Início do atendimento",
  SOLUCAO: "Solução",
};

export function rotuloDaSituacao(situacao: SituacaoSla) {
  return APARENCIA[situacao].rotulo;
}

export function etapaVigente(sla: Sla): { etapa: EtapaDoSla; prazo: PrazoSla; concluido: boolean } {
  if (sla.primeiraResposta.cumpridoEm === null) return { etapa: "INICIO", prazo: sla.primeiraResposta, concluido: false };
  return { etapa: "SOLUCAO", prazo: sla.resolucao, concluido: sla.resolucao.cumpridoEm !== null };
}

export function slaVencido(sla: Sla | null) {
  return sla !== null && [sla.primeiraResposta, sla.resolucao].some((prazo) => prazo.cumpridoEm === null && prazo.situacao === "VIOLADO");
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
  const { etapa, prazo, concluido } = etapaVigente(sla);
  return (
    <div className="flex flex-col items-start gap-1">
      <SituacaoSlaBadge situacao={prazo.situacao} />
      <span className="text-xs text-slate-500">
        {NOME_DA_ETAPA[etapa]} · {concluido && prazo.cumpridoEm ? `em ${formatarDataHora(prazo.cumpridoEm)}` : <ContagemRegressiva limite={prazo.limite} />}
      </span>
    </div>
  );
}

function progressoAte(inicio: string, limite: string, agora: Date) {
  const total = new Date(limite).getTime() - new Date(inicio).getTime();
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((agora.getTime() - new Date(inicio).getTime()) / total) * 100));
}

function MarcoDoSla({ etapa, prazo, vigente }: { etapa: EtapaDoSla; prazo: PrazoSla; vigente: boolean }) {
  const cumprido = prazo.cumpridoEm !== null;
  const { texto } = APARENCIA[prazo.situacao];
  return (
    <li className="relative flex min-w-0 flex-1 flex-col gap-1">
      <span
        aria-hidden
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white",
          cumprido ? "border-brand-green bg-brand-green text-white" : vigente ? "border-brand-blue" : "border-slate-200",
        )}
        style={!cumprido && vigente && prazo.situacao !== "NO_PRAZO" ? { borderColor: texto } : undefined}
      >
        {cumprido ? <Check size={13} strokeWidth={3} /> : <span className={cn("h-2 w-2 rounded-full", vigente ? "bg-brand-blue" : "bg-slate-200")} style={vigente && prazo.situacao !== "NO_PRAZO" ? { background: texto } : undefined} />}
      </span>
      <span className={cn("text-xs font-semibold", vigente ? "text-brand-navy" : "text-slate-500")}>{NOME_DA_ETAPA[etapa]}</span>
      <span className="text-[11px] leading-snug text-slate-500">
        {cumprido ? `Concluído em ${formatarDataHora(prazo.cumpridoEm as string)}` : `Até ${formatarDataHora(prazo.limite)}`}
      </span>
      {(cumprido || prazo.situacao !== "NO_PRAZO") && <span><SituacaoSlaBadge situacao={prazo.situacao} /></span>}
    </li>
  );
}

export function SlaDoChamado({ sla, abertura }: { sla: Sla; abertura: string }) {
  const agora = useAgora();
  const { etapa, prazo, concluido } = etapaVigente(sla);
  const pausado = etapa === "SOLUCAO" && sla.pausado;
  const progresso = concluido ? 100 : progressoAte(abertura, prazo.limite, agora);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">{concluido ? "Atendimento concluído" : `Etapa atual · ${NOME_DA_ETAPA[etapa]}`}</span>
          <SituacaoSlaBadge situacao={prazo.situacao} />
        </div>
        <div className="font-display text-xl font-bold text-brand-dark">
          {concluido && prazo.cumpridoEm
            ? `Solução em ${formatarDataHora(prazo.cumpridoEm)}`
            : pausado
              ? <span className="inline-flex items-center gap-1.5"><Pause size={16} aria-hidden /> Prazo pausado</span>
              : <ContagemRegressiva limite={prazo.limite} />}
        </div>
        <div
          role="progressbar"
          aria-label={`Prazo consumido: ${NOME_DA_ETAPA[etapa]}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progresso)}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
        >
          <div className={cn("h-full rounded-full transition-[width] duration-700", pausado ? "bg-slate-300" : APARENCIA[prazo.situacao].barra)} style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <ol className="relative flex gap-4" aria-label="Etapas do SLA">
        <span aria-hidden className="absolute left-3 right-[calc(50%+0.75rem)] top-3 h-0.5 -translate-y-1/2 bg-slate-100" />
        <MarcoDoSla etapa="INICIO" prazo={sla.primeiraResposta} vigente={etapa === "INICIO"} />
        <MarcoDoSla etapa="SOLUCAO" prazo={sla.resolucao} vigente={etapa === "SOLUCAO" && !concluido} />
      </ol>

      {sla.tempoPausadoMinutos > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Pause size={11} aria-hidden /> Pausado aguardando o cliente: {formatarDuracao(sla.tempoPausadoMinutos)}
        </p>
      )}
    </div>
  );
}
