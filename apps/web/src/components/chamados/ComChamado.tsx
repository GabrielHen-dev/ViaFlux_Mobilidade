"use client";

import type { ReactNode } from "react";
import type { Chamado } from "@/types/chamado";
import { ErroApi } from "@/services/api/cliente";
import { useChamado } from "@/hooks/consultas";
import ChamadoIndisponivel from "@/components/feedback/ChamadoIndisponivel";
import { Carregando, FalhaAoCarregar } from "@/components/feedback/EstadoDaConsulta";

export default function ComChamado({ id, children }: { id: string; children: (chamado: Chamado) => ReactNode }) {
  const consulta = useChamado(id);
  if (consulta.isPending) return <main id="conteudo" className="p-4 md:p-8"><Carregando texto={`Carregando chamado ${id}…`} /></main>;
  if (consulta.isError) {
    if (consulta.error instanceof ErroApi && consulta.error.status === 404) return <ChamadoIndisponivel id={id} />;
    return <main id="conteudo" className="p-4 md:p-8"><FalhaAoCarregar erro={consulta.error} aoTentarDeNovo={() => void consulta.refetch()} /></main>;
  }
  return children(consulta.data);
}
