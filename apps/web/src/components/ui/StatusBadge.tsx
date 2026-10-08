import type { Status, Prioridade } from "@/types/chamado";
const statusColors: Record<Status, { bg: string; text: string; dot: string }> = {
  "Aberto": { bg: "#EFF6FF", text: "#2563EB", dot: "#2563EB" },
  "Em triagem": { bg: "#FFF7ED", text: "#EA580C", dot: "#EA580C" },
  "Em atendimento": { bg: "#ECFDF5", text: "#059669", dot: "#10B981" },
  "Aguardando": { bg: "#F5F3FF", text: "#7C3AED", dot: "#7C3AED" },
  "Resolvido": { bg: "#F0FDF4", text: "#16A34A", dot: "#16A34A" },
  "Encerrado": { bg: "#F8FAFC", text: "#64748B", dot: "#94A3B8" },
};

const prioridadeColors: Record<Prioridade, { bg: string; text: string }> = {
  "Crítica": { bg: "#FEF2F2", text: "#DC2626" },
  "Alta": { bg: "#FFF7ED", text: "#EA580C" },
  "Média": { bg: "#FEFCE8", text: "#CA8A04" },
  "Baixa": { bg: "#F0FDF4", text: "#16A34A" },
};

export function StatusBadge({ status }: { status: Status }) {
  const c = statusColors[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  );
}

export function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  const c = prioridadeColors[prioridade];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
      style={{ background: c.bg, color: c.text }}
    >
      {prioridade}
    </span>
  );
}
