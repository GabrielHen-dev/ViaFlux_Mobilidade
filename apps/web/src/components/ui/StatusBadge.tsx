import { ArrowDown, Ban, ChevronsUp, CircleCheck, CircleDot, ClipboardList, Equal, Hourglass, ListOrdered, Lock, Pause, Siren, Zap, type LucideIcon } from "lucide-react";
import type { CodigoPrioridade, Status } from "@/types/chamado";
import { ROTULO_PRIORIDADE } from "@/utils/prioridade";
import { cn } from "@/utils/cn";

interface Aparencia {
  fundo: string;
  texto: string;
  Icone: LucideIcon;
}

export const APARENCIA_DO_STATUS: Record<Status, Aparencia> = {
  "Aberto": { fundo: "var(--vf-status-aberto-fundo)", texto: "var(--vf-status-aberto)", Icone: CircleDot },
  "Em triagem": { fundo: "var(--vf-status-triagem-fundo)", texto: "var(--vf-status-triagem)", Icone: ClipboardList },
  "Na fila": { fundo: "var(--vf-status-fila-fundo)", texto: "var(--vf-status-fila)", Icone: ListOrdered },
  "Em atendimento": { fundo: "var(--vf-status-atendimento-fundo)", texto: "var(--vf-status-atendimento)", Icone: Zap },
  "Aguardando": { fundo: "var(--vf-status-aguardando-fundo)", texto: "var(--vf-status-aguardando)", Icone: Pause },
  "Resolvido": { fundo: "var(--vf-status-resolvido-fundo)", texto: "var(--vf-status-resolvido)", Icone: CircleCheck },
  "Fechado": { fundo: "var(--vf-status-fechado-fundo)", texto: "var(--vf-status-fechado)", Icone: Lock },
  "Cancelado": { fundo: "var(--vf-status-cancelado-fundo)", texto: "var(--vf-status-cancelado)", Icone: Ban },
};

export const APARENCIA_DA_PRIORIDADE: Record<CodigoPrioridade, Aparencia> = {
  P1: { fundo: "var(--vf-prioridade-p1-fundo)", texto: "var(--vf-prioridade-p1)", Icone: Siren },
  P2: { fundo: "var(--vf-prioridade-p2-fundo)", texto: "var(--vf-prioridade-p2)", Icone: ChevronsUp },
  P3: { fundo: "var(--vf-prioridade-p3-fundo)", texto: "var(--vf-prioridade-p3)", Icone: Equal },
  P4: { fundo: "var(--vf-prioridade-p4-fundo)", texto: "var(--vf-prioridade-p4)", Icone: ArrowDown },
};

export function StatusBadge({ status }: { status: Status }) {
  const { fundo, texto, Icone } = APARENCIA_DO_STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium" style={{ background: fundo, color: texto }}>
      <Icone size={12} strokeWidth={2.5} aria-hidden />
      {status}
    </span>
  );
}

export const ROTULO_SEM_TRIAGEM = "Aguardando classificação";

export function PrioridadeIndicador({ prioridade, score, className }: { prioridade: CodigoPrioridade | null; score?: number | null; className?: string }) {
  if (prioridade === null) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600", className)}>
        <Hourglass size={12} strokeWidth={2.5} aria-hidden />
        {ROTULO_SEM_TRIAGEM}
      </span>
    );
  }
  const { fundo, texto, Icone } = APARENCIA_DA_PRIORIDADE[prioridade];
  const rotulo = `${prioridade} · ${ROTULO_PRIORIDADE[prioridade]}`;
  const comScore = score !== undefined && score !== null;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium", className)}
      style={{ background: fundo, color: texto }}
      title={comScore ? `${rotulo} · score ${score}` : rotulo}
    >
      <Icone size={12} strokeWidth={2.75} aria-hidden />
      {rotulo}
      {comScore && <span className="font-semibold opacity-80">· {score}</span>}
    </span>
  );
}
