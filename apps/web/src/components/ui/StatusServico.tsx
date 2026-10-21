import { CircleCheckBig, Clock, Inbox, Wrench, type LucideIcon } from "lucide-react";
import type { StatusServico } from "@/types/chamado";

export const APARENCIA_DO_STATUS_DO_SERVICO: Record<StatusServico, { rotulo: string; fundo: string; texto: string; Icone: LucideIcon }> = {
  SOLICITADO: { rotulo: "Solicitado", fundo: "#FEFCE8", texto: "#A16207", Icone: Clock },
  RECEBIDO: { rotulo: "Recebido", fundo: "#EFF6FF", texto: "#1D4ED8", Icone: Inbox },
  EM_EXECUCAO: { rotulo: "Em execução", fundo: "#EFF6FF", texto: "#1D4ED8", Icone: Wrench },
  CONCLUIDO: { rotulo: "Concluído", fundo: "#F0FDF4", texto: "#15803D", Icone: CircleCheckBig },
};

export function StatusServicoBadge({ status }: { status: StatusServico }) {
  const { rotulo, fundo, texto, Icone } = APARENCIA_DO_STATUS_DO_SERVICO[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: fundo, color: texto }}>
      <Icone size={12} strokeWidth={2.5} aria-hidden />
      Serviço: {rotulo}
    </span>
  );
}
