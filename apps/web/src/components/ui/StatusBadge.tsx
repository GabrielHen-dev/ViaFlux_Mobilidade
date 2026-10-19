import { ArrowDown, ChevronsUp, CircleCheck, CircleDot, ClipboardList, Equal, Lock, Pause, Siren, Zap, type LucideIcon } from "lucide-react";
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
  "Em atendimento": { fundo: "#EFF6FF", texto: "#1D4ED8", Icone: Zap },
  "Aguardando": { fundo: "#F5F3FF", texto: "#6D28D9", Icone: Pause },
  "Resolvido": { fundo: "#F0FDF4", texto: "#15803D", Icone: CircleCheck },
  "Fechado": { fundo: "#F1F5F9", texto: "#475569", Icone: Lock },
};

export const APARENCIA_DA_PRIORIDADE: Record<CodigoPrioridade, Aparencia> = {
  P1: { fundo: "#FEF2F2", texto: "#B91C1C", Icone: Siren },
  P2: { fundo: "#FFF7ED", texto: "#C2410C", Icone: ChevronsUp },
  P3: { fundo: "#FEFCE8", texto: "#A16207", Icone: Equal },
  P4: { fundo: "#F1F5F9", texto: "#475569", Icone: ArrowDown },
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

export function PrioridadeIndicador({ prioridade, score, className }: { prioridade: CodigoPrioridade; score?: number; className?: string }) {
  const { fundo, texto, Icone } = APARENCIA_DA_PRIORIDADE[prioridade];
  const rotulo = `${prioridade} · ${ROTULO_PRIORIDADE[prioridade]}`;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", className)}
      style={{ background: fundo, color: texto }}
      title={score === undefined ? rotulo : `${rotulo} · score ${score}`}
    >
      <Icone size={12} strokeWidth={2.75} aria-hidden />
      {rotulo}
      {score !== undefined && <span className="font-semibold opacity-80">· {score}</span>}
    </span>
  );
}
