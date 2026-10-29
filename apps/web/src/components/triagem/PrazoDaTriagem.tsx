"use client";

import { CircleCheck, CircleX, Timer, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Triagem } from "@/types/chamado";
import { useAgora } from "@/hooks/useAgora";
import { descreverTempoAte, formatarDataHora } from "@/utils/date";

export type FaseDoPrazo = "NO_PRAZO" | "METADE" | "ESTOURADO" | "CONCLUIDA" | "CONCLUIDA_COM_ATRASO";

const FRACAO_DE_ALERTA = 0.5;
const MINUTO_MS = 60_000;

const APARENCIA: Record<FaseDoPrazo, { fundo: string; texto: string; borda: string; Icone: LucideIcon; rotulo: string }> = {
  NO_PRAZO: { fundo: "#F0FDF4", texto: "#15803D", borda: "#BBF7D0", Icone: Timer, rotulo: "No prazo" },
  METADE: { fundo: "#FEFCE8", texto: "#A16207", borda: "#FDE68A", Icone: TriangleAlert, rotulo: "Em risco" },
  ESTOURADO: { fundo: "#FEF2F2", texto: "#B91C1C", borda: "#FECACA", Icone: CircleX, rotulo: "Vencido" },
  CONCLUIDA: { fundo: "#F0FDF4", texto: "#15803D", borda: "#BBF7D0", Icone: CircleCheck, rotulo: "Classificado no prazo" },
  CONCLUIDA_COM_ATRASO: { fundo: "#FEF2F2", texto: "#B91C1C", borda: "#FECACA", Icone: CircleCheck, rotulo: "Classificado com atraso" },
};

export function faseDoPrazo(triagem: Triagem, agora: Date): FaseDoPrazo {
  const limite = new Date(triagem.limite).getTime();
  if (triagem.concluidaEm) return new Date(triagem.concluidaEm).getTime() <= limite ? "CONCLUIDA" : "CONCLUIDA_COM_ATRASO";
  const inicio = limite - triagem.prazoMinutos * MINUTO_MS;
  const decorrido = (agora.getTime() - inicio) / (limite - inicio);
  if (decorrido >= 1) return "ESTOURADO";
  if (decorrido >= FRACAO_DE_ALERTA) return "METADE";
  return "NO_PRAZO";
}

export function PrazoDaTriagem({ triagem, compacto = false }: { triagem: Triagem; compacto?: boolean }) {
  const agora = useAgora();
  const fase = faseDoPrazo(triagem, agora);
  const { fundo, texto, borda, Icone, rotulo } = APARENCIA[fase];
  const descricao = triagem.concluidaEm ? `em ${formatarDataHora(triagem.concluidaEm)}` : descreverTempoAte(triagem.limite, agora);

  if (compacto) {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
        style={{ background: fundo, color: texto }}
        title={`${rotulo} · limite ${formatarDataHora(triagem.limite)}`}
        data-fase={fase}
        suppressHydrationWarning
      >
        <Icone size={12} strokeWidth={2.5} aria-hidden />
        {descricao}
      </span>
    );
  }

  return (
    <div className="rounded-xl border p-3" style={{ background: fundo, borderColor: borda, color: texto }} data-fase={fase}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <Icone size={14} strokeWidth={2.5} aria-hidden />
        {rotulo}
      </div>
      <div className="mt-1 font-display text-lg font-bold tabular-nums" suppressHydrationWarning>{descricao}</div>
      <div className="mt-0.5 text-xs opacity-80">
        Limite: {formatarDataHora(triagem.limite)} · {triagem.prazoMinutos} min
      </div>
    </div>
  );
}
