import { ArrowDown, ChevronsUp, CircleCheck, CircleDot, ClipboardList, Equal, Hourglass, ListOrdered, Lock, Pause, Siren, Zap, type LucideIcon } from "lucide-react";
import type { CodigoPrioridade, Status } from "@/types/chamado";
import { ROTULO_PRIORIDADE } from "@/utils/prioridade";
import { cn } from "@/utils/cn";

interface Aparencia {
  fundo: string;
  texto: string;
  Icone: LucideIcon;
}

export const APARENCIA_DO_STATUS: Record<Status, Aparencia> = {
  "Aberto": { fundo: "#FEFCE8", texto: "#A16207", Icone: CircleDot },
  "Em triagem": { fundo: "#FEFCE8", texto: "#A16207", Icone: ClipboardList },
  "Na fila": { fundo: "#ECFEFF", texto: "#0E7490", Icone: ListOrdered },
  "Em atendimento": { fundo: "#EFF6FF", texto: "#1D4ED8", Icone: Zap },
  "Aguardando": { fundo: "#F5F3FF", texto: "#6D28D9", Icone: Pause },
  "Resolvido": { fundo: "#F0FDF4", texto: "#15803D", Icone: CircleCheck },
  "Fechado": { fundo: "#F1F5F9", texto: "#475569", Icone: Lock },
};

export const APARENCIA_DA_PRIORIDADE: Record<CodigoPrioridade, Aparencia> = {
  P1: { fundo: "#FEF2F2", texto: "#B91C1C", Icone: Siren },
  P2: { fundo: "#FFF7ED", texto: "#C2410C", Icone: ChevronsUp },
  P3: { fundo: "#FEFCE8", texto: "#A16207", Icone: Equal },
  P4: { fundo: "#EFF6FF", texto: "#1E40AF", Icone: ArrowDown },
};

export function StatusBadge({ status }: { status: Status }) {
  const { fundo, texto, Icone } = APARENCIA_DO_STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: fundo, color: texto }}>
      <Icone size={12} strokeWidth={2.5} aria-hidden />
      {status}
    </span>
  );
}

export const ROTULO_SEM_TRIAGEM = "Aguardando classificação";

export function PrioridadeIndicador({ prioridade, score, className }: { prioridade: CodigoPrioridade | null; score?: number | null; className?: string }) {
  if (prioridade === null) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600", className)}>
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
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", className)}
      style={{ background: fundo, color: texto }}
      title={comScore ? `${rotulo} · score ${score}` : rotulo}
    >
      <Icone size={12} strokeWidth={2.75} aria-hidden />
      {rotulo}
      {comScore && <span className="font-semibold opacity-80">· {score}</span>}
    </span>
  );
}
