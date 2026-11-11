import type { Metadata } from "next";
import { Suspense } from "react";
import PerfilRequerido from "@/components/auth/PerfilRequerido";
import Dashboard from "@/components/chamados/Dashboard";
import { Carregando } from "@/components/feedback/EstadoDaConsulta";
import { PERFIS_DE_TRIAGEM } from "@/utils/perfis";

export const metadata: Metadata = { title: "Classificação" };

export default function Page() {
  return (
    <PerfilRequerido perfis={PERFIS_DE_TRIAGEM}>
      <Suspense fallback={<main id="conteudo"><Carregando texto="Carregando…" /></main>}>
        <Dashboard visaoInicial="analise" />
      </Suspense>
    </PerfilRequerido>
  );
}
