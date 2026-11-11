"use client";

import { useRouter } from "next/navigation";
import type { ChamadoResumo, CodigoPrioridade } from "@/types/chamado";
import Mapa, { type PontoNoMapa } from "@/components/mapa/Mapa";
import { ROTULO_PRIORIDADE } from "@/utils/prioridade";

const COR_DA_PRIORIDADE: Record<CodigoPrioridade, string> = { P1: "#B91C1C", P2: "#C2410C", P3: "#A16207", P4: "#1E40AF" };
const COR_SEM_PRIORIDADE = "#6B7280";
const CASAS_DO_AGRUPAMENTO = 3;
const ORDEM: (CodigoPrioridade | null)[] = ["P1", "P2", "P3", "P4", null];

type ComCoordenadas = ChamadoResumo & { latitude: number; longitude: number };

function temCoordenadas(chamado: ChamadoResumo): chamado is ComCoordenadas {
  return typeof chamado.latitude === "number" && typeof chamado.longitude === "number";
}

function maisUrgente(chamados: ChamadoResumo[]) {
  return [...chamados].sort((a, b) => ORDEM.indexOf(a.prioridade) - ORDEM.indexOf(b.prioridade))[0];
}

export default function MapaDeOcorrencias({ chamados }: { chamados: ChamadoResumo[] }) {
  const router = useRouter();
  const localizados = chamados.filter(temCoordenadas);
  const semLocal = chamados.length - localizados.length;

  const grupos = new Map<string, ComCoordenadas[]>();
  for (const chamado of localizados) {
    const chave = `${chamado.latitude.toFixed(CASAS_DO_AGRUPAMENTO)}:${chamado.longitude.toFixed(CASAS_DO_AGRUPAMENTO)}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), chamado]);
  }
  const pontos: PontoNoMapa[] = [...grupos.entries()].map(([chave, itens]) => {
    const principal = maisUrgente(itens);
    return {
      id: chave,
      latitude: itens.reduce((soma, item) => soma + item.latitude, 0) / itens.length,
      longitude: itens.reduce((soma, item) => soma + item.longitude, 0) / itens.length,
      cor: principal.prioridade ? COR_DA_PRIORIDADE[principal.prioridade] : COR_SEM_PRIORIDADE,
      quantidade: itens.length,
      rotulo: itens.map((item) => `#${item.id} · ${item.cliente}`).join("\n"),
      aoClicar: () => router.push(`/chamados/${principal.id}`),
    };
  });

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tinta-suave">
        {(["P1", "P2", "P3", "P4"] as const).map((codigo) => (
          <span key={codigo} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_DA_PRIORIDADE[codigo] }} aria-hidden />
            {codigo} · {ROTULO_PRIORIDADE[codigo]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_SEM_PRIORIDADE }} aria-hidden /> Sem prioridade
        </span>
        {semLocal > 0 && <span className="ml-auto text-tinta-apagada">{semLocal} chamado{semLocal !== 1 ? "s" : ""} sem localização</span>}
      </div>
      {pontos.length === 0 ? (
        <p className="rounded border border-dashed border-linha-forte bg-fundo p-10 text-center text-sm text-tinta-suave">Nenhum chamado com localização registrada nesta visualização.</p>
      ) : (
        <Mapa latitude={pontos[0].latitude} longitude={pontos[0].longitude} zoom={11} altura={520} pontos={pontos} rotulo="Mapa de ocorrências" />
      )}
    </div>
  );
}
